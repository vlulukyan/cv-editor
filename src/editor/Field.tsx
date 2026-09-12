type FieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  textarea?: boolean
  rows?: number
  placeholder?: string
  hint?: string
}

const controlClass =
  'w-full rounded-lg border border-rule bg-white px-2.5 py-2 text-[13px] leading-5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-ink focus:ring-2 focus:ring-ink/10'

export function Field({
  label,
  value,
  onChange,
  textarea = false,
  rows = 3,
  placeholder,
  hint,
}: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted">
        {label}
      </span>
      {textarea ? (
        <textarea
          className={`${controlClass} resize-y [field-sizing:content]`}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          value={value}
        />
      ) : (
        <input
          className={controlClass}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      )}
      {hint ? (
        <span className="mt-1 block text-[11px] text-neutral-400">{hint}</span>
      ) : null}
    </label>
  )
}

/** Two short fields sharing a row, for things like a period and a place. */
export function FieldPair({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>
}
