import { type ReactNode, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import { useFocus } from './focusContext'

type SectionProps = {
  /** Stable key the preview uses to reveal this section. */
  name: string
  title: string
  /** Shown beside the title so the panel reads as an outline of the CV. */
  count?: number
  onAdd?: () => void
  children: ReactNode
  defaultOpen?: boolean
}

export function Section({
  name,
  title,
  count,
  onAdd,
  children,
  defaultOpen = true,
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [seenNonce, setSeenNonce] = useState(0)
  const { target } = useFocus()

  // Adjusting state while rendering, rather than in an effect, so the section
  // is already open on the frame the preview asks for it.
  if (
    target &&
    target.nonce !== seenNonce &&
    (target.key === name || target.key.startsWith(`${name}-`))
  ) {
    setSeenNonce(target.nonce)
    setIsOpen(true)
  }

  return (
    <section className="border-b border-rule" data-editor-section={name}>
      <div className="flex items-center gap-1 px-4">
        <button
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-2 rounded py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          onClick={() => setIsOpen((previous) => !previous)}
          type="button"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform ${
              isOpen ? '' : '-rotate-90'
            }`}
          />
          <span className="truncate text-[13px] font-semibold text-neutral-900">
            {title}
          </span>
          {count !== undefined ? (
            <span className="shrink-0 text-[12px] tabular-nums text-muted">
              {count}
            </span>
          ) : null}
        </button>
        {onAdd ? (
          <button
            className="shrink-0 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted outline-none transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ink/20"
            onClick={() => {
              setIsOpen(true)
              onAdd()
            }}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              Add
            </span>
          </button>
        ) : null}
      </div>
      {isOpen ? <div className="px-4 pb-4">{children}</div> : null}
    </section>
  )
}

/** Placeholder for a section with nothing in it yet - an invitation to act. */
export function EmptySection({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-rule px-3 py-4 text-center text-[12px] text-muted">
      {children}
    </p>
  )
}
