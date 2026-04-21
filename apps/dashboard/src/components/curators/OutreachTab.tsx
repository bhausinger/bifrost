import { useState, useMemo } from 'react'
import { Search, ExternalLink, Mail, MessageSquare, CheckCircle2, Pencil, Trash2, ListMusic } from 'lucide-react'
import { Select } from '@/components/ui'
import type { CuratorOutreach } from '@/types'
import { ProgressDots } from './ProgressDots'
import type { ProgressField } from './curatorUtils'

type OutreachTabProps = {
  entries: CuratorOutreach[] | undefined
  isLoading: boolean
  onToggleField: (entry: CuratorOutreach, field: ProgressField) => void
  onEdit: (entry: CuratorOutreach) => void
  onDelete: (entry: CuratorOutreach) => void
}

export function OutreachTab({ entries, isLoading, onToggleField, onEdit, onDelete }: OutreachTabProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (!entries) return []
    return entries.filter((e) => {
      if (search) {
        const q = search.toLowerCase()
        if (!e.playlist_name.toLowerCase().includes(q) && !e.email?.toLowerCase().includes(q) && !e.genre?.toLowerCase().includes(q)) return false
      }
      if (filter === 'not_emailed' && e.emailed_at) return false
      if (filter === 'emailed' && !e.emailed_at) return false
      if (filter === 'replied' && !e.replied_at) return false
      if (filter === 'confirmed' && !e.confirmed_at) return false
      return true
    })
  }, [entries, search, filter])

  const stats = useMemo(() => {
    if (!entries) return { total: 0, emailed: 0, replied: 0, confirmed: 0 }
    return {
      total: entries.length,
      emailed: entries.filter((e) => e.emailed_at).length,
      replied: entries.filter((e) => e.replied_at).length,
      confirmed: entries.filter((e) => e.confirmed_at).length,
    }
  }, [entries])

  return (
    <>
      <OutreachStats stats={stats} />

      <div className="card mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search playlists, emails, genres..."
              className="input-field w-full py-2.5 pl-10 pr-4" />
          </div>
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All statuses' },
              { value: 'not_emailed', label: 'Not emailed' },
              { value: 'emailed', label: 'Emailed' },
              { value: 'replied', label: 'Replied' },
              { value: 'confirmed', label: 'Confirmed' },
            ]}
          />
          {(search || filter !== 'all') && (
            <button onClick={() => { setSearch(''); setFilter('all') }} className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">Clear</button>
          )}
          <div className="flex-1" />
          <span className="text-sm text-gray-400">{filtered.length} playlist{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-300 border-t-teal-600" /></div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-12 text-center"><div className="text-3xl mb-3 opacity-30">📋</div><p className="text-sm font-medium text-gray-400">{entries?.length === 0 ? 'No playlists tracked yet. Add your first one to start tracking outreach.' : 'No playlists match your filters.'}</p></div>
        )}
        {!isLoading && filtered.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-white">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Playlist</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Genre</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Organic</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Progress</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Price/10K</th>
                <th className="w-20 px-3 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((entry) => (
                <tr key={entry.id} className="group table-row transition-colors hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{entry.playlist_name}</span>
                          {entry.playlist_url && (
                            <a href={entry.playlist_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-gray-400 hover:text-[#1DB954] transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        {entry.email && (
                          <div className="text-xs text-gray-400 truncate">{entry.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {entry.genre ? (
                      <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 ring-1 ring-inset ring-violet-200/60">{entry.genre}</span>
                    ) : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    {entry.is_organic === true && <span className="text-sm font-medium text-emerald-600">Yes</span>}
                    {entry.is_organic === false && <span className="text-sm font-medium text-red-500">No</span>}
                    {entry.is_organic == null && <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <ProgressDots
                      entry={entry}
                      onToggle={(field) => onToggleField(entry, field)}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {entry.price_per_10k != null ? <span className="font-mono text-sm font-medium text-gray-900">${entry.price_per_10k}</span> : <span className="text-sm text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => onEdit(entry)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(entry)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function OutreachStats({ stats }: { stats: { total: number; emailed: number; replied: number; confirmed: number } }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-gray-900">{stats.total}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Total Playlists</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><ListMusic className="h-6 w-6 text-teal-500" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-blue-600">{stats.emailed}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Emailed</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Mail className="h-6 w-6 text-blue-600" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-violet-600">{stats.replied}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Replied</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><MessageSquare className="h-6 w-6 text-violet-600" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-emerald-600">{stats.confirmed}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Confirmed</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
      </div>
    </div>
  )
}
