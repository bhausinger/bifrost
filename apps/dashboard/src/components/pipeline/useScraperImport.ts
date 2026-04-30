import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { env } from '@/lib/env'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import { fetchDedupData, checkDuplicate } from '@/lib/dedup'
import type {
  Step,
  ScrapedArtist,
  ScrapeProgress,
  ImportProgress,
  ImportResults,
  PipelineStage,
} from './scraperTypes'

const SCRAPER_URL = env.VITE_SCRAPER_URL

export function useScraperImport() {
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
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    done: 0,
    total: 0,
  })
  const [importResults, setImportResults] = useState<ImportResults>({
    imported: 0,
    skipped: 0,
    failed: 0,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>): void {
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
      .filter(
        (u) =>
          u.length > 0 &&
          (u.startsWith('http') || u.includes('soundcloud.com'))
      )
  }

  async function handleScrape(): Promise<void> {
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

    const dedup = await fetchDedupData()

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i]!
      const elapsed = Date.now() - startTime
      const perItem = elapsed / (i + 1)
      const remaining = Math.round(
        (perItem * (urlList.length - i - 1)) / 1000
      )
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

        const reason = checkDuplicate(
          dedup,
          url,
          data.email,
          data.name,
          data.bio
        )
        const isFlagged = !!reason

        scraped.push({
          name: data.name || (url.split('/').pop() ?? 'Unknown'),
          email: data.email ?? null,
          spotify_url: data.spotify_url ?? null,
          soundcloud_url: url,
          instagram_handle: data.instagram ?? null,
          genres: data.genres || [],
          track_count: data.track_count || null,
          follower_count: data.followers || null,
          image_url: data.image_url || null,
          source: 'scraper',
          selected: !isFlagged && !!data.email,
          editedEmail: data.email || '',
          isDuplicate: isFlagged,
          duplicateNote: reason ?? '',
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

  function toggleSelect(index: number): void {
    setResults((prev) =>
      prev.map((r, i) =>
        i === index && !r.isDuplicate ? { ...r, selected: !r.selected } : r
      )
    )
  }

  function selectAllWithEmails(): void {
    setResults((prev) =>
      prev.map((r) =>
        !r.isDuplicate && r.editedEmail ? { ...r, selected: true } : r
      )
    )
  }

  function deselectAll(): void {
    setResults((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  function updateEmail(index: number, email: string): void {
    setResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, editedEmail: email } : r))
    )
  }

  async function handleImport(): Promise<void> {
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
        const { data: newArtist, error: artistError } = await supabase
          .from('artists')
          .insert({
            name: artist.name,
            email: artist.editedEmail || null,
            spotify_url: artist.spotify_url,
            soundcloud_url: artist.soundcloud_url,
            instagram_handle: artist.instagram_handle,
            genres: artist.genres,
            track_count: artist.track_count,
            follower_count: artist.follower_count,
            image_url: artist.image_url,
            source: artist.source,
            other_socials: {},
            tags: [],
          })
          .select()
          .single()

        if (artistError) {
          const { data: existing } = await supabase
            .from('artists')
            .select('id')
            .eq('soundcloud_url', artist.soundcloud_url ?? '')
            .single()

          if (existing) {
            skipped++
          } else {
            throw artistError
          }
        } else {
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

  function downloadCsv(): void {
    const headers = ['Name', 'Email', 'SoundCloud URL', 'Genres', 'Followers']
    const rows = results.map((r) => [
      r.name,
      r.editedEmail,
      r.soundcloud_url || '',
      r.genres.join('; '),
      String(r.follower_count ?? ''),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scraper-results-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedCount = results.filter((r) => r.selected).length

  return {
    step,
    urls,
    setUrls,
    results,
    progress,
    importStage,
    setImportStage,
    importProgress,
    importResults,
    fileInputRef,
    handleFileUpload,
    parseUrls,
    handleScrape,
    toggleSelect,
    selectAllWithEmails,
    deselectAll,
    updateEmail,
    handleImport,
    downloadCsv,
    selectedCount,
  }
}
