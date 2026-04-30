import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import type { DedupData } from '@/lib/dedup'
import type { PipelineStage } from '@/types'
import type {
  Step,
  DiscoveredLead,
  FilterStats,
  ScrapedLead,
} from './leadGeneratorTypes'
import {
  discoverArtists,
  scrapeArtists,
  importArtists,
  downloadLeadsCsv,
} from './leadGeneratorActions'

export function useLeadGenerator() {
  const createEntry = useCreatePipelineEntry()
  const dedupRef = useRef<DedupData | null>(null)

  const [step, setStep] = useState<Step>('config')

  const [seedUrl, setSeedUrl] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [minFollowers, setMinFollowers] = useState(2000)
  const [maxFollowers, setMaxFollowers] = useState(50000)
  const [uploadRecency, setUploadRecency] = useState(0)
  const [maxResults, setMaxResults] = useState(100)

  const [discoveredLeads, setDiscoveredLeads] = useState<DiscoveredLead[]>([])
  const [totalFound, setTotalFound] = useState(0)
  const [excludedCount, setExcludedCount] = useState(0)
  const [filterStats, setFilterStats] = useState<FilterStats | null>(null)
  const [discoveryError, setDiscoveryError] = useState('')

  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([])
  const [scrapeProgress, setScrapeProgress] = useState({
    done: 0,
    total: 0,
    emailsFound: 0,
    eta: '',
  })

  const [liveFeed, setLiveFeed] = useState<Array<{ name: string; hasEmail: boolean }>>([])
  const feedRef = useRef<HTMLDivElement>(null)

  const [importStage, setImportStage] = useState<PipelineStage>('discovered')
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importResults, setImportResults] = useState({
    imported: 0,
    skipped: 0,
    failed: 0,
  })

  const [excludingIndex, setExcludingIndex] = useState<number | null>(null)

  function toggleGenre(genre: string): void {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre]
    )
  }

  async function handleDiscover(): Promise<void> {
    setStep('discovering')
    setDiscoveryError('')

    try {
      const result = await discoverArtists({
        seedUrl,
        minFollowers,
        maxFollowers,
        selectedGenres,
        uploadRecency,
        maxResults,
      })

      dedupRef.current = result.dedup
      setExcludedCount(result.excluded)
      setDiscoveredLeads(result.leads)
      setTotalFound(result.totalFound)
      setFilterStats(result.filterStats)
      setStep('results')
    } catch (err) {
      setDiscoveryError(
        err instanceof Error ? err.message : 'Discovery failed'
      )
      setStep('config')
    }
  }

  function toggleLeadSelect(index: number): void {
    setDiscoveredLeads((prev) =>
      prev.map((l, i) =>
        i === index ? { ...l, selected: !l.selected } : l
      )
    )
  }

  function selectAllLeads(): void {
    setDiscoveredLeads((prev) =>
      prev.map((l) => ({ ...l, selected: true }))
    )
  }

  function deselectAllLeads(): void {
    setDiscoveredLeads((prev) => prev.map((l) => ({ ...l, selected: false })))
  }

  const selectedLeadCount = discoveredLeads.filter((l) => l.selected).length
  const newLeadCount = discoveredLeads.length

  async function handleExcludeLead(index: number): Promise<void> {
    const lead = discoveredLeads[index]
    if (!lead) return

    setExcludingIndex(index)
    try {
      await supabase.from('excluded_artists').insert({
        artist_name: lead.name,
        email: null,
        artist_id: null,
        reason: 'not_interested',
        notes: `Excluded from discovery (seed: ${seedUrl})`,
      })
      setDiscoveredLeads((prev) => prev.filter((_, i) => i !== index))
      setExcludedCount((prev) => prev + 1)
    } catch (err) {
      console.error('Failed to exclude artist:', err)
    } finally {
      setExcludingIndex(null)
    }
  }

  async function handleScrape(): Promise<void> {
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

    const scraped = await scrapeArtists(
      selected,
      dedupRef.current,
      {
        onProgress: (done, emailsFound, eta) => {
          setScrapeProgress({ done, total: selected.length, emailsFound, eta })
        },
        onFeedItem: (name, hasEmail) => {
          setLiveFeed((prev) => [...prev, { name, hasEmail }])
        },
      },
    )

    setScrapedLeads(scraped)
    setStep('review')
  }

  function toggleScrapedSelect(index: number): void {
    setScrapedLeads((prev) =>
      prev.map((r, i) =>
        i === index && !r.isDuplicate ? { ...r, selected: !r.selected } : r
      )
    )
  }

  function selectAllWithEmails(): void {
    setScrapedLeads((prev) =>
      prev.map((r) =>
        !r.isDuplicate && r.editedEmail ? { ...r, selected: true } : r
      )
    )
  }

  function deselectAllScraped(): void {
    setScrapedLeads((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  function updateEmail(index: number, email: string): void {
    setScrapedLeads((prev) =>
      prev.map((r, i) => (i === index ? { ...r, editedEmail: email } : r))
    )
  }

  const selectedScrapedCount = scrapedLeads.filter((r) => r.selected).length

  function downloadCsv(): void {
    downloadLeadsCsv(scrapedLeads)
  }

  async function handleImport(): Promise<void> {
    const selected = scrapedLeads.filter((r) => r.selected)
    if (selected.length === 0) return

    setStep('importing')
    setImportProgress({ done: 0, total: selected.length })

    const results = await importArtists(
      selected,
      importStage,
      createEntry,
      {
        onProgress: (done, total) => {
          setImportProgress({ done, total })
        },
      },
    )

    setImportResults(results)
    setStep('done')
  }

  const currentStepNum = (
    {
      config: 1,
      discovering: 2,
      results: 2,
      scraping: 3,
      review: 3,
      importing: 4,
      done: 4,
    } as const
  )[step]

  return {
    step,
    seedUrl,
    setSeedUrl,
    selectedGenres,
    toggleGenre,
    minFollowers,
    setMinFollowers,
    maxFollowers,
    setMaxFollowers,
    uploadRecency,
    setUploadRecency,
    maxResults,
    setMaxResults,
    discoveredLeads,
    totalFound,
    excludedCount,
    filterStats,
    discoveryError,
    scrapedLeads,
    scrapeProgress,
    liveFeed,
    feedRef,
    importStage,
    setImportStage,
    importProgress,
    importResults,
    excludingIndex,
    handleDiscover,
    toggleLeadSelect,
    selectAllLeads,
    deselectAllLeads,
    handleExcludeLead,
    handleScrape,
    toggleScrapedSelect,
    selectAllWithEmails,
    deselectAllScraped,
    updateEmail,
    downloadCsv,
    handleImport,
    selectedLeadCount,
    newLeadCount,
    selectedScrapedCount,
    currentStepNum,
  }
}
