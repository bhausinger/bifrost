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
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-[3px] border-gray-300 border-t-teal-600" />
          <p className="text-sm text-gray-400">Loading pipeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-red-600 text-sm">
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
      />

      {/* Stats & Filters */}
      <div className="border-b border-gray-200 bg-white/80 px-6 py-5">

        {/* Stats Cards */}
        <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            {/* Total Artists */}
            <div className="kpi-card flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold font-data text-gray-900">{totalEntries}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Total Artists</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <Users className="h-6 w-6 text-teal-500" />
              </div>
            </div>

            {/* Response Rate */}
            <div className="kpi-card flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold font-data text-gray-900">{responseRate}%</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Response Rate</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>

            {/* Have Email */}
            <div className="kpi-card flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold font-data text-gray-900">{withEmail}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Have Email</p>
                <p className="text-xs text-gray-400">{totalEntries > 0 ? Math.round((withEmail / totalEntries) * 100) : 0}% of leads</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <Mail className="h-6 w-6 text-violet-600" />
              </div>
            </div>

            {/* Contacted */}
            <div className="kpi-card flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold font-data text-gray-900">{contactedCount}</p>
                <p className="mt-0.5 text-sm font-medium text-gray-500">Contacted</p>
                <p className="text-xs text-gray-400">awaiting response</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
        </div>

        {/* Search, Filters & Action Buttons */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search artists by handle..."
                className="input-field w-full pl-10 pr-4"
              />
            </div>

            {/* Genre filter */}
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              className="select-field"
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
              className="select-field"
            >
              <option value="all">All sources</option>
              {allSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {(search || genreFilter !== 'all' || sourceFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setGenreFilter('all'); setSourceFilter('all') }}
                className="text-sm font-medium text-gray-400 hover:text-gray-900 transition-colors"
              >
                Clear
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Action Buttons */}
            <button
              onClick={() => setShowLeadGen(true)}
              className="flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-600 hover:bg-violet-100 transition-all"
            >
              <Search className="h-4 w-4" />
              Discover Artists
            </button>
            <button
              onClick={() => setShowScraper(true)}
              className="flex items-center gap-2 rounded-lg bg-[#ff5500]/10 px-4 py-2.5 text-sm font-medium text-[#ff5500] hover:bg-[#ff5500]/10 transition-all"
            >
              <Download className="h-4 w-4" />
              SoundCloud Scraper
            </button>
            <button
              onClick={() => setShowBulkEmail(true)}
              className="btn-primary flex items-center gap-2"
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
