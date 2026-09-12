import { Maximize2, Minus, Plus } from 'lucide-react'
import { MAX_ZOOM, MIN_ZOOM, stepZoom } from './zoom'

type PreviewToolbarProps = {
  zoom: number
  pageCount: number
  onZoomChange: (zoom: number) => void
  onFit: () => void
}

const buttonClass =
  'flex h-7 w-7 items-center justify-center rounded-md text-muted outline-none transition hover:bg-neutral-200/70 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-ink/20 disabled:opacity-30 disabled:hover:bg-transparent'

export function PreviewToolbar({
  zoom,
  pageCount,
  onZoomChange,
  onFit,
}: PreviewToolbarProps) {
  return (
    <div className="print-hide sticky top-0 z-20 mb-4 flex items-center justify-center gap-3">
      <div className="flex items-center gap-1 rounded-xl border border-rule bg-white/90 px-1.5 py-1 shadow-sm backdrop-blur">
        <button
          aria-label="Zoom out"
          className={buttonClass}
          disabled={zoom <= MIN_ZOOM}
          onClick={() => onZoomChange(stepZoom(zoom, -1))}
          type="button"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button
          className="min-w-[52px] rounded-md px-1 py-1 text-[12px] tabular-nums text-neutral-700 outline-none transition hover:bg-neutral-200/70 focus-visible:ring-2 focus-visible:ring-ink/20"
          onClick={() => onZoomChange(1)}
          title="Reset to 100%"
          type="button"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          aria-label="Zoom in"
          className={buttonClass}
          disabled={zoom >= MAX_ZOOM}
          onClick={() => onZoomChange(stepZoom(zoom, 1))}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <span className="mx-0.5 h-4 w-px bg-rule" />
        <button
          aria-label="Fit page to width"
          className={buttonClass}
          onClick={onFit}
          title="Fit to width"
          type="button"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <span className="text-[12px] tabular-nums text-muted">
        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
      </span>
    </div>
  )
}
