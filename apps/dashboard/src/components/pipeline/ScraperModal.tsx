import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import type { PipelineStage } from '@/types'

interface ScraperModalProps {
  onClose: () => void
}

type Step = 'input' | 'scraping' | 'results' | 'importing' | 'done'

interface ScrapedArtist {
  name: string
  email: string | null
  spotify_url: string | null
  soundcloud_url: string | null
  instagram_handle: string | null
  genres: string[]
  monthly_listeners: number | null
  follower_count: number | null
  image_url: string | null
  source: string
  // UI state
  selected: boolean
  editedEmail: string
  isDuplicate: boolean
  duplicateNote: string
}

interface ScrapeProgress {
  total: number
  done: number
  successful: number
  emailsFound: number
  failed: number
  eta: string
}

const SCRAPER_URL = import.meta.env.VITE_SCRAPER_URL || 'http://localhost:9999'

export function ScraperModal({ onClose }: ScraperModalProps) {
  const createEntry = useCreatePipelineEntry()
  const [step, setStep] = useState<Step>('input')
  const [urls, setUrls] = useState('')
  const [results, setResults] = useState<ScrapedArtist[]>([])
  const [progress, setProgress] = useState<ScrapeProgress>({
    total: 0,
    done: 0,
    successful: 0,
    emailsFound: 0,
    failed: 0,
    eta: '',
  })
  const [importStage, setImportStage] = useState<PipelineStage>('discovered')
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importResults, setImportResults] = useState({
    imported: 0,
    skipped: 0,
    failed: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setUrls((prev) => (prev ? prev + '\n' + text : text))
    }
    reader.readAsText(file)
  }

  function parseUrls(): string[] {
    return urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith('http') || u.includes('soundcloud.com')))
  }

  async function handleScrape() {
    const urlList = parseUrls()
    if (urlList.length === 0) return

    setStep('scraping')
    setProgress({
      total: urlList.length,
      done: 0,
      successful: 0,
      emailsFound: 0,
      failed: 0,
      eta: 'Calculating...',
    })

    const scraped: ScrapedArtist[] = []
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

    // Fetch blocked terms
    const { data: blockedTermsData } = await supabase
      .from('blocked_terms')
      .select('term, type')
    const blockedDomains = (blockedTermsData ?? [])
      .filter((t) => t.type === 'email_domain')
      .map((t) => t.term.toLowerCase())
    const blockedNames = (blockedTermsData ?? [])
      .filter((t) => t.type === 'profile_name')
      .map((t) => t.term.toLowerCase())

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i]!
      const elapsed = Date.now() - startTime
      const perItem = elapsed / (i + 1)
      const remaining = Math.round((perItem * (urlList.length - i - 1)) / 1000)
      const eta =
        remaining > 60
          ? `~${Math.round(remaining / 60)}m`
          : `~${remaining}s`

      try {
        const response = await fetch(`${SCRAPER_URL}/scrape/soundcloud`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const data = await response.json()

        const isDuplicate = existingUrls.has(url.toLowerCase())
        const isExcluded = data.email && excludedEmails.has(data.email.toLowerCase())
        const isBlocked =
          (data.email && blockedDomains.some((d: string) => data.email.toLowerCase().split('@')[1]?.includes(d))) ||
          blockedNames.some((n: string) => (data.name || '').toLowerCase().includes(n))
        const isFlagged = isDuplicate || isExcluded || isBlocked

        scraped.push({
          name: data.name || (url.split('/').pop() ?? 'Unknown'),
          email: data.email ?? null,
          spotify_url: data.spotify_url ?? null,
          soundcloud_url: url,
          instagram_handle: data.instagram ?? null,
          genres: data.genres || [],
          monthly_listeners: data.monthly_listeners || null,
          follower_count: data.followers || null,
          image_url: data.image_url || null,
          source: 'scraper',
          selected: !isFlagged && !!data.email,
          editedEmail: data.email || '',
          isDuplicate: isFlagged,
          duplicateNote: isDuplicate
            ? 'Already in pipeline'
            : isExcluded
              ? 'Excluded'
              : isBlocked
                ? 'Blocked'
                : '',
        })

        setProgress((p) => ({
          ...p,
          done: i + 1,
          successful: p.successful + 1,
          emailsFound: p.emailsFound + (data.email ? 1 : 0),
          eta,
        }))
      } catch {
        setProgress((p) => ({
          ...p,
          done: i + 1,
          failed: p.failed + 1,
          eta,
        }))
      }
    }

    setResults(scraped)
    setStep('results')
  }

  function toggleSelect(index: number) {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index && !r.isDuplicate ? { ...r, selected: !r.selected } : r
      )
    )
  }

  function selectAllWithEmails() {
    setResults((prev) =>
      prev.map((r) =>
        !r.isDuplicate && r.editedEmail
          ? { ...r, selected: true }
          : r
      )
    )
  }

  function deselectAll() {
    setResults((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  function updateEmail(index: number, email: string) {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, editedEmail: email } : r))
    )
  }

  async function handleImport() {
    const selected = results.filter((r) => r.selected)
    if (selected.length === 0) return

    setStep('importing')
    setImportProgress({ done: 0, total: selected.length })

    let imported = 0
    let skipped = 0
    let failed = 0

    for (let i = 0; i < selected.length; i++) {
      const artist = selected[i]!
      try {
        // Insert artist
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert({
            name: artist.name,
            email: artist.editedEmail || null,
            spotify_url: artist.spotify_url,
            soundcloud_url: artist.soundcloud_url,
            instagram_handle: artist.instagram_handle,
            genres: artist.genres,
            monthly_listeners: artist.monthly_listeners,
            follower_count: artist.follower_count,
            image_url: artist.image_url,
            source: artist.source,
            other_socials: {},
            tags: [],
          })
          .select()
          .single()

        if (artistError) {
          // Might be duplicate — try to find existing
          const { data: existing } = await supabase
            .from('artists')
            .select('id')
            .eq('soundcloud_url', artist.soundcloud_url)
            .single()

          if (existing) {
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

  function downloadCsv() {
    const headers = ['Name', 'Email', 'SoundCloud URL', 'Genres', 'Followers']
    const rows = results.map((r) => [
      r.name,
      r.editedEmail,
      r.soundcloud_url || '',
      r.genres.join('; '),
      String(r.follower_count ?? ''),
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraper-results-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedCount = results.filter((r) => r.selected).length

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-4 z-50 mx-auto flex max-w-4xl flex-col rounded-lg bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'input' && 'Import from Scraper'}
            {step === 'scraping' && 'Scraping...'}
            {step === 'results' && `Results (${results.length} found)`}
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
          {/* Step: Input */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Paste SoundCloud URLs (one per line)
                </label>
                <textarea
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  rows={12}
                  placeholder={
                    'https://soundcloud.com/artist1\nhttps://soundcloud.com/artist2\nhttps://soundcloud.com/artist3'
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Upload .txt / .csv
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <span className="text-sm text-gray-500">
                  {parseUrls().length} valid URLs
                </span>
              </div>
            </div>
          )}

          {/* Step: Scraping progress */}
          {step === 'scraping' && (
            <div className="space-y-6 py-8 text-center">
              <div>
                <div className="mb-2 text-2xl font-bold text-gray-900">
                  {progress.done} / {progress.total}
                </div>
                <div className="mx-auto h-2 w-full max-w-md overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${(progress.done / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  ETA: {progress.eta}
                </div>
              </div>
              <div className="flex justify-center gap-8 text-sm">
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {progress.successful}
                  </div>
                  <div className="text-gray-500">Successful</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {progress.emailsFound}
                  </div>
                  <div className="text-gray-500">Emails Found</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {progress.failed}
                  </div>
                  <div className="text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === 'results' && (
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
                    onClick={deselectAll}
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
                  {selectedCount} selected
                </span>
              </div>

              {/* Import options */}
              <div className="flex items-center gap-3 rounded-md bg-gray-50 p-3">
                <label className="text-sm text-gray-600">Import to stage:</label>
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
                    {results.map((artist, i) => (
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
                            onChange={() => toggleSelect(i)}
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
                          {artist.genres.length > 0 && (
                            <div className="text-xs text-gray-400">
                              {artist.genres.slice(0, 3).join(', ')}
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
                          {artist.follower_count?.toLocaleString() ?? '-'}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1.5">
                            {artist.soundcloud_url && (
                              <a
                                href={artist.soundcloud_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-500 hover:underline"
                              >
                                SC
                              </a>
                            )}
                            {artist.instagram_handle && (
                              <span className="text-xs text-pink-500">
                                IG
                              </span>
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

          {step === 'input' && (
            <button
              onClick={handleScrape}
              disabled={parseUrls().length === 0}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              Scrape {parseUrls().length} URLs
            </button>
          )}

          {step === 'results' && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-gray-300"
            >
              Import {selectedCount} Artists
            </button>
          )}
        </div>
      </div>
    </>
  )
}
