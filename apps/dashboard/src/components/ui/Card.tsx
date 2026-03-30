import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: string
}

export function Card({ children, padding = 'p-5', className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
