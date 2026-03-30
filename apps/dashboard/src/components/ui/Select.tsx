import { useState, useRef, useEffect, type ReactNode } from 'react'

interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  fullWidth?: boolean
  className?: string
  id?: string
  children?: ReactNode
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  fullWidth = false,
  className = '',
  id,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder ?? 'Select...'

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [open])

  return (
    <div ref={ref} className={`relative ${fullWidth ? 'w-full' : ''}`} id={id}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm transition-all duration-200 hover:border-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {selectedLabel}
        </span>
        <svg
          className={`ml-2 h-4 w-4 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-[slideUp_150ms_ease-out]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value)
                setOpen(false)
              }}
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
          ))}
        </div>
      )}
    </div>
  )
}
