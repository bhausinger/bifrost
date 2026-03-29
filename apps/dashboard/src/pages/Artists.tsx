import { useState } from 'react'
import { Users, Plus } from 'lucide-react'
import { useArtists, useCreateArtist } from '@/hooks/useArtists'
import { useExcludedArtists, useExcludeArtist } from '@/hooks/useExcludeList'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import { ExcludeModal } from '@/components/exclude/ExcludeModal'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Artist } from '@/types'

export function Artists() {
  const { data: artists, isLoading } = useArtists()
  const { data: excluded } = useExcludedArtists()
  const createArtist = useCreateArtist()
  const createPipelineEntry = useCreatePipelineEntry()
  const excludeArtist = useExcludeArtist()
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [excludeTarget, setExcludeTarget] = useState<Artist | null>(null)

  const excludedEmails = new Set(excluded?.map((e) => e.email) ?? [])

  const filtered = artists?.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase()) ||
      a.genres.some((g) => g.toLowerCase().includes(search.toLowerCase()))
  )

  function isExcluded(artist: Artist): boolean {
    return artist.email ? excludedEmails.has(artist.email) : false
  }

  async function handleAddArtist(e: React.FormEvent<HTMLFormElement>) {
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
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Artist
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or genre..."
            className="input-field w-full max-w-sm"
          />
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Name</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Email</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Genres</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Listeners</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Source</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered?.map((artist) => {
                  const excluded = isExcluded(artist)
                  return (
                    <tr
                      key={artist.id}
                      className={`table-row ${excluded ? 'opacity-40' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 font-medium">{artist.name}</span>
                          {excluded && (
                            <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600 ring-1 ring-inset ring-red-600/20">
                              Excluded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {artist.email ?? '-'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {artist.genres.join(', ') || '-'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-gray-500">
                        {artist.monthly_listeners?.toLocaleString() ?? '-'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-400">{artist.source}</td>
                      <td className="px-5 py-3.5 text-right">
                        {!excluded && artist.email && (
                          <button
                            onClick={() => setExcludeTarget(artist)}
                            className="text-xs text-red-600 hover:text-red-300 transition-colors"
                          >
                            Exclude
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Artist Modal */}
      {showAdd && (
        <>
          <div
            className="modal-overlay"
            onClick={() => setShowAdd(false)}
          />
          <div className="modal-panel fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
            <h3 className="mb-4 font-display text-lg font-semibold text-gray-900">Add Artist</h3>
            <form onSubmit={handleAddArtist} className="space-y-3">
              <input
                name="name"
                placeholder="Artist name"
                required
                className="input-field w-full"
              />
              <input
                name="email"
                type="email"
                placeholder="Email (optional)"
                className="input-field w-full"
              />
              <input
                name="spotify_url"
                placeholder="Spotify URL (optional)"
                className="input-field w-full"
              />
              <input
                name="genres"
                placeholder="Genres (comma separated)"
                className="input-field w-full"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createArtist.isPending}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {createArtist.isPending ? 'Adding...' : 'Add & Start Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Exclude Modal */}
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
