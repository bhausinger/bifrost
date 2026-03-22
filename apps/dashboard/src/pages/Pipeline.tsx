import { useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Users, TrendingUp, Mail, BarChart3, Download, Send, Search, Wrench } from 'lucide-react'
import { usePipelineEntries, useMoveStage } from '@/hooks/usePipeline'
import { PipelineColumn } from '@/components/pipeline/PipelineColumn'
import { PipelineDetail } from '@/components/pipeline/PipelineDetail'
import { BulkEmailModal } from '@/components/pipeline/BulkEmailModal'
import { ScraperModal } from '@/components/pipeline/ScraperModal'
import { LeadGeneratorModal } from '@/components/pipeline/LeadGeneratorModal'
import { PageHeader } from '@/components/layout/PageHeader'
import { PIPELINE_BOARD_STAGES } from '@/types'
import type { PipelineEntry, Artist, PipelineStage } from '@/types'

export function Pipeline() {
  const { data: entries, isLoading, error } = usePipelineEntries()
  const moveStage = useMoveStage()
  const [selectedEntry, setSelectedEntry] = useState<
    (PipelineEntry & { artist: Artist }) | null
  >(null)
  const [showBulkEmail, setShowBulkEmail] = useState(false)
  const [showScraper, setShowScraper] = useState(false)
  const [showLeadGen, setShowLeadGen] = useState(false)
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const allGenres = useMemo(() => {
    const genres = new Set<string>()
    entries?.forEach((e) => e.artist?.genres?.forEach((g) => genres.add(g)))
    return Array.from(genres).sort()
  }, [entries])

  const allSources = useMemo(() => {
    const sources = new Set<string>()
    entries?.forEach((e) => { if (e.artist?.source) sources.add(e.artist.source) })
    return Array.from(sources).sort()
  }, [entries])

  const filtered = useMemo(() => {
    if (!entries) return []
    return entries.filter((e) => {
      if (search) {
        const q = search.toLowerCase()
        const nameMatch = e.artist?.name?.toLowerCase().includes(q)
        const emailMatch = e.artist?.email?.toLowerCase().includes(q)
        if (!nameMatch && !emailMatch) return false
      }
      if (genreFilter !== 'all') {
        if (!e.artist?.genres?.includes(genreFilter)) return false
      }
      if (sourceFilter !== 'all') {
        if (e.artist?.source !== sourceFilter) return false
      }
      return true
    })
  }, [entries, search, genreFilter, sourceFilter])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    moveStage.mutate({ entryId: active.id as string, newStage: over.id as PipelineStage })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-teal-200 border-t-teal-600" />
          <p className="text-sm text-gray-500">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-500 text-sm">
        Failed to load pipeline: {error.message}
      </div>
    )
  }

  const grouped = PIPELINE_BOARD_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = filtered.filter((e) => e.stage === stage)
      return acc
    },
    {} as Record<string, (PipelineEntry & { artist: Artist })[]>
  )

  const totalEntries = entries?.length ?? 0
  const withEmail = entries?.filter((e) => e.artist?.email).length ?? 0
  const contactedCount = entries?.filter((e) => e.stage === 'contacted').length ?? 0
  const respondedCount = entries?.filter((e) => ['responded', 'follow_up'].includes(e.stage)).length ?? 0
  const responseRate = contactedCount > 0 ? Math.round((respondedCount / contactedCount) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        icon={Wrench}
        title="Pipeline"
        description="Track and manage your artist outreach funnel"
        gradient="from-teal-500 to-cyan-500"
        shadow="shadow-teal-500/25"
      />

      {/* Stats & Filters */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">

        {/* Stats Cards */}
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Total Artists */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Total Artists</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/25">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Response Rate */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Response Rate</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Have Email */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <p className="text-2xl font-bold text-gray-900">{withEmail}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Have Email</p>
                <p className="text-xs text-gray-400">{totalEntries > 0 ? Math.round((withEmail / totalEntries) * 100) : 0}% of leads</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Mail className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Contacted */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div>
                <p className="text-2xl font-bold text-gray-900">{contactedCount}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Contacted</p>
                <p className="text-xs text-gray-400">awaiting response</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
        </div>

        {/* Search, Filters & Action Buttons */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search artists by handle..."
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>

            {/* Genre filter */}
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All genres</option>
              {allGenres.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            {/* Source filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">All sources</option>
              {allSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {(search || genreFilter !== 'all' || sourceFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setGenreFilter('all'); setSourceFilter('all') }}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Buttons */}
            <button
              onClick={() => setShowLeadGen(true)}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-purple-700 transition-all"
            >
              <Search className="h-4 w-4" />
              Discover Artists
            </button>
            <button
              onClick={() => setShowScraper(true)}
              className="flex items-center gap-2 rounded-lg bg-[#ff5500] px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#e54b00] transition-all"
            >
              <Download className="h-4 w-4" />
              SoundCloud Scraper
            </button>
            <button
              onClick={() => setShowBulkEmail(true)}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-teal-500/25 hover:from-teal-600 hover:to-cyan-600 transition-all"
            >
              <Send className="h-4 w-4" />
              Bulk Email
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex flex-1 gap-3 overflow-x-auto bg-gray-50/80 p-4">
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {PIPELINE_BOARD_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              entries={grouped[stage] ?? []}
              onCardClick={setSelectedEntry}
            />
          ))}
        </DndContext>
      </div>

      {/* Detail Drawer */}
      {selectedEntry && (
        <PipelineDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onMoveStage={(id, stage) => moveStage.mutate({ entryId: id, newStage: stage })}
        />
      )}

      {/* Bulk Email Modal */}
      {showBulkEmail && entries && (
        <BulkEmailModal
          entries={entries}
          onClose={() => setShowBulkEmail(false)}
        />
      )}

      {/* Scraper Modal */}
      {showScraper && (
        <ScraperModal onClose={() => setShowScraper(false)} />
      )}

      {/* Lead Generator Modal */}
      {showLeadGen && (
        <LeadGeneratorModal onClose={() => setShowLeadGen(false)} />
      )}
    </div>
  )
}
