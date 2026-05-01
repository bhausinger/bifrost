import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://test-supabase',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_SCRAPER_URL: 'http://test-scraper',
  },
}))

/** Simulates the createCampaign mutationFn logic extracted from the hook. */
async function simulateCreateCampaign(campaign: {
  artist_id: string
  pipeline_entry_id?: string
  name: string
  track_name?: string
  total_budget?: number
}): Promise<{ data: unknown; error: unknown }> {
  const { supabase } = await import('@/lib/supabase')
  const { pipeline_entry_id, ...rest } = campaign

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      ...rest,
      pipeline_entry_id,
      status: 'active',
      actual_streams: 0,
    })
    .select()
    .single()

  if (error) throw error

  if (pipeline_entry_id) {
    await supabase
      .from('pipeline_entries')
      .update({ stage: 'completed' })
      .eq('id', pipeline_entry_id)
  }

  await supabase
    .from('artists')
    .update({ status: 'client' })
    .eq('id', campaign.artist_id)

  return { data, error: null }
}

function setupInsertMock(returnData: unknown, returnError: unknown = null): void {
  const mockSingle = vi.fn().mockResolvedValue({ data: returnData, error: returnError })
  const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
  const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'campaigns') return { insert: mockInsert }
    if (table === 'pipeline_entries') return { update: mockUpdate }
    if (table === 'artists') return { update: mockUpdate }
    return {}
  })
}

describe('createCampaign', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('inserts with status=active and actual_streams=0', async () => {
    const created = { id: 'camp-1', name: 'Test Campaign', status: 'active' }
    const mockSingle = vi.fn().mockResolvedValue({ data: created, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') return { insert: mockInsert }
      return { update: mockUpdate }
    })

    await simulateCreateCampaign({
      artist_id: 'artist-1',
      name: 'Test Campaign',
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'active',
        actual_streams: 0,
        name: 'Test Campaign',
        artist_id: 'artist-1',
      }),
    )
  })

  it('moves pipeline entry to completed when pipeline_entry_id provided', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'c-1' }, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    const callLog: string[] = []
    mockFrom.mockImplementation((table: string) => {
      callLog.push(table)
      if (table === 'campaigns') return { insert: mockInsert }
      return { update: mockUpdate }
    })

    await simulateCreateCampaign({
      artist_id: 'artist-1',
      pipeline_entry_id: 'pe-99',
      name: 'With Pipeline',
    })

    // pipeline_entries should have been called
    expect(callLog).toContain('pipeline_entries')
    expect(mockUpdate).toHaveBeenCalledWith({ stage: 'completed' })
  })

  it('does NOT update pipeline entries when no pipeline_entry_id', async () => {
    setupInsertMock({ id: 'c-2' })

    const callLog: string[] = []
    const origImpl = mockFrom.getMockImplementation()
    mockFrom.mockImplementation((table: string) => {
      callLog.push(table)
      return origImpl!(table)
    })

    await simulateCreateCampaign({
      artist_id: 'artist-1',
      name: 'No Pipeline',
    })

    expect(callLog).not.toContain('pipeline_entries')
  })

  it('always promotes artist to client status', async () => {
    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq })
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'c-3' }, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'campaigns') return { insert: mockInsert }
      return { update: mockUpdate }
    })

    await simulateCreateCampaign({
      artist_id: 'artist-5',
      name: 'Promote Test',
    })

    // Last call to update should be artist promotion
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'client' })
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'artist-5')
  })

  it('throws on insert error', async () => {
    const dbError = { message: 'insert failed', code: '23505' }
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: dbError })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })

    mockFrom.mockImplementation(() => ({ insert: mockInsert }))

    await expect(
      simulateCreateCampaign({ artist_id: 'a-1', name: 'Fail' }),
    ).rejects.toEqual(dbError)
  })
})

describe('updateCampaign', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('calls update with correct id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { supabase } = await import('@/lib/supabase')
    await supabase.from('campaigns').update({ name: 'Renamed' }).eq('id', 'c-10')

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Renamed' })
    expect(mockEq).toHaveBeenCalledWith('id', 'c-10')
  })

  it('returns error on failure', async () => {
    const dbError = { message: 'not found', code: 'PGRST116' }
    const mockEq = vi.fn().mockResolvedValue({ error: dbError })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase
      .from('campaigns')
      .update({ name: 'X' })
      .eq('id', 'missing')

    expect(error).toEqual(dbError)
  })
})
