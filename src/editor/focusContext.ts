import { createContext, useContext } from 'react'

export type FocusTarget = { key: string; nonce: number } | null

export type FocusContextValue = {
  target: FocusTarget
  requestFocus: (key: string) => void
}

export const FocusContext = createContext<FocusContextValue>({
  target: null,
  requestFocus: () => {},
})

export function useFocus() {
  return useContext(FocusContext)
}

/**
 * Maps a preview block key onto the editor row that owns it. The preview and
 * the editor name a few things differently, and headings belong to a section
 * rather than to any one entry.
 */
export function editorKeyForBlock(blockKey: string) {
  if (blockKey.startsWith('profile')) return 'profile'
  if (blockKey === 'info') return 'personal'
  if (blockKey === 'skills-heading') return 'skills'
  if (blockKey.startsWith('skill-')) {
    return `skills-${blockKey.slice('skill-'.length)}`
  }
  if (blockKey === 'hobbies' || blockKey === 'languages') {
    return 'languages-and-hobbies'
  }
  if (blockKey === 'links') return 'links'

  // experience-2, education-0, courses-0, certifications-1, projects-0 and
  // their headings already use the editor's own naming.
  return blockKey.replace(/-heading$/, '')
}
