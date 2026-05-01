import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — all mock fns must be created via vi.hoisted
const {
  mockSingle,
  mockMaybeSingle,
  mockEq,
  mockNot,
  mockSelect,
  mockUpdate,
  mockInsert,
  mockDelete,
  mockRpc,
  mockFrom,
} = vi.hoisted(() => ({
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockEq: vi.fn(),
  mockNot: vi.fn(),
  mockSelect: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockDelete: vi.fn(),
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}))

function resetChains(): void {
  mockSingle.mockReturnValue({ data: null, error: null })
  mockMaybeSingle.mockReturnValue({ data: null, error: null })
  mockNot.mockReturnValue({ error: null })
  mockEq.mockReturnValue({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    not: mockNot,
    error: null,
  })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
  mockUpdate.mockReturnValue({ eq: mockEq, not: mockNot, error: null })
  mockInsert.mockReturnValue({ select: mockSelect, error: null })
  mockDelete.mockReturnValue({ eq: mockEq, error: null })
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
  })
}

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}))

vi.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://test-supabase',
    VITE_SUPABASE_ANON_KEY: 'test-key',
  },
}))

import { supabase } from '@/lib/supabase'

// --- Helpers ---

const ARTIST_ID = 'artist-789'
const EMAIL = 'artist@example.com'
const EXCLUDED_ID = 'excluded-001'

/** Replicate mutationFn from useExcludeArtist. */
async function excludeArtist(params: {
  artistId: string
  email: string
  reason?: string
  notes?: string
}): Promise<void> {
  const { artistId, email, reason = 'opt_out', notes } = params

  const { error: rpcError } = await supabase.rpc('exclude_artist', {
    p_artist_id: artistId,
    p_email: email,
    p_reason: reason,
    p_notes: notes,
  })

  if (rpcError) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name')
      .eq('id', artistId)
      .single()

    const { data: existing } = await supabase
      .from('excluded_artists')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('excluded_artists')
        .update({ reason, notes: notes ?? null })
        .eq('id', existing.id)
    } else {
      const { error: insertError } = await supabase
        .from('excluded_artists')
        .insert({
          email,
          artist_name: artist?.name ?? 'Unknown',
          artist_id: artistId,
          reason,
          notes: notes ?? null,
        })
      if (insertError) throw insertError
    }

    const { error: updateError } = await supabase
      .from('pipeline_entries')
      .update({ stage: 'lost', lost_reason: reason })
      .eq('artist_id', artistId)
      .not('stage', 'in', '("completed","lost")')
    if (updateError) throw updateError
  }
}

/** Replicate mutationFn from useRestoreArtist. */
async function restoreArtist(excludedId: string): Promise<void> {
  const { error } = await supabase
    .from('excluded_artists')
    .delete()
    .eq('id', excludedId)
  if (error) throw error
}

/** Replicate queryFn from useIsExcluded. */
async function isExcluded(email: string | null): Promise<boolean> {
  if (!email) return false
  const { data, error } = await supabase.rpc('is_excluded', { p_email: email })
  if (!error) return data as boolean

  const { data: row } = await supabase
    .from('excluded_artists')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  return !!row
}

// --- Tests ---

describe('excludeArtist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChains()
  })

  it('calls RPC with correct params and does nothing else on success', async () => {
    mockRpc.mockResolvedValueOnce({ error: null })

    await excludeArtist({
      artistId: ARTIST_ID,
      email: EMAIL,
      reason: 'opt_out',
      notes: 'Asked to stop',
    })

    expect(supabase.rpc).toHaveBeenCalledWith('exclude_artist', {
      p_artist_id: ARTIST_ID,
      p_email: EMAIL,
      p_reason: 'opt_out',
      p_notes: 'Asked to stop',
    })
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('inserts new excluded record when RPC fails and not previously excluded', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC missing' } })
    mockSingle.mockResolvedValueOnce({ data: { name: 'DJ Test' }, error: null })
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockInsert.mockReturnValueOnce({ error: null })
    mockNot.mockReturnValueOnce({ error: null })

    await excludeArtist({ artistId: ARTIST_ID, email: EMAIL })

    expect(mockInsert).toHaveBeenCalledWith({
      email: EMAIL,
      artist_name: 'DJ Test',
      artist_id: ARTIST_ID,
      reason: 'opt_out',
      notes: null,
    })
  })

  it('updates existing excluded record when RPC fails and already excluded', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC missing' } })
    mockSingle.mockResolvedValueOnce({ data: { name: 'DJ Test' }, error: null })
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: EXCLUDED_ID }, error: null })
    mockNot.mockReturnValueOnce({ error: null })

    await excludeArtist({ artistId: ARTIST_ID, email: EMAIL, reason: 'bounced' })

    expect(mockUpdate).toHaveBeenCalledWith({ reason: 'bounced', notes: null })
    expect(mockEq).toHaveBeenCalledWith('id', EXCLUDED_ID)
  })

  it('moves active pipeline entries to lost on fallback', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC missing' } })
    mockSingle.mockResolvedValueOnce({ data: { name: 'DJ Test' }, error: null })
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockInsert.mockReturnValueOnce({ error: null })
    mockNot.mockReturnValueOnce({ error: null })

    await excludeArtist({ artistId: ARTIST_ID, email: EMAIL, reason: 'opt_out' })

    expect(mockFrom).toHaveBeenCalledWith('pipeline_entries')
    expect(mockUpdate).toHaveBeenCalledWith({ stage: 'lost', lost_reason: 'opt_out' })
    expect(mockEq).toHaveBeenCalledWith('artist_id', ARTIST_ID)
    expect(mockNot).toHaveBeenCalledWith('stage', 'in', '("completed","lost")')
  })

  it('uses "Unknown" when artist name lookup returns null', async () => {
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC missing' } })
    mockSingle.mockResolvedValueOnce({ data: null, error: null })
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockInsert.mockReturnValueOnce({ error: null })
    mockNot.mockReturnValueOnce({ error: null })

    await excludeArtist({ artistId: ARTIST_ID, email: EMAIL })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ artist_name: 'Unknown' }),
    )
  })
})

describe('restoreArtist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChains()
  })

  it('deletes the excluded record by id', async () => {
    mockEq.mockReturnValueOnce({ error: null })

    await restoreArtist(EXCLUDED_ID)

    expect(mockFrom).toHaveBeenCalledWith('excluded_artists')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockEq).toHaveBeenCalledWith('id', EXCLUDED_ID)
  })

  it('throws on delete error', async () => {
    mockEq.mockReturnValueOnce({ error: { message: 'Not found' } })

    await expect(restoreArtist(EXCLUDED_ID)).rejects.toEqual({
      message: 'Not found',
    })
  })
})

describe('isExcluded', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChains()
  })

  it('returns true when RPC says excluded', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null })

    const result = await isExcluded(EMAIL)

    expect(result).toBe(true)
    expect(supabase.rpc).toHaveBeenCalledWith('is_excluded', { p_email: EMAIL })
  })

  it('returns false when RPC says not excluded', async () => {
    mockRpc.mockResolvedValueOnce({ data: false, error: null })

    const result = await isExcluded(EMAIL)

    expect(result).toBe(false)
  })

  it('falls back to direct query and returns true if row exists', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC missing' } })
    mockMaybeSingle.mockReturnValueOnce({ data: { id: EXCLUDED_ID } })

    const result = await isExcluded(EMAIL)

    expect(result).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('excluded_artists')
  })

  it('falls back to direct query and returns false if no row', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'RPC missing' } })
    mockMaybeSingle.mockReturnValueOnce({ data: null })

    const result = await isExcluded(EMAIL)

    expect(result).toBe(false)
  })

  it('returns false for null email without calling supabase', async () => {
    const result = await isExcluded(null)

    expect(result).toBe(false)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })
})
