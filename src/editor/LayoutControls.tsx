import { useState } from 'react'
import { Minimize2, RotateCcw } from 'lucide-react'
import { findDensityForPages } from '../cv/fitToPages'
import {
  DENSITY_RANGE,
  type LayoutOverrides,
  SIDEBAR_RANGE,
} from '../cv/templates/layout'
import type { Template } from '../cv/templates/types'
import type { CVData } from '../cv/types'

type LayoutControlsProps = {
  data: CVData
  /** The template before the document's own overrides are applied. */
  baseTemplate: Template
  layout: LayoutOverrides | undefined
  onChange: (layout: LayoutOverrides | undefined) => void
}

const sliderClass =
  'h-1 w-full cursor-pointer appearance-none rounded-full bg-rule accent-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/20'

export function LayoutControls({
  data,
  baseTemplate,
  layout,
  onChange,
}: LayoutControlsProps) {
  const [status, setStatus] = useState('')

  const density = layout?.density ?? 1
  const sidebarWidth = layout?.sidebarWidth ?? baseTemplate.page.sidebarWidth
  const hasSidebar = baseTemplate.page.sidebar !== 'none'
  const isDefault = !layout || (density === 1 && !layout.sidebarWidth)

  const fitTo = (targetPages: number) => {
    const result = findDensityForPages(data, baseTemplate, targetPages, layout)

    // Shrinking to the minimum without reaching the goal just makes the CV
    // harder to read, so a failed fit leaves the layout as it was.
    if (result.fits) {
      onChange({ ...layout, density: result.density })
      setStatus(
        `Fitted to ${result.pageCount} at ${Math.round(result.density * 100)}%`,
      )
    } else {
      setStatus(
        `Still ${result.pageCount} pages at the smallest size. Cut some content, or try a denser template.`,
      )
    }
    window.setTimeout(() => setStatus(''), 3200)
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 flex items-baseline justify-between text-[11px] font-medium text-muted">
          Density
          <span className="tabular-nums">{Math.round(density * 100)}%</span>
        </span>
        <input
          className={sliderClass}
          max={DENSITY_RANGE.max}
          min={DENSITY_RANGE.min}
          onChange={(event) =>
            onChange({ ...layout, density: Number(event.target.value) })
          }
          step={0.01}
          type="range"
          value={density}
        />
        <span className="mt-1 block text-[11px] text-neutral-400">
          Scales every type size and gap in the template.
        </span>
      </label>

      {hasSidebar ? (
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between text-[11px] font-medium text-muted">
            Side column width
            <span className="tabular-nums">{Math.round(sidebarWidth)}px</span>
          </span>
          <input
            className={sliderClass}
            max={SIDEBAR_RANGE.max}
            min={SIDEBAR_RANGE.min}
            onChange={(event) =>
              onChange({ ...layout, sidebarWidth: Number(event.target.value) })
            }
            step={2}
            type="range"
            value={sidebarWidth}
          />
        </label>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-rule px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ink/20"
          onClick={() => fitTo(1)}
          type="button"
        >
          <Minimize2 className="h-3 w-3" />
          Fit to 1 page
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg border border-rule px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ink/20"
          onClick={() => fitTo(2)}
          type="button"
        >
          <Minimize2 className="h-3 w-3" />
          Fit to 2
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-muted outline-none transition hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-40"
          disabled={isDefault}
          onClick={() => {
            onChange(undefined)
            setStatus('')
          }}
          type="button"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
      </div>

      {status ? (
        <p className="text-[11px] text-muted">{status}</p>
      ) : null}
    </div>
  )
}
