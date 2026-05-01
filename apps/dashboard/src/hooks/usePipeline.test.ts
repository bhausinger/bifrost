import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock is hoisted — all mock fns must be created via vi.hoisted
const { mockSingle, mockEq, mockSelect, mockUpdate, mockInsert, mockRpc, mockFrom } = vi.hoisted(
  () => ({
    mockSingle: vi.fn(),
    mockEq: vi.fn(),
    mockSelect: vi.fn(),
    mockUpdate: vi.fn(),
    mockInsert: vi.fn(),
    mockRpc: vi.fn(),
    mockFrom: vi.fn(),
  }),
)

function resetChains(): void {
  mockSingle.mockReturnValue({ data: null, error: null })
  mockEq.mockReturnValue({ single: mockSingle, error: null })
  mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle })
  mockUpdate.mockReturnValue({ eq: mockEq, error: null })
  mockInsert.mockReturnValue({ select: mockSelect, error: null })
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
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

const ENTRY_ID = 'entry-123'
const ARTIST_ID = 'artist-456'

/** Replicate the mutationFn from useMoveStage to test it directly. */
async function moveStage(entryId: string, newStage: string, note?: string): Promise<void> {
  const { data: entry } = await supabase
    .from('pipeline_entries')
    .select('stage')
    .eq('id', entryId)
    .single()
  const oldStage = entry?.stage ?? 'unknown'

  const { error: rpcError } = await supabase.rpc('move_pipeline_stage', {
    entry_id: entryId,
    new_stage: newStage,
    note,
  })

  if (rpcError) {
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('pipeline_entries')
      .update({
        stage: newStage,
        stage_entered_at: now,
        contacted_at: newStage === 'contacted' ? now : null,
        responded_at: newStage === 'responded' ? now : null,
        paid_at: newStage === 'paid' ? now : null,
        completed_at: newStage === 'completed' ? now : null,
      })
      .eq('id', entryId)
    if (updateError) throw updateError
  }

  if (rpcError) {
    await supabase.from('pipeline_activities').insert({
      pipeline_entry_id: entryId,
      type: 'stage_change',
      description: `Moved from ${oldStage} to ${newStage}`,
      metadata: { old_stage: oldStage, new_stage: newStage, note: note ?? null },
    })
  }
}

/** Replicate the mutationFn from useCreatePipelineEntry. */
async function createPipelineEntry(params: {
  artistId: string
  stage?: string
  dealValue?: number
  packageType?: string
  notes?: string
}): Promise<unknown> {
  const { artistId, stage = 'discovered', dealValue, packageType, notes } = params
  const { data, error } = await supabase
    .from('pipeline_entries')
    .insert({
      artist_id: artistId,
      stage,
      deal_value: dealValue ?? null,
      package_type: packageType ?? null,
      notes: notes ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// --- Tests ---

describe('moveStage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChains()
  })

  it('calls RPC with correct params and skips fallback on success', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'discovered' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: null })

    await moveStage(ENTRY_ID, 'contacted', 'first contact')

    expect(supabase.rpc).toHaveBeenCalledWith('move_pipeline_stage', {
      entry_id: ENTRY_ID,
      new_stage: 'contacted',
      note: 'first contact',
    })
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('falls back to direct update and inserts activity log when RPC fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'discovered' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC not found' } })

    await moveStage(ENTRY_ID, 'contacted')

    expect(mockUpdate).toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith({
      pipeline_entry_id: ENTRY_ID,
      type: 'stage_change',
      description: 'Moved from discovered to contacted',
      metadata: { old_stage: 'discovered', new_stage: 'contacted', note: null },
    })
  })

  it('sets contacted_at when moving to contacted stage', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'discovered' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC not found' } })

    await moveStage(ENTRY_ID, 'contacted')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'contacted',
        contacted_at: expect.any(String),
        responded_at: null,
        paid_at: null,
        completed_at: null,
      }),
    )
  })

  it('sets responded_at when moving to responded stage', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'contacted' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC not found' } })

    await moveStage(ENTRY_ID, 'responded')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'responded',
        contacted_at: null,
        responded_at: expect.any(String),
        paid_at: null,
        completed_at: null,
      }),
    )
  })

  it('sets paid_at when moving to paid stage', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'negotiating' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC not found' } })

    await moveStage(ENTRY_ID, 'paid')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        paid_at: expect.any(String),
        contacted_at: null,
        responded_at: null,
        completed_at: null,
      }),
    )
  })

  it('sets completed_at when moving to completed stage', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'active' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC not found' } })

    await moveStage(ENTRY_ID, 'completed')

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        completed_at: expect.any(String),
        contacted_at: null,
        responded_at: null,
        paid_at: null,
      }),
    )
  })

  it('fetches old stage before moving', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'follow_up' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: null })

    await moveStage(ENTRY_ID, 'negotiating')

    expect(mockFrom).toHaveBeenCalledWith('pipeline_entries')
    expect(mockSelect).toHaveBeenCalledWith('stage')
    expect(mockEq).toHaveBeenCalledWith('id', ENTRY_ID)
  })

  it('throws when fallback update also fails', async () => {
    mockSingle.mockResolvedValueOnce({ data: { stage: 'discovered' }, error: null })
    mockRpc.mockResolvedValueOnce({ error: { message: 'RPC not found' } })
    // After the first .eq() call (for select), override for update's .eq()
    mockEq
      .mockReturnValueOnce({ single: mockSingle, error: null })
      .mockReturnValueOnce({ error: { message: 'Update failed' } })

    await expect(moveStage(ENTRY_ID, 'contacted')).rejects.toEqual({
      message: 'Update failed',
    })
  })
})

describe('createPipelineEntry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetChains()
  })

  it('creates entry with default stage "discovered" and null optional fields', async () => {
    const fakeEntry = { id: 'new-1', stage: 'discovered', artist_id: ARTIST_ID }
    mockSingle.mockResolvedValueOnce({ data: fakeEntry, error: null })

    const result = await createPipelineEntry({ artistId: ARTIST_ID })

    expect(mockInsert).toHaveBeenCalledWith({
      artist_id: ARTIST_ID,
      stage: 'discovered',
      deal_value: null,
      package_type: null,
      notes: null,
    })
    expect(result).toEqual(fakeEntry)
  })

  it('passes through custom values', async () => {
    const fakeEntry = { id: 'new-2', stage: 'contacted', artist_id: ARTIST_ID }
    mockSingle.mockResolvedValueOnce({ data: fakeEntry, error: null })

    await createPipelineEntry({
      artistId: ARTIST_ID,
      stage: 'contacted',
      dealValue: 50000,
      packageType: 'premium',
      notes: 'Hot lead',
    })

    expect(mockInsert).toHaveBeenCalledWith({
      artist_id: ARTIST_ID,
      stage: 'contacted',
      deal_value: 50000,
      package_type: 'premium',
      notes: 'Hot lead',
    })
  })

  it('throws on insert error', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Duplicate' } })

    await expect(createPipelineEntry({ artistId: ARTIST_ID })).rejects.toEqual({
      message: 'Duplicate',
    })
  })
})
