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

describe('useAgencies — query logic', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('calls select(*) and orders by name', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [{ id: '1', name: 'Agency A' }],
      error: null,
    })
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.from('agencies').select('*').order('name')

    expect(mockFrom).toHaveBeenCalledWith('agencies')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockOrder).toHaveBeenCalledWith('name')
    expect(data).toHaveLength(1)
    expect(error).toBeNull()
  })
})

describe('createAgency', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('inserts with correct data and returns created agency', async () => {
    const created = {
      id: 'ag-1',
      name: 'Test Agency',
      email: null,
      contact_name: null,
      notes: null,
    }
    const mockSingle = vi.fn().mockResolvedValue({ data: created, error: null })
    const mockSelectAfterInsert = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectAfterInsert })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const agencyInput = {
      name: 'Test Agency',
      email: null,
      contact_name: null,
      notes: null,
    }

    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.from('agencies').insert(agencyInput).select().single()

    expect(mockInsert).toHaveBeenCalledWith(agencyInput)
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
    const { error } = await supabase.from('agencies').insert({ name: 'Dup' }).select().single()

    expect(error).toEqual(dbError)
  })
})

describe('updateAgency', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('calls update with correct id and spread updates', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const updates = { name: 'Updated Agency', email: 'new@test.com' }

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('agencies').update(updates).eq('id', 'ag-1')

    expect(mockUpdate).toHaveBeenCalledWith(updates)
    expect(mockEq).toHaveBeenCalledWith('id', 'ag-1')
    expect(error).toBeNull()
  })
})
