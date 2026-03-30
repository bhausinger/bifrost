import type { LabelHTMLAttributes } from 'react'

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  optional?: boolean
}

export function Label({ children, optional, className = '', ...props }: LabelProps) {
  return (
    <label
      className={`mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400 ${className}`}
      {...props}
    >
      {children}
      {optional && (
        <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-300">
          optional
        </span>
      )}
    </label>
  )
}
