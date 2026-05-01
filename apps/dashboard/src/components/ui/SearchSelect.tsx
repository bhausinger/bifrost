import { useState, useRef, useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'

type Option = {
  value: string
  label: string
}

type SearchSelectProps = {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  fullWidth?: boolean
  id?: string
}

const MAX_VISIBLE_OPTIONS = 8

export function SearchSelect({
  value,
  onChange,
  options,
  placeholder = 'Search...',
  fullWidth = false,
  id,
}: SearchSelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? ''

  const filtered = useMemo(() => {
    if (!query) return options.slice(0, MAX_VISIBLE_OPTIONS)
    const term = query.toLowerCase()
    return options
      .filter((o) => o.label.toLowerCase().includes(term))
      .slice(0, MAX_VISIBLE_OPTIONS)
  }, [options, query])

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

  function handleSelect(val: string): void {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function handleInputFocus(): void {
    setOpen(true)
    setQuery('')
  }

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : ''}`} id={id}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selectedLabel}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm transition-all hover:border-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-[slideUp_150ms_ease-out]">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No results found</p>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(opt.value)}
                className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${
                  opt.value === value
                    ? 'bg-teal-50 font-medium text-teal-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {opt.value === value && (
                  <svg className="mr-2 h-3.5 w-3.5 text-teal-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
                {opt.value !== value && <span className="mr-2 w-3.5" />}
                {opt.label}
              </button>
            ))
          )}
          {options.length > MAX_VISIBLE_OPTIONS && !query && (
            <p className="border-t border-gray-100 px-3 py-1.5 text-xs text-gray-400">
              Type to search {options.length.toLocaleString()} artists...
            </p>
          )}
        </div>
      )}
    </div>
  )
}
