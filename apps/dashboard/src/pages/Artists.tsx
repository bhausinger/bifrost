import { useState, useMemo } from 'react'
import { Users, Plus, Search, Building2 } from 'lucide-react'
import { useArtists, useCreateArtist, useUpdateArtist } from '@/hooks/useArtists'
import { useAgencies, useCreateAgency } from '@/hooks/useAgencies'
import { useExcludedArtists, useExcludeArtist } from '@/hooks/useExcludeList'
import { ExcludeModal } from '@/components/exclude/ExcludeModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Input, Select } from '@/components/ui'
import { AddArtistModal } from './artists/AddArtistModal'
import { EditArtistModal } from './artists/EditArtistModal'
import { AgencyDrawer } from './artists/AgencyDrawer'
import { AgencyTab } from './artists/AgencyTab'
import { ArtistTable } from './artists/ArtistTable'
import type { Artist } from '@/types'

type Tab = 'artists' | 'agencies'

export function Artists() {
  const { data: artists, isLoading } = useArtists()
  const { data: excluded } = useExcludedArtists()
  const { data: agencies } = useAgencies()
  const createArtist = useCreateArtist()
  const createAgency = useCreateAgency()
  const updateArtist = useUpdateArtist()
  const excludeArtist = useExcludeArtist()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<Tab>('artists')
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEditTarget] = useState<Artist | null>(null)
  const [excludeTarget, setExcludeTarget] = useState<Artist | null>(null)
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null)

  const excludedEmails = useMemo(() => new Set(excluded?.map((e) => e.email) ?? []), [excluded])

  const sourceOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of artists ?? [])
      counts.set(a.source ?? 'unknown', (counts.get(a.source ?? 'unknown') ?? 0) + 1)
    return [
      { value: 'all', label: `All sources (${artists?.length ?? 0})` },
      ...Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => ({ value: source, label: `${source} (${count})` })),
    ]
  }, [artists])

  const agencyOptions = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const a of artists ?? []) {
      if (a.agency?.id) {
        const existing = counts.get(a.agency.id)
        if (existing) existing.count++
        else counts.set(a.agency.id, { name: a.agency.name, count: 1 })
      }
    }
    const entries = Array.from(counts.entries())
      .map(([id, info]) => ({ id, name: info.name, count: info.count }))
      .sort((a, b) => b.count - a.count)
    if (entries.length === 0) return []
    return [
      { value: 'all', label: 'All agencies' },
      ...entries.map((ag) => ({ value: ag.id, label: `${ag.name} (${ag.count})` })),
    ]
  }, [artists])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return (artists ?? []).filter((a) => {
      if (sourceFilter !== 'all' && a.source !== sourceFilter) return false
      if (agencyFilter !== 'all' && a.agency?.id !== agencyFilter) return false
      if (!term) return true
      return (
        a.name.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        (a.genres ?? []).some((g) => g.toLowerCase().includes(term)) ||
        a.agency?.name?.toLowerCase().includes(term)
      )
    })
  }, [artists, search, sourceFilter, agencyFilter])

  const totalArtists = artists?.length ?? 0
  const withEmail = artists?.filter((a) => a.email).length ?? 0
  const excludedCount = excluded?.length ?? 0

  function isExcluded(artist: Artist): boolean {
    return artist.email ? excludedEmails.has(artist.email) : false
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Users}
        title="Artists"
        description="Artists you've worked with or are currently in a campaign"
        actions={
          activeTab === 'artists' ? (
            <Button
              variant="primary"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Artist
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-1 border-b border-gray-200 bg-white px-8">
        <TabButton
          label="Artists"
          icon={<Users className="h-4 w-4" />}
          isActive={activeTab === 'artists'}
          onClick={() => setActiveTab('artists')}
        />
        <TabButton
          label="Agencies"
          icon={<Building2 className="h-4 w-4" />}
          isActive={activeTab === 'agencies'}
          onClick={() => setActiveTab('agencies')}
          count={agencies?.length}
        />
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {activeTab === 'agencies' ? (
          <AgencyTab />
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-4">
              <StatCard label="Total Artists" value={totalArtists} />
              <StatCard
                label="With Email"
                value={withEmail}
                color="text-emerald-600"
                subtitle={
                  totalArtists > 0
                    ? `${Math.round((withEmail / totalArtists) * 100)}% of total`
                    : '0%'
                }
              />
              <StatCard label="Excluded" value={excludedCount} color="text-red-600" />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, genre, or agency..."
                  className="pl-10"
                />
              </div>
              <Select value={sourceFilter} onChange={setSourceFilter} options={sourceOptions} />
              {agencyOptions.length > 0 && (
                <Select value={agencyFilter} onChange={setAgencyFilter} options={agencyOptions} />
              )}
            </div>

            {isLoading ? (
              <div className="card p-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-teal-500" />
                <div className="mt-3 text-sm text-gray-400">Loading artists...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="card p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-gray-300" />
                <div className="mt-3 text-sm font-medium text-gray-700">
                  {totalArtists === 0 ? 'No artists yet' : 'No matches'}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {totalArtists === 0
                    ? 'Get started by scraping or adding your first artist.'
                    : 'Try adjusting your search or filters.'}
                </div>
                {totalArtists === 0 && (
                  <Button
                    variant="primary"
                    onClick={() => setShowAdd(true)}
                    className="mt-4 inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Artist
                  </Button>
                )}
              </div>
            ) : (
              <ArtistTable
                artists={filtered}
                isExcluded={isExcluded}
                onExclude={setExcludeTarget}
                onEdit={setEditTarget}
                onAgencyClick={setSelectedAgency}
              />
            )}
          </>
        )}
      </div>

      <AddArtistModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        createArtist={createArtist}
        agencies={agencies ?? []}
        createAgency={createAgency}
      />

      {editTarget && (
        <EditArtistModal
          artist={editTarget}
          agencies={agencies ?? []}
          onClose={() => setEditTarget(null)}
          updateArtist={updateArtist}
          createAgency={createAgency}
        />
      )}

      {excludeTarget && (
        <ExcludeModal
          artistName={excludeTarget.name}
          onConfirm={async (reason, notes) => {
            if (excludeTarget.email) {
              await excludeArtist.mutateAsync({
                artistId: excludeTarget.id,
                email: excludeTarget.email,
                reason,
                notes,
              })
            }
            setExcludeTarget(null)
          }}
          onCancel={() => setExcludeTarget(null)}
        />
      )}

      {selectedAgency && (
        <AgencyDrawer agencyId={selectedAgency} onClose={() => setSelectedAgency(null)} />
      )}
    </div>
  )
}

function TabButton({
  label,
  icon,
  isActive,
  onClick,
  count,
}: {
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  count?: number
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
        isActive
          ? 'border-teal-600 text-teal-600'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
          {count}
        </span>
      )}
    </button>
  )
}

function StatCard({
  label,
  value,
  color = 'text-gray-900',
  subtitle,
}: {
  label: string
  value: number
  color?: string
  subtitle?: string
}): JSX.Element {
  return (
    <div className="card p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
      {subtitle && <div className="mt-0.5 text-xs text-gray-400">{subtitle}</div>}
    </div>
  )
}
