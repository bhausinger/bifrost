import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type DetailCardProps = {
  open: boolean
  onClose: () => void
  header: ReactNode
  children: ReactNode
  maxWidth?: string
}

export function DetailCard({
  open,
  onClose,
  header,
  children,
  maxWidth = 'max-w-2xl',
}: DetailCardProps): JSX.Element | null {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`pointer-events-auto flex h-[85vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-[slideUp_200ms_ease-out]`}
        >
          {header}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </>
  )
}

type DetailCardHeaderProps = {
  title: string
  subtitle?: string
  avatar?: string | null
  avatarFallback?: string
  avatarGradient?: string
  onClose: () => void
  tabs?: ReactNode
  gradient?: string
}

export function DetailCardHeader({
  title,
  subtitle,
  avatar,
  avatarFallback,
  avatarGradient = 'from-teal-400 to-emerald-500',
  onClose,
  tabs,
  gradient,
}: DetailCardHeaderProps): JSX.Element {
  const fallbackChar = (avatarFallback ?? title).charAt(0).toUpperCase()

  return (
    <>
      <div
        className={`relative flex items-center gap-4 px-6 py-5 ${
          gradient ? `bg-gradient-to-r ${gradient} text-white` : 'border-b border-gray-200'
        }`}
      >
        {avatar ? (
          <img
            src={avatar}
            alt=""
            className={`h-12 w-12 rounded-full object-cover shadow-sm ${
              gradient ? 'ring-2 ring-white/30' : 'ring-2 ring-gray-200'
            }`}
          />
        ) : (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-sm ${
              gradient
                ? 'bg-white/20 ring-2 ring-white/30'
                : `bg-gradient-to-br ${avatarGradient} ring-2 ring-gray-200`
            }`}
          >
            <span className={`text-lg font-bold ${gradient ? '' : 'text-white'}`}>
              {fallbackChar}
            </span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2
            className={`font-display text-xl font-bold truncate ${gradient ? '' : 'text-gray-900'}`}
          >
            {title}
          </h2>
          {subtitle && (
            <p className={`text-sm truncate ${gradient ? 'text-white/80' : 'text-gray-400'}`}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className={`rounded-md p-1.5 transition-colors ${
            gradient
              ? 'text-white/80 hover:bg-white/10 hover:text-white'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {tabs}
    </>
  )
}
