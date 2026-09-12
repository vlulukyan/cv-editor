import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  FilePlus2,
  Pencil,
  Trash2,
  Upload,
} from 'lucide-react'
import type { DocumentIndex } from '../cv/storage'

type DocumentMenuProps = {
  index: DocumentIndex
  onSwitch: (id: string) => void
  onCreate: () => void
  onDuplicate: () => void
  onRename: (name: string) => void
  onDelete: () => void
  onExport: () => void
  onImport: (file: File) => void
}

const actionClass =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-neutral-700 outline-none transition hover:bg-neutral-100 focus-visible:bg-neutral-100'

export function DocumentMenu({
  index,
  onSwitch,
  onCreate,
  onDuplicate,
  onRename,
  onDelete,
  onExport,
  onImport,
}: DocumentMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const active = index.documents.find((entry) => entry.id === index.activeId)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setRenaming(null)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setRenaming(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const close = () => {
    setIsOpen(false)
    setRenaming(null)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex max-w-[220px] items-center gap-1.5 rounded-md px-1.5 py-1 text-[14px] font-semibold text-white outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => setIsOpen((previous) => !previous)}
        type="button"
      >
        <span className="truncate">{active?.name ?? 'CV'}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/50" />
      </button>

      {isOpen ? (
        <div
          // The menu hangs inside the ink header, so it resets the inherited
          // white text rather than relying on every child to set its own.
          className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-rule bg-white p-1.5 text-neutral-900 shadow-xl"
          role="menu"
        >
          <div className="max-h-56 overflow-y-auto">
            {index.documents.map((entry) =>
              renaming === entry.id ? (
                <form
                  key={entry.id}
                  onSubmit={(event) => {
                    event.preventDefault()
                    const input = new FormData(event.currentTarget).get('name')
                    onRename(String(input ?? '').trim() || entry.name)
                    close()
                  }}
                >
                  <input
                    autoFocus
                    className="w-full rounded-md border border-ink bg-white px-2 py-1.5 text-[12px] text-neutral-900 outline-none"
                    defaultValue={entry.name}
                    name="name"
                  />
                </form>
              ) : (
                <button
                  className={`${actionClass} ${
                    entry.id === index.activeId ? 'font-medium' : ''
                  }`}
                  key={entry.id}
                  onClick={() => {
                    onSwitch(entry.id)
                    close()
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      entry.id === index.activeId
                        ? 'text-neutral-900'
                        : 'text-transparent'
                    }`}
                  />
                  <span className="truncate">{entry.name}</span>
                </button>
              ),
            )}
          </div>

          <div className="my-1 h-px bg-rule" />

          <button
            className={actionClass}
            onClick={() => setRenaming(index.activeId)}
            role="menuitem"
            type="button"
          >
            <Pencil className="h-3.5 w-3.5 text-muted" />
            Rename
          </button>
          <button
            className={actionClass}
            onClick={() => {
              onDuplicate()
              close()
            }}
            role="menuitem"
            type="button"
          >
            <Copy className="h-3.5 w-3.5 text-muted" />
            Duplicate
          </button>
          <button
            className={actionClass}
            onClick={() => {
              onCreate()
              close()
            }}
            role="menuitem"
            type="button"
          >
            <FilePlus2 className="h-3.5 w-3.5 text-muted" />
            New CV
          </button>

          <div className="my-1 h-px bg-rule" />

          <button
            className={actionClass}
            onClick={() => {
              onExport()
              close()
            }}
            role="menuitem"
            type="button"
          >
            <Download className="h-3.5 w-3.5 text-muted" />
            Download as JSON
          </button>
          <button
            className={actionClass}
            onClick={() => fileRef.current?.click()}
            role="menuitem"
            type="button"
          >
            <Upload className="h-3.5 w-3.5 text-muted" />
            Import from JSON
          </button>
          <input
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]

              if (file) onImport(file)
              event.target.value = ''
              close()
            }}
            ref={fileRef}
            type="file"
          />

          {index.documents.length > 1 ? (
            <>
              <div className="my-1 h-px bg-rule" />
              <button
                className={`${actionClass} text-danger hover:bg-danger/5`}
                onClick={() => {
                  onDelete()
                  close()
                }}
                role="menuitem"
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete this CV
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
