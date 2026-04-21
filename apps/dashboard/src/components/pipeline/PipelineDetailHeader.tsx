import { ExternalLink, X, TrendingUp, Mail, FileEdit } from 'lucide-react'
import type { PipelineEntry, Artist } from '@/types'
import { HEADER_GRADIENT } from './pipelineDetailTypes'
import type { Tab } from './pipelineDetailTypes'

type PipelineDetailHeaderProps = {
  entry: PipelineEntry & { artist: Artist }
  tab: Tab
  onTabChange: (tab: Tab) => void
  onClose: () => void
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'edit', label: 'Edit', icon: FileEdit },
] as const

export function PipelineDetailHeader({ entry, tab, onTabChange, onClose }: PipelineDetailHeaderProps): JSX.Element {
  return (
    <>
      <div className={`relative flex items-center gap-4 bg-gradient-to-r ${HEADER_GRADIENT} px-6 py-5 text-white`}>
        {entry.artist.image_url ? (
          <img src={entry.artist.image_url} alt="" className="h-16 w-16 rounded-full ring-2 ring-white/30 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
            <span className="text-2xl font-bold">{entry.artist.name.charAt(0).toUpperCase()}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl font-bold truncate">{entry.artist.name}</h2>
          {entry.artist.soundcloud_url && (
            <a
              href={entry.artist.soundcloud_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-white/80 hover:text-white"
            >
              @{entry.artist.soundcloud_url.split('/').filter(Boolean).pop()}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 px-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              tab === t.id ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>
    </>
  )
}
