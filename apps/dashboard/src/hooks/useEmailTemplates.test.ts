import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderTemplate, stripEmojis } from '@/hooks/useEmailTemplates'

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

describe('renderTemplate', () => {
  it('replaces {{artistName}} with value', () => {
    const result = renderTemplate('Hello {{artistName}}!', { artistName: 'DJ Nova' })
    expect(result).toBe('Hello DJ Nova!')
  })

  it('replaces multiple variables', () => {
    const template = 'Hi {{artistName}}, check out {{deckLink}} for {{mostRecentTrack}}'
    const vars = {
      artistName: 'Luna',
      deckLink: 'https://deck.com/123',
      mostRecentTrack: 'Midnight',
    }
    const result = renderTemplate(template, vars)
    expect(result).toBe('Hi Luna, check out https://deck.com/123 for Midnight')
  })

  it('leaves unmatched {{unknown}} placeholders unchanged', () => {
    const result = renderTemplate('Hi {{artistName}}, {{unknown}} here', {
      artistName: 'Test',
    })
    expect(result).toBe('Hi Test, {{unknown}} here')
  })

  it('handles empty vars object', () => {
    const template = 'Hello {{artistName}}'
    const result = renderTemplate(template, {})
    expect(result).toBe('Hello {{artistName}}')
  })
})

describe('stripEmojis', () => {
  it('removes emoji characters', () => {
    const result = stripEmojis('Hello 🎵 World 🎶')
    expect(result).toBe('Hello World')
  })

  it('collapses multiple spaces left by emoji removal', () => {
    const result = stripEmojis('A 🔥 🔥 B')
    expect(result).toBe('A B')
  })

  it('trims whitespace', () => {
    const result = stripEmojis(' 🎉 hello 🎉 ')
    expect(result).toBe('hello')
  })

  it('preserves normal text', () => {
    const result = stripEmojis('Just a normal string with no emojis')
    expect(result).toBe('Just a normal string with no emojis')
  })
})

describe('createEmailTemplate', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('inserts with correct data', async () => {
    const created = { id: 'tpl-1', name: 'Outreach', subject: 'Hi', body: 'Hello' }
    const mockSingle = vi.fn().mockResolvedValue({ data: created, error: null })
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
    mockFrom.mockReturnValue({ insert: mockInsert })

    const input = {
      name: 'Outreach',
      subject: 'Hi',
      body: 'Hello',
      template_type: 'initial',
    }

    const { supabase } = await import('@/lib/supabase')
    const { data, error } = await supabase.from('email_templates').insert(input).select().single()

    expect(mockFrom).toHaveBeenCalledWith('email_templates')
    expect(mockInsert).toHaveBeenCalledWith(input)
    expect(data).toEqual(created)
    expect(error).toBeNull()
  })
})
