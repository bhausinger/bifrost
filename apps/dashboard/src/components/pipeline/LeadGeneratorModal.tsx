import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import { fetchDedupData, checkDuplicate, type DedupData } from '@/lib/dedup'
import type { PipelineStage } from '@/types'

interface LeadGeneratorModalProps {
  onClose: () => void
}

type Step =
  | 'config'
  | 'discovering'
  | 'results'
  | 'scraping'
  | 'review'
  | 'importing'
  | 'done'

interface DiscoveredLead {
  name: string
  url: string
  followers: number
  track_count: number
  genre: string
  last_modified: string | null
  avatar_url: string | null
  city: string | null
  country: string | null
  sc_user_id: string | null
  already_in_pipeline: boolean
  selected: boolean
}

interface ScrapedLead extends DiscoveredLead {
  email: string | null
  editedEmail: string
  spotify_url: string | null
  instagram_handle: string | null
  image_url: string | null
  bio: string | null
  social_links: Record<string, string>
  isDuplicate: boolean
  isBlocked: boolean
  duplicateNote: string
}

const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:9999'

const GENRES = [
  'Electronic', 'Hip-Hop', 'Pop', 'R&B', 'Rock', 'Indie', 'House', 'Techno',
  'Drum & Bass', 'Dubstep', 'Trap', 'Lo-Fi', 'Ambient', 'Soul', 'Funk',
  'Latin', 'UKG', 'Jungle', 'Grime', 'Afrobeats', 'Amapiano', 'Jersey Club',
  'Drill', 'Phonk',
]

const UPLOAD_RECENCY = [
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 3 months', value: 90 },
  { label: 'Last 6 months', value: 180 },
  { label: 'Last year', value: 365 },
  { label: 'Any time', value: 0 },
]

export function LeadGeneratorModal({ onClose }: LeadGeneratorModalProps) {
  const createEntry = useCreatePipelineEntry()
  const dedupRef = useRef<DedupData | null>(null)

  // Step state
  const [step, setStep] = useState<Step>('config')

  // Config state
  const [seedUrl, setSeedUrl] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [minFollowers, setMinFollowers] = useState(2000)
  const [maxFollowers, setMaxFollowers] = useState(50000)
  const [uploadRecency, setUploadRecency] = useState(0)
  const [maxResults, setMaxResults] = useState(100)

  // Discovery state
  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([])
  const [totalFound, setTotalFound] = useState(0)
  const [discoveryError, setDiscoveryError] = useState('')

  // Scrape state
  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([])
  const [scrapeProgress, setScrapeProgress] = useState({
    done: 0,
    total: 0,
    emailsFound: 0,
    eta: '',
  })

  // Live feed for scraping
  const [liveFeed, setLiveFeed] = useState<Array<{ name: string; hasEmail: boolean }>>([])
  const feedRef = useRef<HTMLDivElement>(null)

  // Import state
  const [importStage, setImportStage] = useState<PipelineStage>('discovered')
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importResults, setImportResults] = useState({
    imported: 0,
    skipped: 0,
    failed: 0,
  })

  // --- Config helpers ---

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    )
  }

  // --- Discovery ---

  async function handleDiscover() {
    setStep('discovering')
    setDiscoveryError('')

    try {
      const res = await fetch(`${SCRAPER_URL}/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed_url: seedUrl,
          min_followers: minFollowers,
          max_followers: maxFollowers,
          genres: selectedGenres.length > 0 ? selectedGenres : undefined,
          uploaded_within_days: uploadRecency || undefined,
          max_results: maxResults,
        }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      const results = data.results || []
      setTotalFound(data.total_found ?? results.length)

      // Fetch dedup data once, cache for scrape step
      const dedup = await fetchDedupData()
      dedupRef.current = dedup

      const leads: DiscoveredLead[] = results.map(
        (r: {
          name: string
          url: string
          followers: number
          track_count: number
          genre: string
          last_modified: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          sc_user_id: string | null
        }) => {
          const reason = checkDuplicate(dedup, r.url, null, r.name, null)
          const alreadyInPipeline = !!reason
          return {
            name: r.name,
            url: r.url,
            followers: r.followers ?? 0,
            track_count: r.track_count ?? 0,
            genre: r.genre ?? '',
            last_modified: r.last_modified ?? null,
            avatar_url: r.avatar_url ?? null,
            city: r.city ?? null,
            country: r.country ?? null,
            sc_user_id: r.sc_user_id ?? null,
            already_in_pipeline: alreadyInPipeline,
            selected: !alreadyInPipeline,
          }
        }
      )

      setDiscoveredLeads(leads)
      setStep('results')
    } catch (err) {
      setDiscoveryError(
        err instanceof Error ? err.message : 'Discovery failed'
      )
      setStep('config')
    }
  }

  // --- Results helpers ---

  function toggleLeadSelect(index: number) {
    setDiscoveredLeads((prev) =>
      prev.map((l, i) =>
        i === index && !l.already_in_pipeline
          ? { ...l, selected: !l.selected }
          : l
      )
    )
  }

  function selectAllLeads() {
    setDiscoveredLeads((prev) =>
      prev.map((l) =>
        !l.already_in_pipeline ? { ...l, selected: true } : l
      )
    )
  }

  function deselectAllLeads() {
    setDiscoveredLeads((prev) => prev.map((l) => ({ ...l, selected: false })))
  }

  const selectedLeadCount = discoveredLeads.filter((l) => l.selected).length
  const filteredCount = discoveredLeads.length
  const pipelineCount = discoveredLeads.filter(
    (l) => l.already_in_pipeline
  ).length

  // --- Scraping ---

  async function handleScrape() {
    const selected = discoveredLeads.filter((l) => l.selected)
    if (selected.length === 0) return

    setStep('scraping')
    setLiveFeed([])
    setScrapeProgress({
      done: 0,
      total: selected.length,
      emailsFound: 0,
      eta: 'Calculating...',
    })

    const scraped: ScrapedLead[] = []
    const startTime = Date.now()

    // Reuse cached dedup data, or fetch fresh if not available
    const dedup = dedupRef.current ?? await fetchDedupData()

    for (let i = 0; i < selected.length; i++) {
      const lead = selected[i]!
      const elapsed = Date.now() - startTime
      const perItem = elapsed / (i + 1)
      const remaining = Math.round(
        (perItem * (selected.length - i - 1)) / 1000
      )
      const eta =
        remaining > 60
          ? `~${Math.round(remaining / 60)}m`
          : `~${remaining}s`

      try {
        const response = await fetch(`${SCRAPER_URL}/scrape/soundcloud`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lead.url }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()

        const reason = checkDuplicate(dedup, lead.url, data.email, data.name ?? lead.name, data.bio)
        const isFlagged = !!reason

        scraped.push({
          ...lead,
          email: data.email ?? null,
          editedEmail: data.email || '',
          spotify_url: data.spotify_url ?? null,
          instagram_handle: data.instagram ?? null,
          image_url: data.image_url || lead.avatar_url,
          bio: data.bio ?? null,
          social_links: data.social_links ?? {},
          isDuplicate: isFlagged,
          isBlocked: false,
          duplicateNote: reason ?? '',
          selected: !isFlagged && !!data.email,
          followers: data.followers ?? lead.followers,
          track_count: data.track_count ?? lead.track_count,
        })

        setLiveFeed((prev) => [...prev, { name: data.name ?? lead.name, hasEmail: !!data.email }])
        setScrapeProgress((p) => ({
          ...p,
          done: i + 1,
          emailsFound: p.emailsFound + (data.email ? 1 : 0),
          eta,
        }))
      } catch {
        // Still add the lead but without scraped data
        scraped.push({
          ...lead,
          email: null,
          editedEmail: '',
          spotify_url: null,
          instagram_handle: null,
          image_url: lead.avatar_url,
          bio: null,
          social_links: {},
          isDuplicate: false,
          isBlocked: false,
          duplicateNote: '',
          selected: false,
        })

        setLiveFeed((prev) => [...prev, { name: lead.name, hasEmail: false }])
        setScrapeProgress((p) => ({
          ...p,
          done: i + 1,
          eta,
        }))
      }
    }

    setScrapedLeads(scraped)
    setStep('review')
  }

  // --- Review helpers ---

  function toggleScrapedSelect(index: number) {
    setScrapedLeads((prev) =>
      prev.map((r, i) =>
        i === index && !r.isDuplicate ? { ...r, selected: !r.selected } : r
      )
    )
  }

  function selectAllWithEmails() {
    setScrapedLeads((prev) =>
      prev.map((r) =>
        !r.isDuplicate && r.editedEmail ? { ...r, selected: true } : r
      )
    )
  }

  function deselectAllScraped() {
    setScrapedLeads((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  function updateEmail(index: number, email: string) {
    setScrapedLeads((prev) =>
      prev.map((r, i) => (i === index ? { ...r, editedEmail: email } : r))
    )
  }

  const selectedScrapedCount = scrapedLeads.filter((r) => r.selected).length

  // --- CSV download ---

  function downloadCsv() {
    const headers = [
      'Name',
      'Email',
      'SoundCloud URL',
      'Followers',
      'Genre',
      'Location',
      'Instagram',
      'Spotify',
    ]
    const rows = scrapedLeads.map((r) => [
      r.name,
      r.editedEmail,
      r.url || '',
      String(r.followers ?? ''),
      r.genre,
      [r.city, r.country].filter(Boolean).join(', '),
      r.instagram_handle || '',
      r.spotify_url || '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lead-generator-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Import ---

  async function handleImport() {
    const selected = scrapedLeads.filter((r) => r.selected)
    if (selected.length === 0) return

    setStep('importing')
    setImportProgress({ done: 0, total: selected.length })

    let imported = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < selected.length; i++) {
      const artist = selected[i]!
      try {
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert({
            name: artist.name,
            email: artist.editedEmail || null,
            spotify_url: artist.spotify_url,
            soundcloud_url: artist.url,
            instagram_handle: artist.instagram_handle,
            genres: artist.genre ? [artist.genre] : [],
            monthly_listeners: null,
            follower_count: artist.followers || null,
            image_url: artist.image_url,
            location: [artist.city, artist.country]
              .filter(Boolean)
              .join(', ') || null,
            bio: artist.bio,
            source: 'lead_generator',
            other_socials: artist.social_links || {},
            tags: [],
          })
          .select()
          .single()

        if (artistError) {
          // Might be duplicate — try to find existing
          const { data: existingArtist } = await supabase
            .from('artists')
            .select('id')
            .eq('soundcloud_url', artist.url)
            .single()

          if (existingArtist) {
            skipped++
          } else {
            throw artistError
          }
        } else {
          // Create pipeline entry
          await createEntry.mutateAsync({
            artistId: newArtist.id,
            stage: importStage,
          })
          imported++
        }
      } catch {
        failed++
      }

      setImportProgress({ done: i + 1, total: selected.length })
    }

    setImportResults({ imported, skipped, failed })
    setStep('done')
  }

  // --- Step metadata for header ---

  const STEP_META: Record<Step, { label: string; num: number }> = {
    config: { label: 'Configure', num: 1 },
    discovering: { label: 'Discovering', num: 2 },
    results: { label: 'Select Artists', num: 2 },
    scraping: { label: 'Scraping', num: 3 },
    review: { label: 'Review & Import', num: 3 },
    importing: { label: 'Importing', num: 4 },
    done: { label: 'Complete', num: 4 },
  }

  const stepLabels = ['Configure', 'Discover', 'Scrape', 'Import']
  const currentStepNum = STEP_META[step].num

  // --- Render ---

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-3 z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-modal">
        {/* ── Header ── */}
        <div className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 px-6 py-5">
          <div className="relative flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {STEP_META[step].label}
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                SoundCloud Artist Discovery
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step indicator */}
          <div className="relative mt-4 flex items-center gap-1">
            {stepLabels.map((label, i) => {
              const stepNum = i + 1
              const isActive = stepNum === currentStepNum
              const isComplete = stepNum < currentStepNum
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full items-center">
                    <div
                      className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                        isComplete
                          ? 'bg-[#ff5500]'
                          : isActive
                            ? 'bg-gradient-to-r from-[#ff5500] to-[#ff5500]/30'
                            : 'bg-white/10'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-wide uppercase transition-colors ${
                      isActive
                        ? 'text-[#ff5500]'
                        : isComplete
                          ? 'text-gray-400'
                          : 'text-gray-600'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Step: Config */}
          {step === 'config' && (
            <div className="p-6">
              {discoveryError && (
                <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {discoveryError}
                </div>
              )}

              {/* Seed URL — hero input */}
              <div className="mb-6">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Seed Artist
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                    <svg className="h-5 w-5 text-[#ff5500]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.56 3.637c.28-.067.574-.1.878-.1h.003c4.116.012 7.559 3.97 7.559 8.898 0 .118-.003.237-.008.355-.026.597-.51 1.06-1.106 1.06h-.002c-.597-.001-1.08-.49-1.056-1.088.004-.109.006-.218.006-.327 0-3.714-2.378-6.74-5.396-6.895v7.22c0 2.69-2.242 4.924-5.117 5.229a5.32 5.32 0 01-.57.031c-2.857 0-5.207-2.171-5.383-4.935A5.045 5.045 0 011.36 13c0-2.793 2.306-5.064 5.145-5.064.447 0 .882.057 1.295.163v5.148c0 .268.1.51.264.69a.964.964 0 00.718.315c.057 0 .114-.005.169-.015a2.86 2.86 0 001.933-1.087c.41-.523.657-1.175.657-1.88V3.637h.02z"/>
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={seedUrl}
                    onChange={(e) => setSeedUrl(e.target.value)}
                    placeholder="https://soundcloud.com/artist-name"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm font-medium text-gray-900 shadow-sm placeholder:text-gray-400 transition-all focus:border-[#ff5500]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Paste a SoundCloud profile URL — we'll find similar artists
                </p>
              </div>

              {/* Genre pills */}
              <div className="mb-6">
                <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Genre Filter
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-gray-300">
                    optional
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((genre) => {
                    const active = selectedGenres.includes(genre)
                    return (
                      <button
                        key={genre}
                        onClick={() => toggleGenre(genre)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          active
                            ? 'bg-[#ff5500] text-white shadow-sm shadow-[#ff5500]/25'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                        }`}
                      >
                        {genre}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Min Followers
                  </label>
                  <input
                    type="number"
                    value={minFollowers}
                    onChange={(e) => setMinFollowers(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Max Followers
                  </label>
                  <input
                    type="number"
                    value={maxFollowers}
                    onChange={(e) => setMaxFollowers(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Upload Recency
                  </label>
                  <select
                    value={uploadRecency}
                    onChange={(e) => setUploadRecency(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
                  >
                    {UPLOAD_RECENCY.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Max Results
                  </label>
                  <input
                    type="number"
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    min={1}
                    max={500}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-2 focus:ring-[#ff5500]/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Discovering */}
          {step === 'discovering' && (
            <div className="flex flex-col items-center justify-center py-20">
              {/* Animated rings */}
              <div className="relative mb-8">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#ff5500]/10" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-2 animate-ping rounded-full bg-[#ff5500]/15" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#ff5500] to-amber-500 shadow-lg shadow-[#ff5500]/25">
                  <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Scanning SoundCloud
              </h3>
              <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
                Searching related artists, followings, followers, and genre tags
                for artists similar to your seed profile
              </p>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff5500]" />
                This usually takes 10-30 seconds
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && (
            <div className="flex flex-col">
              {/* Stats strip */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-3">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ff5500]/10">
                      <span className="text-sm font-bold text-[#ff5500]">{filteredCount}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      found from {totalFound} scanned
                    </div>
                  </div>
                  {pipelineCount > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                        <span className="text-sm font-bold text-amber-600">{pipelineCount}</span>
                      </div>
                      <div className="text-xs text-gray-500">already in<br />pipeline</div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                      <span className="text-sm font-bold text-emerald-600">{filteredCount - pipelineCount}</span>
                    </div>
                    <div className="text-xs text-gray-500">new leads</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllLeads}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllLeads}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <div className="ml-2 rounded-lg bg-[#ff5500]/10 px-3 py-1.5 text-xs font-semibold text-[#ff5500]">
                    {selectedLeadCount} selected
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="w-10 px-4 py-2.5" />
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Artist
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Followers
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Tracks
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Genre
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveredLeads.map((lead, i) => (
                      <tr
                        key={i}
                        className={`group border-b border-gray-50 transition-colors ${
                          lead.already_in_pipeline
                            ? 'bg-amber-50/50'
                            : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={lead.selected}
                            disabled={lead.already_in_pipeline}
                            onChange={() => toggleLeadSelect(i)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#ff5500] focus:ring-[#ff5500]/30"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {lead.avatar_url ? (
                              <img
                                src={lead.avatar_url}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-xs font-bold text-gray-500">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <a
                                href={lead.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-sm font-medium text-gray-900 transition-colors hover:text-[#ff5500]"
                              >
                                {lead.name}
                              </a>
                              {lead.already_in_pipeline && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                                  In pipeline
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                          {lead.followers.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                          {lead.track_count}
                        </td>
                        <td className="px-4 py-2.5">
                          {lead.genre && (
                            <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              {lead.genre}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">
                          {[lead.city, lead.country].filter(Boolean).join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Scraping progress */}
          {step === 'scraping' && (
            <div className="space-y-6 py-8 text-center">
              <div>
                <div className="mb-2 font-mono text-2xl font-bold text-gray-900">
                  {scrapeProgress.done} / {scrapeProgress.total}
                </div>
                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full bg-[#ff5500] transition-all"
                    style={{ width: `${scrapeProgress.total ? (scrapeProgress.done / scrapeProgress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-400">ETA: {scrapeProgress.eta}</div>
              </div>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <div className="font-mono text-lg font-bold text-emerald-600">{scrapeProgress.emailsFound}</div>
                  <div className="text-gray-400">Emails Found</div>
                </div>
                <div>
                  <div className="font-mono text-lg font-bold text-gray-400">{scrapeProgress.done - scrapeProgress.emailsFound}</div>
                  <div className="text-gray-400">No Email</div>
                </div>
              </div>
              {liveFeed.length > 0 && (
                <div ref={feedRef} className="mx-auto max-w-md max-h-40 overflow-y-auto rounded-lg bg-gray-50 p-3 text-left text-xs">
                  {liveFeed.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className={item.hasEmail ? 'text-emerald-500' : 'text-gray-300'}>{item.hasEmail ? '✓' : '✗'}</span>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="flex flex-col">
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllWithEmails}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    Select With Emails
                  </button>
                  <button
                    onClick={deselectAllScraped}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={downloadCsv}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    CSV
                  </button>
                  <div className="mx-2 h-4 w-px bg-gray-200" />
                  <label className="text-xs text-gray-500">Stage:</label>
                  <select
                    value={importStage}
                    onChange={(e) =>
                      setImportStage(e.target.value as PipelineStage)
                    }
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-[#ff5500]/50 focus:outline-none focus:ring-1 focus:ring-[#ff5500]/20"
                  >
                    <option value="discovered">Discovered</option>
                    <option value="contacted">Contacted</option>
                    <option value="responded">Responded</option>
                  </select>
                </div>
                <div className="rounded-lg bg-[#ff5500]/10 px-3 py-1.5 text-xs font-semibold text-[#ff5500]">
                  {selectedScrapedCount} selected
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="w-10 px-4 py-2.5" />
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Artist
                      </th>
                      <th className="min-w-[200px] px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Email
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Followers
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Links
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrapedLeads.map((artist, i) => (
                      <tr
                        key={i}
                        className={`group border-b border-gray-50 transition-colors ${
                          artist.isDuplicate
                            ? 'bg-amber-50/50'
                            : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={artist.selected}
                            disabled={artist.isDuplicate}
                            onChange={() => toggleScrapedSelect(i)}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-[#ff5500] focus:ring-[#ff5500]/30"
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            {(artist.image_url || artist.avatar_url) ? (
                              <img
                                src={artist.image_url || artist.avatar_url || ''}
                                alt=""
                                className="h-8 w-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-xs font-bold text-gray-500">
                                {artist.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-gray-900">
                                {artist.name}
                              </div>
                              {artist.isDuplicate && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                                  {artist.duplicateNote}
                                </span>
                              )}
                              {!artist.isDuplicate && artist.genre && (
                                <span className="text-[11px] text-gray-400">
                                  {artist.genre}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="email"
                            value={artist.editedEmail}
                            onChange={(e) => updateEmail(i, e.target.value)}
                            placeholder="No email found"
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-700 shadow-sm transition-all placeholder:text-gray-300 focus:border-[#ff5500]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ff5500]/20"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-500">
                          {artist.followers?.toLocaleString() ?? '-'}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            {artist.url && (
                              <a
                                href={artist.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-[#ff5500]/10 text-[10px] font-bold text-[#ff5500] transition-colors hover:bg-[#ff5500] hover:text-white"
                                title="SoundCloud"
                              >
                                SC
                              </a>
                            )}
                            {artist.instagram_handle && (
                              <a
                                href={`https://instagram.com/${artist.instagram_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-pink-50 text-[10px] font-bold text-pink-500 transition-colors hover:bg-pink-500 hover:text-white"
                                title="Instagram"
                              >
                                IG
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-4xl font-bold tracking-tight text-gray-900">
                {importProgress.done}
                <span className="text-gray-300"> / </span>
                <span className="text-gray-400">{importProgress.total}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">artists imported</p>
              <div className="mx-auto mt-6 w-full max-w-md">
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{
                      width: `${(importProgress.done / importProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Adding artists to your pipeline...
              </p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-16">
              {/* Success icon */}
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">
                Import Complete
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Artists have been added to your pipeline
              </p>

              {/* Stats */}
              <div className="mt-8 flex gap-4">
                <div className="flex flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 px-8 py-4">
                  <span className="text-2xl font-bold text-emerald-600">
                    {importResults.imported}
                  </span>
                  <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-emerald-500">
                    Imported
                  </span>
                </div>
                {importResults.skipped > 0 && (
                  <div className="flex flex-col items-center rounded-xl border border-amber-200 bg-amber-50 px-8 py-4">
                    <span className="text-2xl font-bold text-amber-600">
                      {importResults.skipped}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-amber-500">
                      Skipped
                    </span>
                  </div>
                )}
                {importResults.failed > 0 && (
                  <div className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-8 py-4">
                    <span className="text-2xl font-bold text-red-600">
                      {importResults.failed}
                    </span>
                    <span className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-red-500">
                      Failed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {step === 'config' && (
            <button
              onClick={handleDiscover}
              disabled={!seedUrl.includes('soundcloud.com')}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ff5500]/25 transition-all hover:shadow-md hover:shadow-[#ff5500]/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Discover Artists
            </button>
          )}

          {step === 'results' && (
            <button
              onClick={handleScrape}
              disabled={selectedLeadCount === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff5500] to-amber-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#ff5500]/25 transition-all hover:shadow-md hover:shadow-[#ff5500]/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              Scrape Selected ({selectedLeadCount})
            </button>
          )}

          {step === 'review' && (
            <button
              onClick={handleImport}
              disabled={selectedScrapedCount === 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-500/25 transition-all hover:shadow-md hover:shadow-emerald-500/30 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 disabled:shadow-none"
            >
              Import {selectedScrapedCount} Artists
            </button>
          )}
        </div>
      </div>
    </>
  )
}
