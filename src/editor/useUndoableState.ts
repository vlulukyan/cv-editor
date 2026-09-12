import { useCallback, useMemo, useReducer } from 'react'

const HISTORY_LIMIT = 100

/**
 * Edits made in quick succession collapse into one history entry, so undo
 * steps back by a word or a field rather than by a keystroke.
 */
const COALESCE_MS = 600

type History<T> = {
  past: T[]
  present: T
  future: T[]
  /** When the last history entry was opened, for coalescing. */
  lastPushAt: number
}

type Action<T> =
  | { type: 'set'; value: T | ((previous: T) => T); at: number }
  | { type: 'reset'; value: T }
  | { type: 'undo' }
  | { type: 'redo' }

/**
 * Kept pure: React may run a reducer more than once for the same action, so
 * history must never be advanced as a side effect.
 */
function reduce<T>(state: History<T>, action: Action<T>): History<T> {
  switch (action.type) {
    case 'set': {
      const next =
        typeof action.value === 'function'
          ? (action.value as (previous: T) => T)(state.present)
          : action.value

      if (next === state.present) return state

      const shouldPush = action.at - state.lastPushAt > COALESCE_MS

      return {
        past: shouldPush
          ? [...state.past, state.present].slice(-HISTORY_LIMIT)
          : state.past,
        present: next,
        future: [],
        lastPushAt: shouldPush ? action.at : state.lastPushAt,
      }
    }

    case 'reset':
      return { past: [], present: action.value, future: [], lastPushAt: 0 }

    case 'undo': {
      const entry = state.past.at(-1)

      if (entry === undefined) return state

      return {
        past: state.past.slice(0, -1),
        present: entry,
        future: [...state.future, state.present],
        lastPushAt: 0,
      }
    }

    case 'redo': {
      const entry = state.future.at(-1)

      if (entry === undefined) return state

      return {
        past: [...state.past, state.present],
        present: entry,
        future: state.future.slice(0, -1),
        lastPushAt: 0,
      }
    }
  }
}

export type UndoableState<T> = {
  value: T
  setValue: (update: T | ((previous: T) => T)) => void
  /** Replaces the value and clears history - for loading another document. */
  reset: (next: T) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
}

export function useUndoableState<T>(initial: T): UndoableState<T> {
  const [state, dispatch] = useReducer(
    reduce<T>,
    { past: [], present: initial, future: [], lastPushAt: 0 } as History<T>,
  )

  const setValue = useCallback((update: T | ((previous: T) => T)) => {
    dispatch({ type: 'set', value: update, at: Date.now() })
  }, [])

  const reset = useCallback((next: T) => {
    dispatch({ type: 'reset', value: next })
  }, [])

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])

  return useMemo(
    () => ({
      value: state.present,
      setValue,
      reset,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, setValue, reset, undo, redo],
  )
}
