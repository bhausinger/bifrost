import { useState, useMemo } from 'react'
import { Music, Search, ExternalLink, Globe, Tag, DollarSign, ListMusic, ChevronLeft } from 'lucide-react'
import { Select } from '@/components/ui'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Playlist } from '@/types'
import { type CuratorWithPlaylists, getCuratorGradient } from './curatorUtils'

type CuratorProfileProps = {
  curator: CuratorWithPlaylists
  onBack: () => void
}

export function CuratorProfile({ curator, onBack }: CuratorProfileProps) {
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')

  const gradient = getCuratorGradient(curator.name)
  const priceDisplay = curator.price_per_10k != null ? `$${curator.price_per_10k}` : '-'

  const curatorGenres = useMemo(() => {
    const genres = new Set<string>()
    curator.playlists.forEach((p) => { if (p.genre) genres.add(p.genre) })
    return Array.from(genres).sort()
  }, [curator])

  const curatorCountries = useMemo(() => {
    const countries = new Set<string>()
    curator.playlists.forEach((p) => { if (p.country) countries.add(p.country) })
    return Array.from(countries).sort()
  }, [curator])

  const filteredPlaylists = useMemo(() => {
    return curator.playlists.filter((p) => {
      if (playlistSearch) {
        const q = playlistSearch.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.genre?.toLowerCase().includes(q)) return false
      }
      if (genreFilter !== 'all' && p.genre !== genreFilter) return false
      if (countryFilter !== 'all' && p.country !== countryFilter) return false
      return true
    })
  }, [curator, playlistSearch, genreFilter, countryFilter])

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Music}
        title={curator.name}
        description={`${curator.playlists.length.toLocaleString()} playlists`}
        actions={
          <button onClick={onBack}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
            <ChevronLeft className="h-4 w-4" />
            All Curators
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto bg-gray-50/80 p-6">
        <ProfileHeader curator={curator} gradient={gradient} />
        <ProfileStats
          playlistCount={curator.playlists.length}
          genreCount={curatorGenres.length}
          countryCount={curatorCountries.length}
          priceDisplay={priceDisplay}
        />
        <PlaylistFilters
          playlistSearch={playlistSearch}
          onSearchChange={setPlaylistSearch}
          genreFilter={genreFilter}
          onGenreChange={setGenreFilter}
          countryFilter={countryFilter}
          onCountryChange={setCountryFilter}
          genres={curatorGenres}
          countries={curatorCountries}
          resultCount={filteredPlaylists.length}
        />
        <PlaylistTable
          playlists={filteredPlaylists}
          totalCount={curator.playlists.length}
        />
      </div>
    </div>
  )
}

function ProfileHeader({ curator, gradient }: { curator: CuratorWithPlaylists; gradient: string }) {
  return (
    <div className="card mb-6 p-6">
      <div className="flex items-start gap-5">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <span className="text-2xl font-bold text-white">{curator.name.charAt(0).toUpperCase()}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold text-gray-900">{curator.name}</h2>
            {curator.price_per_10k != null && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                ${curator.price_per_10k}/10K
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${curator.is_active ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20' : 'bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-300/60'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${curator.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {curator.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {curator.contact_name && <span className="font-medium text-gray-700">{curator.contact_name}</span>}
            {curator.email && <span>{curator.email}</span>}
            {curator.payment_method && (
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-300/60">
                {curator.payment_method}{curator.payment_handle && ` — ${curator.payment_handle}`}
              </span>
            )}
            {curator.payment_code && (
              <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-300/60">
                Code: {curator.payment_code}
              </span>
            )}
          </div>
          {curator.genres?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {curator.genres.map((g) => <span key={g} className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 ring-1 ring-inset ring-violet-200/60">{g}</span>)}
            </div>
          )}
          {curator.notes && <p className="mt-2 text-sm text-gray-400 leading-relaxed">{curator.notes}</p>}
        </div>
      </div>
    </div>
  )
}

function ProfileStats({ playlistCount, genreCount, countryCount, priceDisplay }: {
  playlistCount: number; genreCount: number; countryCount: number; priceDisplay: string
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-gray-900">{playlistCount.toLocaleString()}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Playlists</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><ListMusic className="h-6 w-6 text-teal-500" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-gray-900">{genreCount}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Genres</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Tag className="h-6 w-6 text-violet-600" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-gray-900">{countryCount}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Countries</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Globe className="h-6 w-6 text-blue-600" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-emerald-600">{priceDisplay}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Per 10K</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><DollarSign className="h-6 w-6 text-emerald-600" /></div>
      </div>
    </div>
  )
}

type PlaylistFiltersProps = {
  playlistSearch: string
  onSearchChange: (value: string) => void
  genreFilter: string
  onGenreChange: (value: string) => void
  countryFilter: string
  onCountryChange: (value: string) => void
  genres: string[]
  countries: string[]
  resultCount: number
}

function PlaylistFilters({
  playlistSearch, onSearchChange,
  genreFilter, onGenreChange,
  countryFilter, onCountryChange,
  genres, countries, resultCount,
}: PlaylistFiltersProps) {
  return (
    <div className="card mb-4 p-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" value={playlistSearch} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search playlists..."
            className="input-field w-full py-2.5 pl-10 pr-4" />
        </div>
        <Select
          value={genreFilter}
          onChange={onGenreChange}
          options={[
            { value: 'all', label: 'All genres' },
            ...genres.map((g) => ({ value: g, label: g })),
          ]}
        />
        <Select
          value={countryFilter}
          onChange={onCountryChange}
          options={[
            { value: 'all', label: 'All countries' },
            ...countries.map((c) => ({ value: c, label: c })),
          ]}
        />
        {(playlistSearch || genreFilter !== 'all' || countryFilter !== 'all') && (
          <button onClick={() => { onSearchChange(''); onGenreChange('all'); onCountryChange('all') }} className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">Clear</button>
        )}
        <div className="flex-1" />
        <span className="text-sm text-gray-400">{resultCount} playlist{resultCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

function PlaylistTable({ playlists, totalCount }: { playlists: Playlist[]; totalCount: number }) {
  return (
    <div className="card overflow-hidden">
      {playlists.length === 0 ? (
        <div className="p-12 text-center"><div className="text-3xl mb-3 opacity-30">🎵</div><p className="text-sm font-medium text-gray-400">{totalCount === 0 ? 'No playlists added yet.' : 'No playlists match your filters.'}</p></div>
      ) : (
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 bg-white">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Playlist</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Genre</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Country</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Followers</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Price</th>
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Avg Streams</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {playlists.map((p) => (
              <tr key={p.id} className="table-row transition-colors hover:bg-gray-50">
                <td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className="text-sm font-medium text-gray-900">{p.name}</span>{p.spotify_url && <a href={p.spotify_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-gray-400 hover:text-[#1DB954] transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>}</div></td>
                <td className="px-5 py-3.5">{p.genre ? <span className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 ring-1 ring-inset ring-violet-200/60">{p.genre}</span> : <span className="text-sm text-gray-400">-</span>}</td>
                <td className="px-5 py-3.5">{p.country ? <span className="inline-flex items-center gap-1 text-sm text-gray-700"><Globe className="h-3 w-3 text-gray-400" />{p.country}</span> : <span className="text-sm text-gray-400">-</span>}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-gray-700">{p.follower_count.toLocaleString()}</td>
                <td className="px-5 py-3.5">{p.price_per_placement != null ? <span className="font-mono text-sm font-medium text-emerald-600">${p.price_per_placement}</span> : <span className="text-sm text-gray-400">-</span>}</td>
                <td className="px-5 py-3.5 font-mono text-sm text-gray-500">{p.avg_streams_per_placement != null ? `~${p.avg_streams_per_placement.toLocaleString()}` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
