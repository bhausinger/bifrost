import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'destructive' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg hover:from-teal-600 hover:to-cyan-600 active:from-teal-700 active:to-cyan-700',
  secondary:
    'border border-gray-200 bg-white text-gray-700 shadow-sm hover:bg-gray-50',
  destructive:
    'border border-red-200 bg-white text-red-600 shadow-sm hover:bg-red-50',
  ghost:
    'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', className = '', ...props }, ref) => (
    <button
      ref={ref}
      className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
)
Button.displayName = 'Button'
