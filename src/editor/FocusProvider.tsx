import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { FocusContext, type FocusTarget } from './focusContext'

/**
 * Carries "reveal this part of the CV" requests from the preview down to the
 * editor rows. The nonce lets the same target be requested twice in a row.
 */
export function FocusProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<FocusTarget>(null)

  const requestFocus = useCallback((key: string) => {
    setTarget({ key, nonce: Date.now() })
  }, [])

  const value = useMemo(() => ({ target, requestFocus }), [target, requestFocus])

  return <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
}
