import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  DndContext,
  type DraggableAttributes,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, GripVertical, Trash2 } from 'lucide-react'
import { useFocus } from './focusContext'

type SortableListProps = {
  ids: string[]
  onReorder: (fromIndex: number, toIndex: number) => void
  children: ReactNode
}

/**
 * A vertical sortable list. The aligned column of handles is the only chrome
 * reordering needs; rows share edges instead of each being its own card.
 */
export function SortableList({ ids, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return

    const fromIndex = ids.indexOf(String(active.id))
    const toIndex = ids.indexOf(String(over.id))

    if (fromIndex === -1 || toIndex === -1) return

    onReorder(fromIndex, toIndex)
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div>{children}</div>
      </SortableContext>
    </DndContext>
  )
}

function DragHandle({
  label,
  attributes,
  listeners,
}: {
  label: string
  attributes: DraggableAttributes
  listeners: SyntheticListenerMap | undefined
}) {
  return (
    <button
      aria-label={`Reorder ${label}`}
      className="mt-1 shrink-0 cursor-grab touch-none rounded bg-white py-1 text-neutral-300 outline-none transition hover:text-muted focus-visible:ring-2 focus-visible:ring-ink/20 active:cursor-grabbing"
      type="button"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )
}

type SortableItemProps = {
  id: string
  title: string
  meta?: string
  onRemove: () => void
  children: ReactNode
  /** Number of writing issues in this entry, surfaced while it is collapsed. */
  issueCount?: number
}

/**
 * One entry in a CV section: a single draggable line that opens into its
 * fields. Collapsed by default so a whole section is visible while dragging.
 */
export function SortableItem({
  id,
  title,
  meta,
  onRemove,
  children,
  issueCount = 0,
}: SortableItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })
  const { target } = useFocus()
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [focusedNonce, setFocusedNonce] = useState(0)
  const [settledNonce, setSettledNonce] = useState(0)

  // Adjusted while rendering so the row is already open when it scrolls in.
  if (target && target.key === id && target.nonce !== focusedNonce) {
    setFocusedNonce(target.nonce)
    setIsOpen(true)
  }

  const isHighlighted = focusedNonce !== 0 && focusedNonce !== settledNonce

  useEffect(() => {
    if (!isHighlighted) return

    rowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })

    const timer = window.setTimeout(() => setSettledNonce(focusedNonce), 1400)

    return () => window.clearTimeout(timer)
  }, [isHighlighted, focusedNonce])

  return (
    <div
      className={`relative rounded-lg transition-shadow ${
        isDragging ? 'z-10 bg-white shadow-lg ring-1 ring-ink/10' : ''
      } ${isHighlighted ? 'bg-ink/[0.06]' : 'bg-white'}`}
      ref={(node) => {
        setNodeRef(node)
        rowRef.current = node
      }}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-start gap-1.5">
        <DragHandle
          attributes={attributes}
          label={title}
          listeners={listeners}
        />
        <button
          aria-expanded={isOpen}
          className="flex min-w-0 flex-1 items-center gap-2 rounded py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
          onClick={() => setIsOpen((previous) => !previous)}
          type="button"
        >
          <span className="truncate text-[13px] text-neutral-900">{title}</span>
          {meta ? (
            <span className="shrink-0 text-[11px] text-muted">{meta}</span>
          ) : null}
          {issueCount && !isOpen ? (
            <span
              className="shrink-0 rounded-full bg-advice/10 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-advice"
              title={`${issueCount} writing ${issueCount === 1 ? 'suggestion' : 'suggestions'}`}
            >
              {issueCount}
            </span>
          ) : null}
          <ChevronDown
            className={`ml-auto h-3 w-3 shrink-0 text-neutral-300 transition-transform ${
              isOpen ? '' : '-rotate-90'
            }`}
          />
        </button>
        <button
          aria-label={`Remove ${title}`}
          className="mt-1 shrink-0 rounded p-1 text-neutral-300 outline-none transition hover:bg-danger/5 hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/30"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {isOpen ? (
        <div className="mb-3 ml-[7px] mt-1 space-y-2.5 border-l border-rule py-1 pl-3.5 pr-1">
          {children}
        </div>
      ) : null}
    </div>
  )
}

type SortableRowProps = {
  id: string
  label: string
  onRemove: () => void
  children: ReactNode
}

/** A draggable row with no disclosure - used for bullets and links. */
export function SortableRow({
  id,
  label,
  onRemove,
  children,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <div
      className={`relative rounded-lg bg-white transition-shadow ${
        isDragging ? 'z-10 shadow-lg ring-1 ring-ink/10' : ''
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-start gap-1.5">
        <DragHandle
          attributes={attributes}
          label={label}
          listeners={listeners}
        />
        <div className="min-w-0 flex-1">{children}</div>
        <button
          aria-label={`Remove ${label}`}
          className="mt-1 shrink-0 rounded p-1 text-neutral-300 outline-none transition hover:bg-danger/5 hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/30"
          onClick={onRemove}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
