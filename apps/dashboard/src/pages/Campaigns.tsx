import { useState, useMemo } from 'react'
import {
  BarChart3,
  Search,
  Plus,
  MoreHorizontal,
  ExternalLink,
  DollarSign,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import { useCampaigns, useCreateCampaign, useUpdateCampaign } from '@/hooks/useCampaigns'
import { useArtists } from '@/hooks/useArtists'
import { PageHeader } from '@/components/layout/PageHeader'
import { Select, Input, Button } from '@/components/ui'
import {
  STATUS_FILTER_OPTIONS,
  STATUS_CONFIG,
  getAvatarGradient,
  formatNumber,
  type CampaignWithArtist,
} from './campaigns/campaignConstants'
import { CampaignDrawer } from './campaigns/CampaignDrawer'
import { NewCampaignModal } from './campaigns/NewCampaignModal'

export function Campaigns() {
  const { data: campaigns, isLoading } = useCampaigns()
  const { data: artists } = useArtists()
  const createCampaign = useCreateCampaign()
  const updateCampaign = useUpdateCampaign()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<CampaignWithArtist | null>(null)
  const [showNewCampaign, setShowNewCampaign] = useState(false)

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
          <Button
            variant="primary"
            onClick={() => setShowNewCampaign(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {/* Stat Cards */}
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
              <p className="font-mono text-2xl font-bold text-emerald-600">
                ${formatNumber(totalPaid)}
              </p>
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
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search campaigns, artists, tracks..."
                className="pl-10"
              />
            </div>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
            />

            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
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
        <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
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
            <table className="spreadsheet">
              <thead>
                <tr>
                  <th>Artist</th>
                  <th>Track</th>
                  <th>Paid</th>
                  <th>Streams</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((campaign) => {
                  const config = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.active!
                  const gradient = getAvatarGradient(campaign.artist?.name ?? campaign.name)

                  return (
                    <tr
                      key={campaign.id}
                      onClick={() => setSelected(campaign)}
                      className="cursor-pointer group"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          {campaign.artist?.image_url ? (
                            <img
                              src={campaign.artist.image_url}
                              alt=""
                              className="h-7 w-7 rounded-full object-cover ring-1 ring-gray-200"
                            />
                          ) : (
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ring-1 ring-gray-200`}
                            >
                              <span className="text-[10px] font-bold text-white">
                                {(campaign.artist?.name ?? campaign.name).charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {campaign.artist?.name ?? campaign.name}
                          </p>
                        </div>
                      </td>

                      <td>
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

                      <td>
                        <span className="font-mono text-sm font-medium text-gray-900">
                          ${(campaign.total_budget ?? 0).toLocaleString()}
                        </span>
                      </td>

                      <td>
                        <div>
                          <span className="font-mono text-sm font-medium text-gray-900">
                            {formatNumber(campaign.actual_streams)}
                          </span>
                          {campaign.target_streams !== null && campaign.target_streams > 0 && (
                            <span className="text-xs text-gray-400">
                              {' '}
                              / {formatNumber(campaign.target_streams)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="flex items-center gap-1.5 text-[13px]">
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          {config.label}
                        </span>
                      </td>

                      <td className="text-sm text-gray-400">
                        {campaign.start_date
                          ? new Date(campaign.start_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>

                      <td className="text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(campaign)
                          }}
                          className="rounded p-1 text-gray-400 hover:text-gray-600 transition-colors"
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

      {selected && (
        <CampaignDrawer
          selected={selected}
          onClose={() => setSelected(null)}
          updateCampaign={updateCampaign}
        />
      )}

      <NewCampaignModal
        open={showNewCampaign}
        onClose={() => setShowNewCampaign(false)}
        artists={artists}
        createCampaign={createCampaign}
      />
    </div>
  )
}
