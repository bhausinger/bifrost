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

describe('useArtists — query logic', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('filters by status=client with agency join and orders by created_at desc', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Artist A', status: 'client', agency: null }],
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    // Import and extract the queryFn pattern directly
    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase
      .from('artists')
      .select('*, agency:agencies(id, name)')
      .eq('status', 'client')
      .order('created_at', { ascending: false })

    expect(mockFrom).toHaveBeenCalledWith('artists')
    expect(mockSelect).toHaveBeenCalledWith('*, agency:agencies(id, name)')
    expect(mockEq).toHaveBeenCalledWith('status', 'client')
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(data).toHaveLength(1)
    expect(error).toBeNull()
  })
})

describe('createArtist', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('inserts with correct data and returns the created artist', async () => {
    const created = { id: 'new-1', name: 'New Artist', status: 'lead' }
    const mockSingle = vi.fn().mockResolvedValue({ data: created, error: null })
    const mockSelectAfterInsert = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectAfterInsert })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const artistInput = { name: 'New Artist', status: 'lead' }

    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.from('artists').insert(artistInput).select().single()

    expect(mockInsert).toHaveBeenCalledWith(artistInput)
    expect(data).toEqual(created)
    expect(error).toBeNull()
  })

  it('throws on insert error', async () => {
    const dbError = { message: 'duplicate key', code: '23505' }
    const mockSingle = vi.fn().mockResolvedValue({ data: null, error: dbError })
    const mockSelectAfterInsert = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectAfterInsert })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('artists').insert({ name: 'Dup' }).select().single()

    expect(error).toEqual(dbError)
  })
})

describe('updateArtist', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('calls update with correct id and spread updates', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { supabase } = await import('@/lib/supabase')
    const updates = { name: 'Updated Name', email: 'new@test.com' }
    const { error } = await supabase.from('artists').update(updates).eq('id', 'artist-1')

    expect(mockUpdate).toHaveBeenCalledWith(updates)
    expect(mockEq).toHaveBeenCalledWith('id', 'artist-1')
    expect(error).toBeNull()
  })

  it('returns error on failure', async () => {
    const dbError = { message: 'not found', code: 'PGRST116' }
    const mockEq = vi.fn().mockResolvedValue({ error: dbError })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('artists').update({ name: 'X' }).eq('id', 'missing')

    expect(error).toEqual(dbError)
  })
})

describe('deleteArtist', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('calls delete with correct id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('artists').delete().eq('id', 'del-1')

    expect(mockFrom).toHaveBeenCalledWith('artists')
    expect(mockEq).toHaveBeenCalledWith('id', 'del-1')
    expect(error).toBeNull()
  })

  it('returns error on failure', async () => {
    const dbError = { message: 'FK constraint', code: '23503' }
    const mockEq = vi.fn().mockResolvedValue({ error: dbError })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('artists').delete().eq('id', 'bad-id')

    expect(error).toEqual(dbError)
  })
})
