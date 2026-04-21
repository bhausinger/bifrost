import { useState, useMemo } from 'react'
import { Search, Globe, DollarSign, Users, ListMusic } from 'lucide-react'
import { Select } from '@/components/ui'
import { type CuratorWithPlaylists, getCuratorGradient } from './curatorUtils'

type DirectoryTabProps = {
  curators: CuratorWithPlaylists[] | undefined
  isLoading: boolean
  onSelectCurator: (curator: CuratorWithPlaylists) => void
}

export function DirectoryTab({ curators, isLoading, onSelectCurator }: DirectoryTabProps) {
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('all')

  const allGenres = useMemo(() => {
    if (!curators) return []
    const genres = new Set<string>()
    curators.forEach((c) => {
      c.genres?.forEach((g) => genres.add(g))
      c.playlists.forEach((p) => { if (p.genre) genres.add(p.genre) })
    })
    return Array.from(genres).sort()
  }, [curators])

  const filtered = curators?.filter((c) => {
    if (search) {
      const q = search.toLowerCase()
      if (!c.name.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q)) return false
    }
    if (genreFilter !== 'all') {
      const curatorGenresSet = new Set([
        ...(c.genres ?? []),
        ...c.playlists.map((p) => p.genre).filter(Boolean),
      ])
      if (!curatorGenresSet.has(genreFilter)) return false
    }
    return true
  })

  const totalPlaylists = curators?.reduce((s, c) => s + c.playlists.length, 0) ?? 0
  const activeCurators = curators?.filter((c) => c.is_active).length ?? 0

  return (
    <>
      <DirectoryStats curators={curators} totalPlaylists={totalPlaylists} activeCurators={activeCurators} />

      <div className="card mb-4 p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search curators..."
              className="input-field w-full py-2.5 pl-10 pr-4" />
          </div>
          <Select
            value={genreFilter}
            onChange={setGenreFilter}
            options={[
              { value: 'all', label: 'All genres' },
              ...allGenres.map((g) => ({ value: g, label: g })),
            ]}
          />
          {(search || genreFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setGenreFilter('all') }} className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">Clear</button>
          )}
          <div className="flex-1" />
          <span className="text-sm text-gray-400">{filtered?.length ?? 0} curator{(filtered?.length ?? 0) !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {isLoading && <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-300 border-t-teal-600" /></div>}
      {!isLoading && filtered?.length === 0 && (
        <div className="card p-12 text-center"><div className="text-3xl mb-3 opacity-30">🎧</div><p className="text-sm font-medium text-gray-400">No curators yet. Add your first curator to start building your network.</p></div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((curator) => (
          <CuratorCard key={curator.id} curator={curator} onClick={() => onSelectCurator(curator)} />
        ))}
      </div>
    </>
  )
}

function DirectoryStats({ curators, totalPlaylists, activeCurators }: {
  curators: CuratorWithPlaylists[] | undefined; totalPlaylists: number; activeCurators: number
}) {
  const totalReach = curators?.reduce((s, c) => s + c.playlists.reduce((ps, p) => ps + p.follower_count, 0), 0) ?? 0
  const reachDisplay = totalReach >= 1_000_000 ? `${(totalReach / 1_000_000).toFixed(1)}M` : totalReach >= 1_000 ? `${(totalReach / 1_000).toFixed(0)}K` : String(totalReach)

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3">
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-gray-900">{activeCurators}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Active Curators</p><p className="text-xs text-gray-400">{curators?.length ?? 0} total</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Users className="h-6 w-6 text-teal-500" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div><p className="font-mono text-2xl font-bold text-gray-900">{totalPlaylists.toLocaleString()}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Total Playlists</p></div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><ListMusic className="h-6 w-6 text-violet-600" /></div>
      </div>
      <div className="kpi-card card flex items-center justify-between p-5">
        <div>
          <p className="font-mono text-2xl font-bold text-gray-900">{reachDisplay}</p>
          <p className="mt-0.5 text-sm font-medium text-gray-400">Total Reach</p><p className="text-xs text-gray-400">combined followers</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Globe className="h-6 w-6 text-blue-600" /></div>
      </div>
    </div>
  )
}

function CuratorCard({ curator, onClick }: { curator: CuratorWithPlaylists; onClick: () => void }) {
  const gradient = getCuratorGradient(curator.name)
  const genres = curator.genres?.length ? curator.genres : [...new Set(curator.playlists.map((p) => p.genre).filter(Boolean))]
  const totalFollowers = curator.playlists.reduce((s, p) => s + p.follower_count, 0)

  return (
    <div onClick={onClick} className="card cursor-pointer p-5 transition-all duration-200 hover:border-gray-300">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-md`}><span className="text-lg font-bold text-white">{curator.name.charAt(0).toUpperCase()}</span></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h3 className="truncate text-sm font-bold text-gray-900">{curator.name}</h3><span className={`h-2 w-2 rounded-full flex-shrink-0 ${curator.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} /></div>
          {curator.contact_name && <p className="truncate text-xs text-gray-400 mt-0.5">{curator.contact_name}</p>}
          {!curator.contact_name && curator.email && <p className="truncate text-xs text-gray-400 mt-0.5">{curator.email}</p>}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><ListMusic className="h-3.5 w-3.5" />{curator.playlists.length.toLocaleString()} playlists</span>
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{totalFollowers >= 1000000 ? `${(totalFollowers / 1000000).toFixed(1)}M` : totalFollowers >= 1000 ? `${(totalFollowers / 1000).toFixed(0)}K` : totalFollowers} followers</span>
        {curator.price_per_10k != null && <span className="flex items-center gap-1 font-mono font-medium text-emerald-600"><DollarSign className="h-3.5 w-3.5" />${curator.price_per_10k}/10K</span>}
      </div>
      {genres.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {genres.slice(0, 4).map((g) => <span key={g} className="inline-flex items-center rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 ring-1 ring-inset ring-violet-200/60">{g}</span>)}
          {genres.length > 4 && <span className="text-[10px] text-gray-400 self-center">+{genres.length - 4} more</span>}
        </div>
      )}
      {curator.payment_method && <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400"><DollarSign className="h-3 w-3" />{curator.payment_method}{curator.payment_handle && ` — ${curator.payment_handle}`}</div>}
    </div>
  )
}
