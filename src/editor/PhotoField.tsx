import { useRef, useState } from 'react'
import { Trash2, Upload } from 'lucide-react'

/** Portraits are stored in localStorage, so they are cropped and shrunk first. */
const MAX_SIZE = 320

function toSquareDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('unreadable'))
    reader.onload = () => {
      const image = new Image()

      image.onerror = () => reject(new Error('undecodable'))
      image.onload = () => {
        const crop = Math.min(image.width, image.height)
        const canvas = document.createElement('canvas')

        canvas.width = MAX_SIZE
        canvas.height = MAX_SIZE

        const context = canvas.getContext('2d')

        if (!context) {
          reject(new Error('no canvas'))
          return
        }

        context.drawImage(
          image,
          (image.width - crop) / 2,
          (image.height - crop) / 2,
          crop,
          crop,
          0,
          0,
          MAX_SIZE,
          MAX_SIZE,
        )

        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }

      image.src = String(reader.result)
    }

    reader.readAsDataURL(file)
  })
}

type PhotoFieldProps = {
  photo?: string
  usedByTemplate: boolean
  onChange: (photo: string | undefined) => void
}

export function PhotoField({ photo, usedByTemplate, onChange }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [error, setError] = useState('')

  return (
    <div>
      <span className="mb-1 block text-[11px] font-medium text-muted">
        Photo
      </span>
      <div className="flex items-center gap-3">
        {photo ? (
          <img
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-rule object-cover"
            src={photo}
          />
        ) : (
          <div className="h-12 w-12 shrink-0 rounded-full border border-dashed border-rule" />
        )}
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-rule px-2.5 py-1.5 text-[12px] text-neutral-700 outline-none transition hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-ink/20"
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            <Upload className="h-3 w-3" />
            {photo ? 'Replace' : 'Upload'}
          </button>
          {photo ? (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-muted outline-none transition hover:bg-danger/5 hover:text-danger focus-visible:ring-2 focus-visible:ring-danger/30"
              onClick={() => onChange(undefined)}
              type="button"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          ) : null}
        </div>
      </div>
      <input
        accept="image/*"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0]

          event.target.value = ''
          if (!file) return

          try {
            setError('')
            onChange(await toSquareDataUrl(file))
          } catch {
            setError('That image could not be read. Try a JPEG or PNG.')
          }
        }}
        ref={inputRef}
        type="file"
      />
      <span className="mt-1 block text-[11px] text-neutral-400">
        {error ||
          (usedByTemplate
            ? 'Cropped to a square and shown by this template.'
            : 'Saved, but this template does not show a photo.')}
      </span>
    </div>
  )
}
