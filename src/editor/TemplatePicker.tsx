import { useEffect, useRef, useState } from 'react'
import { Check, LayoutTemplate } from 'lucide-react'
import { CVDocument } from '../cv/render/Preview'
import { PAGE_HEIGHT, PAGE_WIDTH, type Template } from '../cv/templates/types'
import { templates } from '../cv/templates/presets'
import type { CVData } from '../cv/types'

const THUMB_SCALE = 0.17
const THUMB_WIDTH = Math.round(PAGE_WIDTH * THUMB_SCALE)
const THUMB_HEIGHT = Math.round(PAGE_HEIGHT * THUMB_SCALE)

/**
 * Thumbnails render the real template with the user's own content, so what
 * you pick is exactly what you get. Only the first page is drawn, and from a
 * trimmed copy of the CV, to keep opening the picker cheap.
 */
function previewData(data: CVData): CVData {
  return {
    ...data,
    profile: data.profile.slice(0, 260),
    experience: data.experience.slice(0, 3).map((job) => ({
      ...job,
      bullets: job.bullets.slice(0, 3),
    })),
    education: data.education.slice(0, 2),
    courses: data.courses.slice(0, 1),
    certifications: data.certifications.slice(0, 1),
    projects: data.projects.slice(0, 1).map((project) => ({
      ...project,
      bullets: project.bullets.slice(0, 2),
    })),
    skills: data.skills.slice(0, 5),
  }
}

function Thumbnail({ data, template }: { data: CVData; template: Template }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded border border-rule bg-white"
      style={{ width: THUMB_WIDTH, height: THUMB_HEIGHT }}
    >
      <div
        style={{
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          transform: `scale(${THUMB_SCALE})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      >
        <div className="cv-thumb">
          <CVDocument data={data} template={template} />
        </div>
      </div>
    </div>
  )
}

type TemplatePickerProps = {
  data: CVData
  templateId: string
  onChange: (templateId: string) => void
}

export function TemplatePicker({
  data,
  templateId,
  onChange,
}: TemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const active = templates.find((entry) => entry.id === templateId)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const trimmed = previewData(data)

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-[12px] text-white/85 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={() => setIsOpen((previous) => !previous)}
        type="button"
      >
        <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-white/50" />
        <span className="truncate">{active?.name ?? 'Template'}</span>
        <span className="ml-auto shrink-0 text-white/40">Change</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-40 mt-2 w-[560px] max-w-[80vw] rounded-xl border border-rule bg-white p-3 text-neutral-900 shadow-2xl">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold">Templates</h3>
            <span className="text-[11px] text-muted">
              Your own content, {templates.length} layouts
            </span>
          </div>
          <div className="grid max-h-[440px] grid-cols-3 gap-2.5 overflow-y-auto">
            {templates.map((template) => {
              const isActive = template.id === templateId

              return (
                <button
                  aria-pressed={isActive}
                  className={`group flex flex-col items-center gap-1.5 rounded-lg border p-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ink/20 ${
                    isActive
                      ? 'border-ink bg-ink/[0.04]'
                      : 'border-transparent hover:border-rule hover:bg-neutral-50'
                  }`}
                  key={template.id}
                  onClick={() => {
                    onChange(template.id)
                    setIsOpen(false)
                  }}
                  title={template.description}
                  type="button"
                >
                  <Thumbnail data={trimmed} template={template} />
                  <span className="flex w-full items-center gap-1">
                    <span className="truncate text-[11px] font-medium">
                      {template.name}
                    </span>
                    {isActive ? (
                      <Check className="ml-auto h-3 w-3 shrink-0" />
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
