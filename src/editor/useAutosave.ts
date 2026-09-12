import { useCallback, useEffect, useRef, useState } from 'react'

const AUTOSAVE_DELAY_MS = 700

export type SaveState = 'saved' | 'pending' | 'saving'

type AutosaveOptions<T> = {
  value: T
  onSave: (value: T) => void
  /** Changing this key starts a clean slate rather than saving across it. */
  key: string
}

/**
 * Writes changes after a short pause in typing, and never leaves an edit
 * unwritten: a pending change is flushed when the tab is hidden or closed.
 */
export function useAutosave<T>({ value, onSave, key }: AutosaveOptions<T>) {
  const [state, setState] = useState<SaveState>('saved')

  const valueRef = useRef(value)
  const saveRef = useRef(onSave)
  const keyRef = useRef(key)
  const timerRef = useRef<number | undefined>(undefined)
  const isDirty = useRef(false)
  const isFirstRun = useRef(true)

  // Kept in an effect so nothing is written during render.
  useEffect(() => {
    valueRef.current = value
    saveRef.current = onSave
  })

  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current)

    if (!isDirty.current) return

    isDirty.current = false
    setState('saving')
    saveRef.current(valueRef.current)
    setState('saved')
  }, [])

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }

    // Switching documents is not an edit of the new one.
    if (keyRef.current !== key) {
      keyRef.current = key
      isDirty.current = false
      window.clearTimeout(timerRef.current)
      setState('saved')
      return
    }

    isDirty.current = true
    setState('pending')
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(flush, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timerRef.current)
  }, [value, key, flush])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flush])

  return { state, flush }
}
