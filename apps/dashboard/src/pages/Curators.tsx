import { useState, useMemo } from 'react'
import { Music, Plus, Search, ExternalLink, Globe, Tag, DollarSign, Users, ListMusic, ChevronLeft, Mail, MessageSquare, Send, CheckCircle2, Pencil, Trash2 } from 'lucide-react'
import { Input, Textarea, Select, Label, Modal, Button } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/PageHeader'
import type { Curator, Playlist, CuratorOutreach } from '@/types'

type CuratorWithPlaylists = Curator & { playlists: Playlist[] }
type Tab = 'directory' | 'outreach'

const AVATAR_COLORS = [
  'from-fuchsia-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-blue-400 to-indigo-500',
  'from-teal-400 to-cyan-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
]

function getCuratorGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

// ─── Progress Dots — shows how far through the funnel a playlist is ───
const PROGRESS_STEPS = ['emailed_at', 'followed_up_at', 'replied_at', 'confirmed_at'] as const
const PROGRESS_LABELS = ['Emailed', 'Followed up', 'Replied', 'Confirmed']

function ProgressDots({ entry, onToggle }: { entry: CuratorOutreach; onToggle: (field: typeof PROGRESS_STEPS[number]) => void }) {
  // Find the furthest completed step
  const furthestLabel = (() => {
    for (let i = PROGRESS_STEPS.length - 1; i >= 0; i--) {
      if (entry[PROGRESS_STEPS[i]!]) return PROGRESS_LABELS[i]
    }
    return 'Not started'
  })()

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {PROGRESS_STEPS.map((field, i) => (
          <button
            key={field}
            onClick={(e) => { e.stopPropagation(); onToggle(field) }}
            title={`${PROGRESS_LABELS[i]}: ${entry[field] ? new Date(entry[field]!).toLocaleDateString() : 'Click to mark'}`}
            className={`h-3 w-3 rounded-full transition-all duration-200 ${
              entry[field]
                ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30 hover:bg-emerald-400'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">{furthestLabel}</span>
    </div>
  )
}

export function Curators() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('outreach')
  const [selectedCurator, setSelectedCurator] = useState<CuratorWithPlaylists | null>(null)
  const [showAddCurator, setShowAddCurator] = useState(false)
  const [showAddOutreach, setShowAddOutreach] = useState(false)
  const [search, setSearch] = useState('')
  const [outreachSearch, setOutreachSearch] = useState('')
  const [outreachFilter, setOutreachFilter] = useState('all')

  // Playlist filters (inside profile view)
  const [playlistSearch, setPlaylistSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')

  // ─── Data ───
  const { data: curators, isLoading } = useQuery({
    queryKey: ['curators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curators')
        .select('*, playlists(*)')
        .order('name')
      if (error) throw error
      return data as CuratorWithPlaylists[]
    },
  })

  const { data: outreachEntries, isLoading: outreachLoading } = useQuery({
    queryKey: ['curator-outreach'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curator_outreach')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CuratorOutreach[]
    },
  })

  const addCurator = useMutation({
    mutationFn: async (curator: { name: string; contact_name?: string; email?: string; genres?: string[]; price_per_10k?: number; payment_method?: string; payment_handle?: string; payment_code?: string; notes?: string }) => {
      const { data, error } = await supabase.from('curators').insert(curator).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curators'] })
      setShowAddCurator(false)
    },
  })

  const addOutreach = useMutation({
    mutationFn: async (entry: Partial<CuratorOutreach>) => {
      const { data, error } = await supabase.from('curator_outreach').insert(entry).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
      setShowAddOutreach(false)
    },
  })

  const updateOutreach = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CuratorOutreach> & { id: string }) => {
      const { error } = await supabase.from('curator_outreach').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })

  const deleteOutreach = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('curator_outreach').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curator-outreach'] })
    },
  })

  // Edit outreach state
  const [editingOutreach, setEditingOutreach] = useState<CuratorOutreach | null>(null)

  // ─── Curator form state ───
  const [formName, setFormName] = useState('')
  const [formContactName, setFormContactName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formGenres, setFormGenres] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formPaymentMethod, setFormPaymentMethod] = useState('')
  const [formPaymentHandle, setFormPaymentHandle] = useState('')
  const [formPaymentCode, setFormPaymentCode] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // ─── Outreach form state ───
  const [oPlaylist, setOPlaylist] = useState('')
  const [oUrl, setOUrl] = useState('')
  const [oEmail, setOEmail] = useState('')
  const [oGenre, setOGenre] = useState('')
  const [oOrganic, setOOrganic] = useState<string>('')
  const [oPrice, setOPrice] = useState('')

  // Directory genre filter
  const [directoryGenreFilter, setDirectoryGenreFilter] = useState('all')

  // ─── Computed ───
  const allDirectoryGenres = useMemo(() => {
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
    if (directoryGenreFilter !== 'all') {
      const curatorGenresSet = new Set([
        ...(c.genres ?? []),
        ...c.playlists.map((p) => p.genre).filter(Boolean),
      ])
      if (!curatorGenresSet.has(directoryGenreFilter)) return false
    }
    return true
  })

  const totalPlaylists = curators?.reduce((s, c) => s + c.playlists.length, 0) ?? 0
  const activeCurators = curators?.filter((c) => c.is_active).length ?? 0

  const filteredOutreach = useMemo(() => {
    if (!outreachEntries) return []
    return outreachEntries.filter((e) => {
      if (outreachSearch) {
        const q = outreachSearch.toLowerCase()
        if (!e.playlist_name.toLowerCase().includes(q) && !e.email?.toLowerCase().includes(q) && !e.genre?.toLowerCase().includes(q)) return false
      }
      if (outreachFilter === 'not_emailed' && e.emailed_at) return false
      if (outreachFilter === 'emailed' && !e.emailed_at) return false
      if (outreachFilter === 'replied' && !e.replied_at) return false
      if (outreachFilter === 'confirmed' && !e.confirmed_at) return false
      return true
    })
  }, [outreachEntries, outreachSearch, outreachFilter])

  const outreachStats = useMemo(() => {
    if (!outreachEntries) return { total: 0, emailed: 0, replied: 0, confirmed: 0 }
    return {
      total: outreachEntries.length,
      emailed: outreachEntries.filter((e) => e.emailed_at).length,
      replied: outreachEntries.filter((e) => e.replied_at).length,
      confirmed: outreachEntries.filter((e) => e.confirmed_at).length,
    }
  }, [outreachEntries])

  // Playlist filters for profile view
  const curatorGenres = useMemo(() => {
    if (!selectedCurator) return []
    const genres = new Set<string>()
    selectedCurator.playlists.forEach((p) => { if (p.genre) genres.add(p.genre) })
    return Array.from(genres).sort()
  }, [selectedCurator])

  const curatorCountries = useMemo(() => {
    if (!selectedCurator) return []
    const countries = new Set<string>()
    selectedCurator.playlists.forEach((p) => { if (p.country) countries.add(p.country) })
    return Array.from(countries).sort()
  }, [selectedCurator])

  const filteredPlaylists = useMemo(() => {
    if (!selectedCurator) return []
    return selectedCurator.playlists.filter((p) => {
      if (playlistSearch) {
        const q = playlistSearch.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.genre?.toLowerCase().includes(q)) return false
      }
      if (genreFilter !== 'all' && p.genre !== genreFilter) return false
      if (countryFilter !== 'all' && p.country !== countryFilter) return false
      return true
    })
  }, [selectedCurator, playlistSearch, genreFilter, countryFilter])

  function handleAddCurator() {
    if (!formName) return
    const genres = formGenres ? formGenres.split(/[,\/]/).map((g) => g.trim()).filter(Boolean) : undefined
    addCurator.mutate({
      name: formName,
      contact_name: formContactName || undefined,
      email: formEmail || undefined,
      genres,
      price_per_10k: formPrice ? parseFloat(formPrice) : undefined,
      payment_method: formPaymentMethod || undefined,
      payment_handle: formPaymentHandle || undefined,
      payment_code: formPaymentCode || undefined,
      notes: formNotes || undefined,
    })
    setFormName(''); setFormContactName(''); setFormEmail(''); setFormGenres(''); setFormPrice(''); setFormPaymentMethod(''); setFormPaymentHandle(''); setFormPaymentCode(''); setFormNotes('')
  }

  function handleAddOutreach() {
    if (!oPlaylist) return
    addOutreach.mutate({
      playlist_name: oPlaylist,
      playlist_url: oUrl || null,
      email: oEmail || null,
      genre: oGenre || null,
      is_organic: oOrganic === '' ? null : oOrganic === 'yes',
      price_per_10k: oPrice ? parseFloat(oPrice) : null,
    })
    setOPlaylist(''); setOUrl(''); setOEmail(''); setOGenre(''); setOOrganic(''); setOPrice('')
  }

  function toggleOutreachField(entry: CuratorOutreach, field: 'emailed_at' | 'followed_up_at' | 'replied_at' | 'confirmed_at') {
    updateOutreach.mutate({
      id: entry.id,
      [field]: entry[field] ? null : new Date().toISOString(),
    })
  }

  function openProfile(curator: CuratorWithPlaylists) {
    setSelectedCurator(curator)
    setPlaylistSearch(''); setGenreFilter('all'); setCountryFilter('all')
  }

  // ─── Profile View ───
  if (selectedCurator) {
    const gradient = getCuratorGradient(selectedCurator.name)
    const priceDisplay = selectedCurator.price_per_10k != null
      ? `$${selectedCurator.price_per_10k}`
      : '-'

    return (
      <div className="flex h-full flex-col">
        <PageHeader
          icon={Music}
          title={selectedCurator.name}
          description={`${selectedCurator.playlists.length.toLocaleString()} playlists`}
          actions={
            <button onClick={() => setSelectedCurator(null)}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
              <ChevronLeft className="h-4 w-4" />
              All Curators
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto bg-gray-50/80 p-6">
          <div className="card mb-6 p-6">
            <div className="flex items-start gap-5">
              <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}>
                <span className="text-2xl font-bold text-white">{selectedCurator.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-xl font-bold text-gray-900">{selectedCurator.name}</h2>
                  {selectedCurator.price_per_10k != null && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                      ${selectedCurator.price_per_10k}/10K
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${selectedCurator.is_active ? 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20' : 'bg-gray-100 text-gray-400 ring-1 ring-inset ring-gray-300/60'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedCurator.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    {selectedCurator.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {selectedCurator.contact_name && <span className="font-medium text-gray-700">{selectedCurator.contact_name}</span>}
                  {selectedCurator.email && <span>{selectedCurator.email}</span>}
                  {selectedCurator.payment_method && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-300/60">
                      {selectedCurator.payment_method}{selectedCurator.payment_handle && ` — ${selectedCurator.payment_handle}`}
                    </span>
                  )}
                  {selectedCurator.payment_code && (
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-300/60">
                      Code: {selectedCurator.payment_code}
                    </span>
                  )}
                </div>
                {selectedCurator.genres?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedCurator.genres.map((g) => <span key={g} className="inline-flex items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 ring-1 ring-inset ring-violet-200/60">{g}</span>)}
                  </div>
                )}
                {selectedCurator.notes && <p className="mt-2 text-sm text-gray-400 leading-relaxed">{selectedCurator.notes}</p>}
              </div>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="kpi-card card flex items-center justify-between p-5">
              <div><p className="font-mono text-2xl font-bold text-gray-900">{selectedCurator.playlists.length.toLocaleString()}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Playlists</p></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><ListMusic className="h-6 w-6 text-teal-500" /></div>
            </div>
            <div className="kpi-card card flex items-center justify-between p-5">
              <div><p className="font-mono text-2xl font-bold text-gray-900">{curatorGenres.length}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Genres</p></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Tag className="h-6 w-6 text-violet-600" /></div>
            </div>
            <div className="kpi-card card flex items-center justify-between p-5">
              <div><p className="font-mono text-2xl font-bold text-gray-900">{curatorCountries.length}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Countries</p></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Globe className="h-6 w-6 text-blue-600" /></div>
            </div>
            <div className="kpi-card card flex items-center justify-between p-5">
              <div><p className="font-mono text-2xl font-bold text-emerald-600">{priceDisplay}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Per 10K</p></div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><DollarSign className="h-6 w-6 text-emerald-600" /></div>
            </div>
          </div>

          <div className="card mb-4 p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type="text" value={playlistSearch} onChange={(e) => setPlaylistSearch(e.target.value)} placeholder="Search playlists..."
                  className="input-field w-full py-2.5 pl-10 pr-4" />
              </div>
              <Select
                value={genreFilter}
                onChange={setGenreFilter}
                options={[
                  { value: 'all', label: 'All genres' },
                  ...curatorGenres.map((g) => ({ value: g, label: g })),
                ]}
              />
              <Select
                value={countryFilter}
                onChange={setCountryFilter}
                options={[
                  { value: 'all', label: 'All countries' },
                  ...curatorCountries.map((c) => ({ value: c, label: c })),
                ]}
              />
              {(playlistSearch || genreFilter !== 'all' || countryFilter !== 'all') && (
                <button onClick={() => { setPlaylistSearch(''); setGenreFilter('all'); setCountryFilter('all') }} className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">Clear</button>
              )}
              <div className="flex-1" />
              <span className="text-sm text-gray-400">{filteredPlaylists.length} playlist{filteredPlaylists.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="card overflow-hidden">
            {filteredPlaylists.length === 0 ? (
              <div className="p-12 text-center"><div className="text-3xl mb-3 opacity-30">🎵</div><p className="text-sm font-medium text-gray-400">{selectedCurator.playlists.length === 0 ? 'No playlists added yet.' : 'No playlists match your filters.'}</p></div>
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
                  {filteredPlaylists.map((p) => (
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
        </div>
      </div>
    )
  }

  // ─── Main View with Tabs ───
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Music}
        title="Curators"
        description="Your playlist curator network"
        actions={
          <button
            onClick={() => tab === 'outreach' ? setShowAddOutreach(true) : setShowAddCurator(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {tab === 'outreach' ? 'Add Playlist' : 'Add Curator'}
          </button>
        }
      />

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white/80 px-6">
        <div className="flex gap-1">
          {([
            { id: 'outreach' as Tab, label: 'Outreach Tracker', icon: Send },
            { id: 'directory' as Tab, label: 'Curator Directory', icon: Users },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-teal-500 text-teal-500'
                  : 'border-transparent text-gray-400 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50/80 p-6">

        {/* ═══ OUTREACH TRACKER TAB ═══ */}
        {tab === 'outreach' && (
          <>
            {/* Stats */}
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="kpi-card card flex items-center justify-between p-5">
                <div><p className="font-mono text-2xl font-bold text-gray-900">{outreachStats.total}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Total Playlists</p></div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><ListMusic className="h-6 w-6 text-teal-500" /></div>
              </div>
              <div className="kpi-card card flex items-center justify-between p-5">
                <div><p className="font-mono text-2xl font-bold text-blue-600">{outreachStats.emailed}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Emailed</p></div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Mail className="h-6 w-6 text-blue-600" /></div>
              </div>
              <div className="kpi-card card flex items-center justify-between p-5">
                <div><p className="font-mono text-2xl font-bold text-violet-600">{outreachStats.replied}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Replied</p></div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><MessageSquare className="h-6 w-6 text-violet-600" /></div>
              </div>
              <div className="kpi-card card flex items-center justify-between p-5">
                <div><p className="font-mono text-2xl font-bold text-emerald-600">{outreachStats.confirmed}</p><p className="mt-0.5 text-sm font-medium text-gray-400">Confirmed</p></div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="card mb-4 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={outreachSearch} onChange={(e) => setOutreachSearch(e.target.value)} placeholder="Search playlists, emails, genres..."
                    className="input-field w-full py-2.5 pl-10 pr-4" />
                </div>
                <Select
                  value={outreachFilter}
                  onChange={setOutreachFilter}
                  options={[
                    { value: 'all', label: 'All statuses' },
                    { value: 'not_emailed', label: 'Not emailed' },
                    { value: 'emailed', label: 'Emailed' },
                    { value: 'replied', label: 'Replied' },
                    { value: 'confirmed', label: 'Confirmed' },
                  ]}
                />
                {(outreachSearch || outreachFilter !== 'all') && (
                  <button onClick={() => { setOutreachSearch(''); setOutreachFilter('all') }} className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">Clear</button>
                )}
                <div className="flex-1" />
                <span className="text-sm text-gray-400">{filteredOutreach.length} playlist{filteredOutreach.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Outreach Table */}
            <div className="card overflow-hidden">
              {outreachLoading && (
                <div className="flex items-center justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-300 border-t-teal-600" /></div>
              )}
              {!outreachLoading && filteredOutreach.length === 0 && (
                <div className="p-12 text-center"><div className="text-3xl mb-3 opacity-30">📋</div><p className="text-sm font-medium text-gray-400">{outreachEntries?.length === 0 ? 'No playlists tracked yet. Add your first one to start tracking outreach.' : 'No playlists match your filters.'}</p></div>
              )}
              {!outreachLoading && filteredOutreach.length > 0 && (
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
                    {filteredOutreach.map((entry) => (
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
                            onToggle={(field) => toggleOutreachField(entry, field)}
                          />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {entry.price_per_10k != null ? <span className="font-mono text-sm font-medium text-gray-900">${entry.price_per_10k}</span> : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => setEditingOutreach(entry)}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Remove "${entry.playlist_name}" from tracking?`)) deleteOutreach.mutate(entry.id) }}
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
        )}

        {/* ═══ DIRECTORY TAB ═══ */}
        {tab === 'directory' && (
          <>
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
                  <p className="font-mono text-2xl font-bold text-gray-900">
                    {(() => { const total = curators?.reduce((s, c) => s + c.playlists.reduce((ps, p) => ps + p.follower_count, 0), 0) ?? 0; return total >= 1_000_000 ? `${(total / 1_000_000).toFixed(1)}M` : total >= 1_000 ? `${(total / 1_000).toFixed(0)}K` : String(total) })()}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-gray-400">Total Reach</p><p className="text-xs text-gray-400">combined followers</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white"><Globe className="h-6 w-6 text-blue-600" /></div>
              </div>
            </div>

            <div className="card mb-4 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search curators..."
                    className="input-field w-full py-2.5 pl-10 pr-4" />
                </div>
                <Select
                  value={directoryGenreFilter}
                  onChange={setDirectoryGenreFilter}
                  options={[
                    { value: 'all', label: 'All genres' },
                    ...allDirectoryGenres.map((g) => ({ value: g, label: g })),
                  ]}
                />
                {(search || directoryGenreFilter !== 'all') && (
                  <button onClick={() => { setSearch(''); setDirectoryGenreFilter('all') }} className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors">Clear</button>
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
              {filtered?.map((curator) => {
                const gradient = getCuratorGradient(curator.name)
                const genres = curator.genres?.length ? curator.genres : [...new Set(curator.playlists.map((p) => p.genre).filter(Boolean))]
                const totalFollowers = curator.playlists.reduce((s, p) => s + p.follower_count, 0)
                return (
                  <div key={curator.id} onClick={() => openProfile(curator)} className="card cursor-pointer p-5 transition-all duration-200 hover:border-gray-300">
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
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Curator Modal */}
      {showAddCurator && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddCurator(false)} />
          <div className="modal-panel fixed inset-x-0 top-[10%] z-50 mx-auto w-full max-w-lg">
            <h3 className="font-display text-lg font-bold text-gray-900">Add Curator</h3>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Client / Business Name *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field w-full" placeholder="e.g., Golden Nuggets Records" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Contact Name</label>
                  <input type="text" value={formContactName} onChange={(e) => setFormContactName(e.target.value)} className="input-field w-full" placeholder="e.g., Alan Maurer" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="input-field w-full" placeholder="curator@email.com" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Price per 10K</label>
                  <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="input-field w-full" placeholder="120" step="1" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-500">Genres</label>
                <input type="text" value={formGenres} onChange={(e) => setFormGenres(e.target.value)} className="input-field w-full" placeholder="Bass, Dubstep, Riddim, Trap (comma or slash separated)" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Payment Method</label>
                  <Select
                    value={formPaymentMethod}
                    onChange={setFormPaymentMethod}
                    placeholder="Select..."
                    fullWidth
                    options={[
                      { value: '', label: 'Select...' },
                      { value: 'PayPal', label: 'PayPal' },
                      { value: 'XRP', label: 'XRP' },
                      { value: 'CashApp', label: 'CashApp' },
                      { value: 'Venmo', label: 'Venmo' },
                      { value: 'Zelle', label: 'Zelle' },
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                      { value: 'Online', label: 'Online' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Payment Address</label>
                  <input type="text" value={formPaymentHandle} onChange={(e) => setFormPaymentHandle(e.target.value)} className="input-field w-full" placeholder="Address, email, or URL" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Code / Memo</label>
                  <input type="text" value={formPaymentCode} onChange={(e) => setFormPaymentCode(e.target.value)} className="input-field w-full" placeholder="e.g., XRP tag" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-500">Notes</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="input-field w-full" placeholder="Any notes about this curator" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAddCurator(false)} className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddCurator} disabled={!formName} className="btn-primary disabled:opacity-50">Add Curator</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Outreach Entry Modal */}
      {showAddOutreach && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddOutreach(false)} />
          <div className="modal-panel fixed inset-x-0 top-[10%] z-50 mx-auto w-full max-w-lg">
            <h3 className="font-display text-lg font-bold text-gray-900">Add Playlist to Track</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-500">Playlist Name *</label>
                <input type="text" value={oPlaylist} onChange={(e) => setOPlaylist(e.target.value)} className="input-field w-full" placeholder="e.g., Bass Nation" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-500">Playlist URL</label>
                <input type="url" value={oUrl} onChange={(e) => setOUrl(e.target.value)} className="input-field w-full" placeholder="https://open.spotify.com/playlist/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Email</label>
                  <input type="email" value={oEmail} onChange={(e) => setOEmail(e.target.value)} className="input-field w-full" placeholder="owner@email.com" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Genre</label>
                  <input type="text" value={oGenre} onChange={(e) => setOGenre(e.target.value)} className="input-field w-full" placeholder="e.g., EDM, Bass, Rap" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Organic?</label>
                  <Select
                    value={oOrganic}
                    onChange={setOOrganic}
                    fullWidth
                    options={[
                      { value: '', label: 'Unknown' },
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ]}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-500">Price per 10K</label>
                  <input type="number" value={oPrice} onChange={(e) => setOPrice(e.target.value)} className="input-field w-full" placeholder="0.00" step="0.01" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowAddOutreach(false)} className="rounded-lg border border-gray-300 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button onClick={handleAddOutreach} disabled={!oPlaylist} className="btn-primary disabled:opacity-50">Add Playlist</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Outreach Modal */}
      {editingOutreach && <EditOutreachModal
        entry={editingOutreach}
        onClose={() => setEditingOutreach(null)}
        onSave={(updates) => {
          updateOutreach.mutate({ id: editingOutreach.id, ...updates })
          setEditingOutreach(null)
        }}
      />}
    </div>
  )
}

// ─── Edit Outreach Modal (extracted for controlled state) ───

function EditOutreachModal({
  entry,
  onClose,
  onSave,
}: {
  entry: CuratorOutreach
  onClose: () => void
  onSave: (updates: Partial<CuratorOutreach>) => void
}) {
  const [name, setName] = useState(entry.playlist_name)
  const [url, setUrl] = useState(entry.playlist_url ?? '')
  const [email, setEmail] = useState(entry.email ?? '')
  const [genre, setGenre] = useState(entry.genre ?? '')
  const [organic, setOrganic] = useState(entry.is_organic === true ? 'yes' : entry.is_organic === false ? 'no' : '')
  const [price, setPrice] = useState(entry.price_per_10k?.toString() ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')

  return (
    <Modal open onClose={onClose} title="Edit Playlist" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={() => onSave({
        playlist_name: name,
        playlist_url: url || null,
        email: email || null,
        genre: genre || null,
        is_organic: organic === '' ? null : organic === 'yes',
        price_per_10k: price ? Number(price) : null,
        notes: notes || null,
      })}>Save Changes</Button>
    </>}>
      <div className="space-y-4">
        <div>
          <Label>Playlist Name *</Label>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Playlist URL</Label>
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://open.spotify.com/playlist/..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Genre</Label>
            <Input type="text" value={genre} onChange={(e) => setGenre(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Organic?</Label>
            <Select
              value={organic}
              onChange={setOrganic}
              fullWidth
              options={[
                { value: '', label: 'Unknown' },
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
          </div>
          <div>
            <Label>Price per 10K</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} step="0.01" />
          </div>
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  )
}
