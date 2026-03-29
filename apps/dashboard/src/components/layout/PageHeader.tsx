import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-8 py-6">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="mt-0.5 text-sm text-gray-400">{description}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
