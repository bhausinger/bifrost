import { useState, useRef } from 'react'
import { useCreatePipelineEntry } from '@/hooks/usePipeline'
import type { DedupData } from '@/lib/dedup'
import type { PipelineStage } from '@/types'
import type { ScSearchStep, SearchMatch, ScrapedResult } from './scSearchTypes'
import { batchSearch, scrapeMatches, importMatches, downloadSearchCsv } from './scSearchActions'

export function useScSearch() {
  const createEntry = useCreatePipelineEntry()
  const dedupRef = useRef<DedupData | null>(null)

  const [step, setStep] = useState<ScSearchStep>('input')
  const [rawInput, setRawInput] = useState('')
  const [searchError, setSearchError] = useState('')

  const [searchResults, setSearchResults] = useState<SearchMatch[]>([])
  const [searchStats, setSearchStats] = useState({ total: 0, matched: 0, unmatched: 0 })

  const [scrapedResults, setScrapedResults] = useState<ScrapedResult[]>([])
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
  const [importResults, setImportResults] = useState({ imported: 0, skipped: 0, failed: 0 })

  const parsedNames = rawInput
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  async function handleSearch(): Promise<void> {
    if (parsedNames.length === 0) return
    setStep('searching')
    setSearchError('')

    try {
      const { results, dedup } = await batchSearch(parsedNames)
      dedupRef.current = dedup
      setSearchResults(results)
      setSearchStats({
        total: results.length,
        matched: results.filter((r) => r.match !== null).length,
        unmatched: results.filter((r) => r.match === null).length,
      })
      setStep('results')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed')
      setStep('input')
    }
  }

  function toggleResultSelect(index: number): void {
    setSearchResults((prev) =>
      prev.map((r, i) => (i === index && r.match ? { ...r, selected: !r.selected } : r)),
    )
  }

  function selectAllMatched(): void {
    setSearchResults((prev) => prev.map((r) => (r.match ? { ...r, selected: true } : r)))
  }

  function deselectAll(): void {
    setSearchResults((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  function pickAlternative(resultIndex: number, altIndex: number): void {
    setSearchResults((prev) =>
      prev.map((r, i) => {
        if (i !== resultIndex) return r
        const alt = r.alternatives[altIndex]
        if (!alt) return r
        const { confidence: _, ...altMatch } = alt
        return {
          ...r,
          match: altMatch,
          confidence: alt.confidence,
          selected: true,
          alternatives: [
            ...(r.match ? [{ ...r.match, confidence: r.confidence }] : []),
            ...r.alternatives.filter((__, j) => j !== altIndex),
          ],
        }
      }),
    )
  }

  const selectedResultCount = searchResults.filter((r) => r.selected).length

  async function handleScrape(): Promise<void> {
    const selected = searchResults.filter((r) => r.selected && r.match)
    if (selected.length === 0) return

    setStep('scraping')
    setLiveFeed([])
    setScrapeProgress({ done: 0, total: selected.length, emailsFound: 0, eta: 'Calculating...' })

    const scraped = await scrapeMatches(selected, dedupRef.current, {
      onProgress: (done, emailsFound, eta) => {
        setScrapeProgress({ done, total: selected.length, emailsFound, eta })
      },
      onFeedItem: (name, hasEmail) => {
        setLiveFeed((prev) => [...prev, { name, hasEmail }])
      },
    })

    setScrapedResults(scraped)
    setStep('review')
  }

  function toggleScrapedSelect(index: number): void {
    setScrapedResults((prev) =>
      prev.map((r, i) => (i === index && !r.isDuplicate ? { ...r, selected: !r.selected } : r)),
    )
  }

  function selectAllWithEmails(): void {
    setScrapedResults((prev) =>
      prev.map((r) => (!r.isDuplicate && r.editedEmail ? { ...r, selected: true } : r)),
    )
  }

  function deselectAllScraped(): void {
    setScrapedResults((prev) => prev.map((r) => ({ ...r, selected: false })))
  }

  function updateEmail(index: number, email: string): void {
    setScrapedResults((prev) =>
      prev.map((r, i) => (i === index ? { ...r, editedEmail: email } : r)),
    )
  }

  const selectedScrapedCount = scrapedResults.filter((r) => r.selected).length

  function downloadCsv(): void {
    downloadSearchCsv(scrapedResults)
  }

  async function handleImport(): Promise<void> {
    const selected = scrapedResults.filter((r) => r.selected)
    if (selected.length === 0) return

    setStep('importing')
    setImportProgress({ done: 0, total: selected.length })

    const results = await importMatches(selected, importStage, createEntry, {
      onProgress: (done, total) => setImportProgress({ done, total }),
    })

    setImportResults(results)
    setStep('done')
  }

  function copyResults(): void {
    const lines = searchResults
      .filter((r) => r.match)
      .map((r) => `${r.query}\t${r.match!.name}\t${r.match!.url}\t${r.confidence}`)
    navigator.clipboard.writeText(
      `Query\tMatched Name\tSoundCloud URL\tConfidence\n${lines.join('\n')}`,
    )
  }

  const currentStepNum = (
    {
      input: 1,
      searching: 2,
      results: 2,
      scraping: 3,
      review: 3,
      importing: 4,
      done: 4,
    } as const
  )[step]

  return {
    step,
    rawInput,
    setRawInput,
    parsedNames,
    searchError,
    searchResults,
    searchStats,
    scrapedResults,
    scrapeProgress,
    liveFeed,
    feedRef,
    importStage,
    setImportStage,
    importProgress,
    importResults,
    handleSearch,
    toggleResultSelect,
    selectAllMatched,
    deselectAll,
    pickAlternative,
    selectedResultCount,
    handleScrape,
    toggleScrapedSelect,
    selectAllWithEmails,
    deselectAllScraped,
    updateEmail,
    selectedScrapedCount,
    downloadCsv,
    handleImport,
    copyResults,
    currentStepNum,
  }
}
