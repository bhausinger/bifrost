import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
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
      const res = await fetch(`${SCRAPER_URL}/api/discovery/discover`, {
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

      // Duplicate detection
      const { data: existing } = await supabase
        .from('artists')
        .select('soundcloud_url')
      const existingUrls = new Set(
        (existing ?? [])
          .map((a) => a.soundcloud_url?.toLowerCase())
          .filter(Boolean)
      )

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
          const alreadyInPipeline = existingUrls.has(r.url?.toLowerCase())
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
    setScrapeProgress({
      done: 0,
      total: selected.length,
      emailsFound: 0,
      eta: 'Calculating...',
    })

    const scraped: ScrapedLead[] = []
    const startTime = Date.now()

    // Check existing artists for duplicate detection
    const { data: existing } = await supabase
      .from('artists')
      .select('soundcloud_url, spotify_url, email')
    const existingUrls = new Set(
      (existing ?? []).flatMap((a) => {
        const urls: string[] = []
        if (a.soundcloud_url) urls.push(a.soundcloud_url.toLowerCase())
        if (a.spotify_url) urls.push(a.spotify_url.toLowerCase())
        return urls
      })
    )

    // Check excluded emails
    const { data: excluded } = await supabase
      .from('excluded_artists')
      .select('email')
    const excludedEmails = new Set(
      (excluded ?? []).map((e) => e.email?.toLowerCase()).filter(Boolean)
    )

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
        const response = await fetch(`${SCRAPER_URL}/api/soundcloud/scrape`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: lead.url }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()

        const isDuplicate = existingUrls.has(lead.url.toLowerCase())
        const isExcluded =
          data.email && excludedEmails.has(data.email.toLowerCase())

        scraped.push({
          ...lead,
          email: data.email ?? null,
          editedEmail: data.email || '',
          spotify_url: data.spotify_url ?? null,
          instagram_handle: data.instagram ?? null,
          image_url: data.image_url || lead.avatar_url,
          bio: data.bio ?? null,
          social_links: data.social_links ?? {},
          isDuplicate,
          isBlocked: false, // Will be set after blocked terms check
          duplicateNote: isDuplicate
            ? 'Already in pipeline'
            : isExcluded
              ? 'Excluded'
              : '',
          selected: !isDuplicate && !isExcluded && !!data.email,
          followers: data.followers ?? lead.followers,
          track_count: data.track_count ?? lead.track_count,
        })

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

        setScrapeProgress((p) => ({
          ...p,
          done: i + 1,
          eta,
        }))
      }
    }

    // Blocked terms filtering
    const { data: blockedTerms } = await supabase
      .from('blocked_terms')
      .select('term, type')

    if (blockedTerms && blockedTerms.length > 0) {
      for (const lead of scraped) {
        const nameLC = lead.name.toLowerCase()
        const emailLC = (lead.email || '').toLowerCase()
        const bioLC = (lead.bio || '').toLowerCase()

        for (const bt of blockedTerms) {
          const term = bt.term.toLowerCase()
          if (
            nameLC.includes(term) ||
            emailLC.includes(term) ||
            bioLC.includes(term)
          ) {
            lead.isBlocked = true
            lead.isDuplicate = true // reuse duplicate styling
            lead.duplicateNote = `Blocked term: ${bt.term}`
            lead.selected = false
            break
          }
        }
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

  // --- Render ---

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-4 z-50 mx-auto flex max-w-4xl flex-col rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'config' && 'Lead Generator'}
            {step === 'discovering' && 'Discovering...'}
            {step === 'results' && `Discovery Results (${filteredCount} found)`}
            {step === 'scraping' && 'Scraping Artists...'}
            {step === 'review' && `Review (${scrapedLeads.length} scraped)`}
            {step === 'importing' && 'Importing...'}
            {step === 'done' && 'Import Complete'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step: Config */}
          {step === 'config' && (
            <div className="space-y-5">
              {discoveryError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {discoveryError}
                </div>
              )}

              {/* Seed URL */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Seed Artist SoundCloud URL
                </label>
                <input
                  type="text"
                  value={seedUrl}
                  onChange={(e) => setSeedUrl(e.target.value)}
                  placeholder="https://soundcloud.com/artist-name"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              {/* Genre pills */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Genres (optional filter)
                </label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        selectedGenres.includes(genre)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follower range */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Min Followers
                  </label>
                  <input
                    type="number"
                    value={minFollowers}
                    onChange={(e) => setMinFollowers(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Max Followers
                  </label>
                  <input
                    type="number"
                    value={maxFollowers}
                    onChange={(e) => setMaxFollowers(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Upload recency */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Upload Recency
                </label>
                <select
                  value={uploadRecency}
                  onChange={(e) => setUploadRecency(Number(e.target.value))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  {UPLOAD_RECENCY.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max results */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Max Results
                </label>
                <input
                  type="number"
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  min={1}
                  max={500}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Step: Discovering */}
          {step === 'discovering' && (
            <div className="space-y-4 py-12 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <div className="text-sm text-gray-600">
                Discovering artists similar to{' '}
                <span className="font-medium text-gray-900">{seedUrl}</span>...
              </div>
              <div className="text-xs text-gray-400">
                This may take a minute depending on the number of results
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && (
            <div className="space-y-4">
              {/* Stats bar */}
              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-sm font-medium text-gray-700">
                  {filteredCount} found from {totalFound} candidates
                </div>
                <div className="mt-1 flex gap-4 text-xs text-gray-500">
                  <span>{pipelineCount} already in pipeline</span>
                  <span>
                    {filteredCount - pipelineCount} new leads
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={selectAllLeads}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllLeads}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {selectedLeadCount} selected
                </span>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Artist
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Followers
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Tracks
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Genre
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Location
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {discoveredLeads.map((lead, i) => (
                      <tr
                        key={i}
                        className={`border-t border-gray-100 ${
                          lead.already_in_pipeline ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={lead.selected}
                            disabled={lead.already_in_pipeline}
                            onChange={() => toggleLeadSelect(i)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {lead.avatar_url && (
                              <img
                                src={lead.avatar_url}
                                alt=""
                                className="h-7 w-7 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <a
                                href={lead.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                              >
                                {lead.name}
                              </a>
                              {lead.already_in_pipeline && (
                                <span className="ml-2 inline-block rounded bg-yellow-200 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800">
                                  Already in pipeline
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {lead.followers.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {lead.track_count}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {lead.genre}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
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
                <div className="mb-2 text-2xl font-bold text-gray-900">
                  {scrapeProgress.done} / {scrapeProgress.total}
                </div>
                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${(scrapeProgress.done / scrapeProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  ETA: {scrapeProgress.eta}
                </div>
              </div>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {scrapeProgress.emailsFound}
                  </div>
                  <div className="text-gray-500">Emails Found</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">
                    {scrapeProgress.done}
                  </div>
                  <div className="text-gray-500">Scraped</div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={selectAllWithEmails}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Select All With Emails
                  </button>
                  <button
                    onClick={deselectAllScraped}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={downloadCsv}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Download CSV
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {selectedScrapedCount} selected
                </span>
              </div>

              {/* Import options */}
              <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                <label className="text-sm text-gray-600">
                  Import to stage:
                </label>
                <select
                  value={importStage}
                  onChange={(e) =>
                    setImportStage(e.target.value as PipelineStage)
                  }
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  <option value="discovered">Discovered</option>
                  <option value="contacted">Contacted</option>
                  <option value="responded">Responded</option>
                </select>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="w-8 px-3 py-2" />
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Artist
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Followers
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">
                        Links
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scrapedLeads.map((artist, i) => (
                      <tr
                        key={i}
                        className={`border-t border-gray-100 ${
                          artist.isDuplicate ? 'bg-yellow-50' : ''
                        }`}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={artist.selected}
                            disabled={artist.isDuplicate}
                            onChange={() => toggleScrapedSelect(i)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">
                            {artist.name}
                          </div>
                          {artist.isDuplicate && (
                            <div className="text-xs text-yellow-600">
                              {artist.duplicateNote}
                            </div>
                          )}
                          {artist.genre && (
                            <div className="text-xs text-gray-400">
                              {artist.genre}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="email"
                            value={artist.editedEmail}
                            onChange={(e) => updateEmail(i, e.target.value)}
                            placeholder="No email found"
                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {artist.followers?.toLocaleString() ?? '-'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5">
                            {artist.url && (
                              <a
                                href={artist.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-500 hover:underline"
                              >
                                SC
                              </a>
                            )}
                            {artist.instagram_handle && (
                              <a
                                href={`https://instagram.com/${artist.instagram_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-pink-500 hover:underline"
                              >
                                IG
                              </a>
                            )}
                            {artist.spotify_url && (
                              <a
                                href={artist.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-green-500 hover:underline"
                              >
                                SP
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
            <div className="py-8 text-center">
              <div className="mb-2 text-2xl font-bold text-gray-900">
                {importProgress.done} / {importProgress.total}
              </div>
              <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{
                    width: `${(importProgress.done / importProgress.total) * 100}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Importing artists to pipeline...
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && (
            <div className="space-y-4 py-8 text-center">
              <div className="rounded-md bg-green-50 p-6">
                <div className="text-lg font-medium text-green-700">
                  Import Complete
                </div>
                <div className="mt-3 flex justify-center gap-8 text-sm">
                  <div>
                    <div className="text-lg font-bold text-green-600">
                      {importResults.imported}
                    </div>
                    <div className="text-gray-500">Imported</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">
                      {importResults.skipped}
                    </div>
                    <div className="text-gray-500">Skipped</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">
                      {importResults.failed}
                    </div>
                    <div className="text-gray-500">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>

          {step === 'config' && (
            <button
              onClick={handleDiscover}
              disabled={!seedUrl.includes('soundcloud.com')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              Discover
            </button>
          )}

          {step === 'results' && (
            <button
              onClick={handleScrape}
              disabled={selectedLeadCount === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              Scrape Selected ({selectedLeadCount})
            </button>
          )}

          {step === 'review' && (
            <button
              onClick={handleImport}
              disabled={selectedScrapedCount === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
            >
              Import Selected ({selectedScrapedCount})
            </button>
          )}
        </div>
      </div>
    </>
  )
}
