import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getFollowUpStatus } from '@/hooks/useFollowUpStatus'
import type { PipelineEntry } from '@/types'

vi.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://test-supabase',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_SCRAPER_URL: 'http://test-scraper',
  },
}))

const NOW = new Date('2026-04-30T12:00:00Z')

function makeEntry(overrides: Partial<PipelineEntry>): PipelineEntry {
  return {
    id: 'pe-1',
    artist_id: 'a-1',
    stage: 'contacted',
    deal_value: null,
    package_type: null,
    notes: null,
    assigned_to: null,
    stage_entered_at: '2026-04-30T00:00:00Z',
    contacted_at: null,
    responded_at: null,
    paid_at: null,
    completed_at: null,
    lost_reason: null,
    created_by: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    ...overrides,
  }
}

function daysAgo(days: number): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

describe('getFollowUpStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns urgency "none" for non-contact stage (discovered)', () => {
    const entry = makeEntry({ stage: 'discovered' })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('none')
  })

  it('returns urgency "none" for 0-2 days since contact', () => {
    const entry = makeEntry({
      stage: 'contacted',
      contacted_at: daysAgo(1),
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('none')
    expect(result.daysSinceContact).toBe(1)
  })

  it('returns urgency "due" for 3-6 days', () => {
    const entry = makeEntry({
      stage: 'contacted',
      contacted_at: daysAgo(4),
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('due')
    expect(result.daysSinceContact).toBe(4)
  })

  it('returns urgency "overdue" for 7-13 days', () => {
    const entry = makeEntry({
      stage: 'responded',
      responded_at: daysAgo(10),
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('overdue')
    expect(result.daysSinceContact).toBe(10)
  })

  it('returns urgency "urgent" for 14-20 days', () => {
    const entry = makeEntry({
      stage: 'follow_up',
      contacted_at: daysAgo(16),
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('urgent')
    expect(result.daysSinceContact).toBe(16)
  })

  it('returns urgency "critical" for 21+ days', () => {
    const entry = makeEntry({
      stage: 'contacted',
      contacted_at: daysAgo(25),
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('critical')
    expect(result.daysSinceContact).toBe(25)
  })

  it('uses responded_at over contacted_at when both exist', () => {
    const entry = makeEntry({
      stage: 'responded',
      contacted_at: daysAgo(20), // would be "urgent"
      responded_at: daysAgo(2), // should win — "none"
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('none')
    expect(result.daysSinceContact).toBe(2)
  })

  it('falls back to stage_entered_at when no contact dates', () => {
    const entry = makeEntry({
      stage: 'contacted',
      contacted_at: null,
      responded_at: null,
      stage_entered_at: daysAgo(8),
    })
    const result = getFollowUpStatus(entry)
    expect(result.urgency).toBe('overdue')
    expect(result.daysSinceContact).toBe(8)
  })

  it('returns correct daysSinceContact count', () => {
    const entry = makeEntry({
      stage: 'contacted',
      contacted_at: daysAgo(5),
    })
    const result = getFollowUpStatus(entry)
    expect(result.daysSinceContact).toBe(5)
  })

  it('returns correct border/bg color classes for each urgency level', () => {
    const none = getFollowUpStatus(
      makeEntry({
        stage: 'contacted',
        contacted_at: daysAgo(1),
      }),
    )
    expect(none.borderColor).toBe('')
    expect(none.bgColor).toBe('')

    const due = getFollowUpStatus(
      makeEntry({
        stage: 'contacted',
        contacted_at: daysAgo(3),
      }),
    )
    expect(due.borderColor).toBe('border-blue-400')
    expect(due.bgColor).toBe('bg-blue-50')

    const overdue = getFollowUpStatus(
      makeEntry({
        stage: 'contacted',
        contacted_at: daysAgo(7),
      }),
    )
    expect(overdue.borderColor).toBe('border-yellow-500')
    expect(overdue.bgColor).toBe('bg-yellow-50')

    const urgent = getFollowUpStatus(
      makeEntry({
        stage: 'contacted',
        contacted_at: daysAgo(14),
      }),
    )
    expect(urgent.borderColor).toBe('border-orange-500')
    expect(urgent.bgColor).toBe('bg-orange-50')

    const critical = getFollowUpStatus(
      makeEntry({
        stage: 'contacted',
        contacted_at: daysAgo(21),
      }),
    )
    expect(critical.borderColor).toBe('border-red-500')
    expect(critical.bgColor).toBe('bg-red-50')
  })
})
