import { useState, useMemo } from 'react'
import { Users, Plus, Search } from 'lucide-react'
import { useArtists, useCreateArtist } from '@/hooks/useArtists'
import { useAgencies, useCreateAgency } from '@/hooks/useAgencies'
import { useExcludedArtists, useExcludeArtist } from '@/hooks/useExcludeList'
import { ExcludeModal } from '@/components/exclude/ExcludeModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Input } from '@/components/ui'
import { AddArtistModal } from './artists/AddArtistModal'
import { AgencyDrawer } from './artists/AgencyDrawer'
import { ArtistTable } from './artists/ArtistTable'
import type { Artist } from '@/types'

export function Artists() {
  const { data: artists, isLoading } = useArtists()
  const { data: excluded } = useExcludedArtists()
  const { data: agencies } = useAgencies()
  const createArtist = useCreateArtist()
  const createAgency = useCreateAgency()
  const excludeArtist = useExcludeArtist()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [agencyFilter, setAgencyFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [excludeTarget, setExcludeTarget] = useState<Artist | null>(null)
  const [selectedAgency, setSelectedAgency] = useState<string | null>(null)

  const excludedEmails = useMemo(() => new Set(excluded?.map((e) => e.email) ?? []), [excluded])

  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of artists ?? [])
      counts.set(a.source ?? 'unknown', (counts.get(a.source ?? 'unknown') ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [artists])

  const agencyCounts = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>()
    for (const a of artists ?? []) {
      if (a.agency?.id) {
        const existing = counts.get(a.agency.id)
        if (existing) {
          existing.count++
        } else {
          counts.set(a.agency.id, { name: a.agency.name, count: 1 })
        }
      }
    }
    return Array.from(counts.entries())
      .map(([id, info]) => ({ id, name: info.name, count: info.count }))
      .sort((a, b) => b.count - a.count)
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
          <Button
            variant="primary"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Artist
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {/* Stat strip */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Total Artists
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-gray-900">
              {totalArtists.toLocaleString()}
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
              With Email
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">
              {withEmail.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-gray-400">
              {totalArtists > 0 ? `${Math.round((withEmail / totalArtists) * 100)}%` : '0%'} of
              total
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Excluded
            </div>
            <div className="mt-1 font-mono text-2xl font-bold text-red-600">
              {excludedCount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Search + filters */}
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

          <div className="flex flex-wrap gap-1.5">
            <FilterPill
              label={`All sources (${totalArtists})`}
              isActive={sourceFilter === 'all'}
              onClick={() => setSourceFilter('all')}
            />
            {sources.map(([source, count]) => (
              <FilterPill
                key={source}
                label={`${source} (${count})`}
                isActive={sourceFilter === source}
                onClick={() => setSourceFilter(source)}
              />
            ))}
          </div>

          {agencyCounts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <FilterPill
                label="All agencies"
                isActive={agencyFilter === 'all'}
                onClick={() => setAgencyFilter('all')}
              />
              {agencyCounts.map((ag) => (
                <FilterPill
                  key={ag.id}
                  label={`${ag.name} (${ag.count})`}
                  isActive={agencyFilter === ag.id}
                  onClick={() => setAgencyFilter(ag.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Table or states */}
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
                : 'Try adjusting your search or source filter.'}
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
            onAgencyClick={setSelectedAgency}
          />
        )}
      </div>

      <AddArtistModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        createArtist={createArtist}
        agencies={agencies ?? []}
        createAgency={createAgency}
      />

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

function FilterPill({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        isActive
          ? 'bg-teal-600 text-white'
          : 'bg-white text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )
}
