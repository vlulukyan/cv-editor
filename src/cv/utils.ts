import type { MouseEvent } from 'react'

export function normalizeUrl(url: string) {
  const trimmedUrl = url.trim()

  if (!trimmedUrl) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)) return trimmedUrl

  return `https://${trimmedUrl}`
}

export function openInBlankPage(
  event: MouseEvent<HTMLAnchorElement>,
  url: string,
) {
  event.preventDefault()
  window.open(normalizeUrl(url), '_blank', 'noopener,noreferrer')
}

export function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (toIndex < 0 || toIndex >= items.length) return items

  const nextItems = [...items]
  const [item] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, item)

  return nextItems
}
