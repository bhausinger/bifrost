import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'

type Option = {
  value: string
  label: string
}

type MultiSelectProps = {
  values: string[]
  onChange: (values: string[]) => void
  options: Option[]
  placeholder?: string
  fullWidth?: boolean
  id?: string
}

const MAX_VISIBLE_OPTIONS = 8

export function MultiSelect({
  values,
  onChange,
  options,
  placeholder = 'Search...',
  fullWidth = false,
  id,
}: MultiSelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const available = options.filter((o) => !values.includes(o.value))
    if (!query) return available.slice(0, MAX_VISIBLE_OPTIONS)
    const term = query.toLowerCase()
    return available
      .filter((o) => o.label.toLowerCase().includes(term))
      .slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, values, query])

  const selectedLabels = values
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as Option[]

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  function handleAdd(value: string): void {
    onChange([...values, value])
    setQuery('')
  }

  function handleRemove(value: string): void {
    onChange(values.filter((v) => v !== value))
  }

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : ''}`} id={id}>
      {selectedLabels.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selectedLabels.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20"
            >
              {opt.label}
              <button
                type="button"
                onClick={() => handleRemove(opt.value)}
                className="rounded-sm hover:bg-teal-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-all hover:border-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-[slideUp_150ms_ease-out]">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">
              {query ? 'No results found' : 'All genres selected'}
            </p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleAdd(opt.value)}
                className="flex w-full items-center px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <span className="mr-2 w-3.5" />
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
