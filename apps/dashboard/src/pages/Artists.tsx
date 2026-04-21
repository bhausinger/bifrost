import { useState, useMemo } from 'react'
import { Users, Plus, X, ExternalLink, Search } from 'lucide-react'
import { useArtists, useCreateArtist } from '@/hooks/useArtists'
import { useExcludedArtists, useExcludeArtist } from '@/hooks/useExcludeList'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import { ExcludeModal } from '@/components/exclude/ExcludeModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { Modal, Button, Input, Label } from '@/components/ui'
import type { Artist } from '@/types'

const AVATAR_GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-cyan-400 to-blue-500',
]

function getGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length]!
}

function formatCount(n: number | null | undefined): string {
  if (n == null) return '-'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function Artists() {
  const { data: artists, isLoading } = useArtists()
  const { data: excluded } = useExcludedArtists()
  const createArtist = useCreateArtist()
  const createPipelineEntry = useCreatePipelineEntry()
  const excludeArtist = useExcludeArtist()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [excludeTarget, setExcludeTarget] = useState<Artist | null>(null)

  const excludedEmails = useMemo(
    () => new Set(excluded?.map((e) => e.email) ?? []),
    [excluded],
  )

  const sources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const a of artists ?? []) counts.set(a.source, (counts.get(a.source) ?? 0) + 1)
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [artists])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return (artists ?? []).filter((a) => {
      if (sourceFilter !== 'all' && a.source !== sourceFilter) return false
      if (!term) return true
      return (
        a.name.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.genres.some((g) => g.toLowerCase().includes(term))
      )
    })
  }, [artists, search, sourceFilter])

  const totalArtists = artists?.length ?? 0
  const withEmail = artists?.filter((a) => a.email).length ?? 0
  const excludedCount = excluded?.length ?? 0

  function isExcluded(artist: Artist): boolean {
    return artist.email ? excludedEmails.has(artist.email) : false
  }

  async function handleAddArtist(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const artist = await createArtist.mutateAsync({
      name: form.get('name') as string,
      email: (form.get('email') as string) || null,
      spotify_url: (form.get('spotify_url') as string) || null,
      genres: (form.get('genres') as string)
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      source: 'manual',
    })
    await createPipelineEntry.mutateAsync({ artistId: artist.id })
    setShowAdd(false)
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Users}
        title="Artists"
        description="All artists in your database"
        actions={
          <Button variant="primary" onClick={() => setShowAdd(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Artist
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        {/* Stat strip */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Total Artists</div>
            <div className="mt-1 font-mono text-2xl font-bold text-gray-900">{totalArtists.toLocaleString()}</div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">With Email</div>
            <div className="mt-1 font-mono text-2xl font-bold text-emerald-600">{withEmail.toLocaleString()}</div>
            <div className="mt-0.5 text-xs text-gray-400">
              {totalArtists > 0 ? `${Math.round((withEmail / totalArtists) * 100)}%` : '0%'} of total
            </div>
          </div>
          <div className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Excluded</div>
            <div className="mt-1 font-mono text-2xl font-bold text-red-600">{excludedCount.toLocaleString()}</div>
          </div>
        </div>

        {/* Search + source filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or genre..."
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSourceFilter('all')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sourceFilter === 'all'
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
              }`}
            >
              All sources ({totalArtists})
            </button>
            {sources.map(([source, count]) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sourceFilter === source
                    ? 'bg-teal-600 text-white'
                    : 'bg-white text-gray-500 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
                }`}
              >
                {source} ({count})
              </button>
            ))}
          </div>
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
              <Button variant="primary" onClick={() => setShowAdd(true)} className="mt-4 inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Artist
              </Button>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Artist</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Genres</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Followers</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Tracks</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Source</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((artist) => {
                  const excluded = isExcluded(artist)
                  const gradient = getGradient(artist.name)
                  return (
                    <tr
                      key={artist.id}
                      className={`group transition-colors hover:bg-gray-50 ${excluded ? 'opacity-50' : ''}`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {artist.image_url ? (
                            <img
                              src={artist.image_url}
                              alt=""
                              className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                          ) : (
                            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} ring-2 ring-white shadow-sm`}>
                              <span className="text-xs font-bold text-white">
                                {artist.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium text-gray-900">{artist.name}</span>
                              {excluded && (
                                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-600 ring-1 ring-inset ring-red-600/20">
                                  Excluded
                                </span>
                              )}
                            </div>
                            {artist.location && (
                              <div className="truncate text-xs text-gray-400">{artist.location}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">
                        {artist.email ? (
                          <a href={`mailto:${artist.email}`} className="hover:text-teal-600">
                            {artist.email}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {artist.genres.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {artist.genres.slice(0, 2).map((g) => (
                              <span key={g} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                                {g}
                              </span>
                            ))}
                            {artist.genres.length > 2 && (
                              <span className="text-xs text-gray-400">+{artist.genres.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
                        {formatCount(artist.follower_count)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-sm text-gray-700">
                        {formatCount(artist.track_count)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          {artist.source}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {artist.soundcloud_url && (
                            <a
                              href={artist.soundcloud_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-orange-600 group-hover:opacity-100"
                              title="Open SoundCloud"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {!excluded && artist.email && (
                            <button
                              onClick={() => setExcludeTarget(artist)}
                              className="rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                              title="Exclude artist"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Artist">
        <form onSubmit={handleAddArtist} className="space-y-5">
          <div>
            <Label htmlFor="add-name">Artist Name <span className="text-red-500 normal-case">*</span></Label>
            <Input id="add-name" name="name" placeholder="e.g. Tame Impala" required />
          </div>
          <div>
            <Label htmlFor="add-email" optional>Email</Label>
            <Input id="add-email" name="email" type="email" placeholder="artist@example.com" />
          </div>
          <div>
            <Label htmlFor="add-spotify" optional>Spotify URL</Label>
            <Input
              id="add-spotify"
              name="spotify_url"
              type="url"
              pattern="https://open\.spotify\.com/artist/.*"
              title="Must be a Spotify artist URL (https://open.spotify.com/artist/...)"
              placeholder="https://open.spotify.com/artist/..."
            />
          </div>
          <div>
            <Label htmlFor="add-genres" optional>Genres</Label>
            <Input id="add-genres" name="genres" placeholder="indie, electronic, dream pop" />
          </div>
          <div className="flex gap-3 pt-3">
            <Button type="button" variant="secondary" onClick={() => setShowAdd(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createArtist.isPending} className="flex-1">
              {createArtist.isPending ? 'Adding...' : 'Add & Start Pipeline'}
            </Button>
          </div>
        </form>
      </Modal>

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
    </div>
  )
}
