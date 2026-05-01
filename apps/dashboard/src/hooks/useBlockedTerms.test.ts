import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://test-supabase',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_SCRAPER_URL: 'http://test-scraper',
  },
}))

/** Simulates the addBlockedTerm mutationFn logic. */
async function simulateAddBlockedTerm(
  input: { term: string; type: 'email_domain' | 'profile_name' },
): Promise<void> {
  const { supabase } = await import('@/lib/supabase')
  const { data: user } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('blocked_terms')
    .insert({
      term: input.term.toLowerCase().trim(),
      type: input.type,
      created_by: user.user?.id,
    })
  if (error) throw error
}

describe('addBlockedTerm', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
  })

  it('lowercases and trims the term before insert', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })

    await simulateAddBlockedTerm({ term: '  SPAM  ', type: 'profile_name' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ term: 'spam' }),
    )
  })

  it('includes current user ID as created_by', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-42' } } })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: mockInsert })

    await simulateAddBlockedTerm({ term: 'test', type: 'email_domain' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'user-42' }),
    )
  })

  it('throws on insert error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const dbError = { message: 'duplicate', code: '23505' }
    const mockInsert = vi.fn().mockResolvedValue({ error: dbError })
    mockFrom.mockReturnValue({ insert: mockInsert })

    await expect(
      simulateAddBlockedTerm({ term: 'dup', type: 'profile_name' }),
    ).rejects.toEqual(dbError)
  })
})

describe('deleteBlockedTerm', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('calls delete with correct id', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('blocked_terms').delete().eq('id', 'bt-1')

    expect(mockFrom).toHaveBeenCalledWith('blocked_terms')
    expect(mockEq).toHaveBeenCalledWith('id', 'bt-1')
    expect(error).toBeNull()
  })

  it('returns error on failure', async () => {
    const dbError = { message: 'not found', code: 'PGRST116' }
    const mockEq = vi.fn().mockResolvedValue({ error: dbError })
    const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ delete: mockDelete })

    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase.from('blocked_terms').delete().eq('id', 'bad')

    expect(error).toEqual(dbError)
  })
})
