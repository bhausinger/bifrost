import { useState, useMemo } from 'react'
import { BarChart3, Search, Plus, MoreHorizontal, ExternalLink, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useCampaigns, useUpdateCampaign } from '@/hooks/useCampaigns'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Campaign, Artist } from '@/types'

type CampaignWithArtist = Campaign & { artist: Artist }

const AVATAR_COLORS = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500',
]

function getAvatarGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; ring: string }> = {
  active: { label: 'Active', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', ring: 'ring-emerald-600/20' },
  placing: { label: 'Placing', bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500', ring: 'ring-blue-600/20' },
  paused: { label: 'Paused', bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500', ring: 'ring-amber-600/20' },
  completed: { label: 'Completed', bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', ring: 'ring-gray-500/10' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-400', ring: 'ring-red-600/20' },
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function Campaigns() {
  const { data: campaigns, isLoading } = useCampaigns()
  const updateCampaign = useUpdateCampaign()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<CampaignWithArtist | null>(null)

  const filtered = useMemo(() => {
    if (!campaigns) return []
    return campaigns.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        const nameMatch = c.artist?.name?.toLowerCase().includes(q)
        const trackMatch = c.track_name?.toLowerCase().includes(q)
        const campaignMatch = c.name?.toLowerCase().includes(q)
        if (!nameMatch && !trackMatch && !campaignMatch) return false
      }
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      return true
    })
  }, [campaigns, search, statusFilter])

  const activeCount = campaigns?.filter((c) => c.status === 'active').length ?? 0
  const completedCount = campaigns?.filter((c) => c.status === 'completed').length ?? 0
  const totalPaid = campaigns?.reduce((s, c) => s + (c.total_budget ?? 0), 0) ?? 0
  const totalSpent = campaigns?.reduce((s, c) => s + (c.total_cost ?? 0), 0) ?? 0


  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={BarChart3}
        title="Campaigns"
        description="Manage your playlist placement campaigns"
        actions={
          <button className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {/* Status Stat Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="font-mono text-2xl font-bold text-gray-900">{campaigns?.length ?? 0}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-400">Total</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-500 to-gray-600">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="font-mono text-2xl font-bold text-emerald-600">{activeCount}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-400">Active</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="font-mono text-2xl font-bold text-gray-700">{completedCount}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-400">Completed</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gray-400 to-gray-500">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="card flex items-center justify-between p-5">
            <div>
              <p className="font-mono text-2xl font-bold text-emerald-600">${formatNumber(totalPaid)}</p>
              <p className="mt-0.5 text-sm font-medium text-gray-400">Paid</p>
              <p className="text-xs text-gray-400">${formatNumber(totalSpent)} to curators</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="card mb-4 p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns, artists, tracks..."
                className="input-field w-full pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="select-field"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="placing">Placing</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all') }}
                className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors"
              >
                Clear
              </button>
            )}

            <div className="flex-1" />

            <span className="text-sm text-gray-400">
              {filtered.length} campaign{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="card overflow-hidden">
          {isLoading && (
            <div className="flex items-center justify-center p-12">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-[3px] border-amber-500/20 border-t-amber-500" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-3xl mb-3 opacity-30">📋</div>
              <p className="text-sm font-medium text-gray-400">
                {campaigns?.length === 0
                  ? 'No campaigns yet. Move artists from the pipeline to create campaigns.'
                  : 'No campaigns match your filters.'}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Artist</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Track</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Paid</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Streams</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Start Date</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((campaign) => {
                  const config = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.active!
                  const gradient = getAvatarGradient(campaign.artist?.name ?? campaign.name)

                  return (
                    <tr
                      key={campaign.id}
                      onClick={() => setSelected(campaign)}
                      className="table-row cursor-pointer"
                    >
                      {/* Artist */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {campaign.artist?.image_url ? (
                            <img
                              src={campaign.artist.image_url}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-2 ring-gray-200 shadow-sm"
                            />
                          ) : (
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${gradient} shadow-sm ring-2 ring-gray-200`}>
                              <span className="text-xs font-bold text-white">
                                {(campaign.artist?.name ?? campaign.name).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {campaign.artist?.name ?? campaign.name}
                            </p>
                            <p className="truncate text-xs text-gray-400">{campaign.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Track */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm text-gray-700 max-w-[180px]">
                            {campaign.track_name || '-'}
                          </span>
                          {campaign.track_spotify_url && (
                            <a
                              href={campaign.track_spotify_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-shrink-0 text-gray-400 hover:text-[#1DB954] transition-colors"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Paid */}
                      <td className="px-5 py-3.5">
                        <div>
                          <span className="font-mono text-sm font-medium text-gray-900">
                            ${(campaign.total_budget ?? 0).toLocaleString()}
                          </span>
                          {campaign.total_cost != null && campaign.total_cost > 0 && (
                            <p className="text-xs text-gray-400">
                              ${campaign.total_cost.toLocaleString()} spent
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Streams */}
                      <td className="px-5 py-3.5">
                        <div>
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {formatNumber(campaign.actual_streams)}
                          </span>
                          {campaign.target_streams != null && campaign.target_streams > 0 && (
                            <span className="text-xs text-gray-400">
                              {' '}/ {formatNumber(campaign.target_streams)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.bg} ${config.text} ring-1 ring-inset ${config.ring}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="px-5 py-3.5 text-sm text-gray-400">
                        {campaign.start_date
                          ? new Date(campaign.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '-'}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(campaign) }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Campaign Detail Drawer */}
      {selected && (
        <>
          <div className="modal-overlay" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col border-l border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                {selected.artist?.image_url ? (
                  <img src={selected.artist.image_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 shadow-sm" />
                ) : (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${getAvatarGradient(selected.artist?.name ?? selected.name)} shadow-sm ring-2 ring-gray-200`}>
                    <span className="text-sm font-bold text-white">
                      {(selected.artist?.name ?? selected.name).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-display text-lg font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-sm text-gray-400">{selected.artist?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Status Selector */}
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {['active', 'placing', 'paused', 'completed', 'cancelled'].map((status) => {
                      const sc = STATUS_CONFIG[status]!
                      return (
                        <button
                          key={status}
                          onClick={() => updateCampaign.mutate({ id: selected.id, status })}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            selected.status === status
                              ? 'bg-amber-500 text-gray-900 shadow-sm'
                              : `${sc.bg} ${sc.text} hover:opacity-80`
                          }`}
                        >
                          {sc.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Track */}
                {selected.track_name && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Track</h3>
                    <p className="text-sm font-medium text-gray-900">{selected.track_name}</p>
                    {selected.track_spotify_url && (
                      <a
                        href={selected.track_spotify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-[#1DB954] hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open on Spotify
                      </a>
                    )}
                  </div>
                )}

                {/* Financials */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Financials</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-400">Amount Paid</p>
                      <p className="mt-1 font-mono text-lg font-bold text-emerald-600">
                        ${selected.total_budget?.toLocaleString() ?? '0'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-400">Spent on Curators</p>
                      <p className="mt-1 font-mono text-lg font-bold text-gray-900">
                        ${selected.total_cost?.toLocaleString() ?? '0'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Performance</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-400">Streams</p>
                      <p className="mt-1 font-mono text-lg font-bold text-gray-900">
                        {selected.actual_streams.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-400">Target</p>
                      <p className="mt-1 font-mono text-lg font-bold text-gray-900">
                        {selected.target_streams?.toLocaleString() ?? '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Notes</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
