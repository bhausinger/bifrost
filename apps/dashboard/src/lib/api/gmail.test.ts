import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: mockGetSession },
  },
}))

vi.mock('@/lib/env', () => ({
  env: {
    VITE_SUPABASE_URL: 'http://test-supabase',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  },
}))

import {
  gmailStatus,
  gmailCallback,
  gmailSendSingle,
  gmailDisconnect,
  gmailSyncTokens,
  gmailAuthUrl,
} from '@/lib/api/gmail'

const FUNCTIONS_URL = 'http://test-supabase/functions/v1'
const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const FAKE_SESSION = {
  access_token: 'fake-token-123',
  refresh_token: 'fake-refresh',
  user: { id: 'user-1' },
}

function mockAuthenticated(): void {
  mockGetSession.mockResolvedValue({ data: { session: FAKE_SESSION } })
}

function mockUnauthenticated(): void {
  mockGetSession.mockResolvedValue({ data: { session: null } })
}

describe('gmailStatus', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetSession.mockReset()
  })

  it('calls correct URL with auth header', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ connected: true, email: 'user@gmail.com' }),
    })

    const result = await gmailStatus()

    expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_URL}/gmail-auth/status`, {
      headers: {
        Authorization: 'Bearer fake-token-123',
        apikey: 'test-anon-key',
      },
    })
    expect(result.connected).toBe(true)
    expect(result.email).toBe('user@gmail.com')
  })

  it('throws when not authenticated', async () => {
    mockUnauthenticated()
    await expect(gmailStatus()).rejects.toThrow('Not authenticated')
  })
})

describe('gmailCallback', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetSession.mockReset()
  })

  it('sends code in POST body', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({ ok: true })

    await gmailCallback('auth-code-xyz')

    expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_URL}/gmail-auth/callback`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer fake-token-123',
        apikey: 'test-anon-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: 'auth-code-xyz' }),
    })
  })
})

describe('gmailSendSingle', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetSession.mockReset()
  })

  it('sends payload and returns messageId/threadId', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ messageId: 'msg-1', threadId: 'thread-1' }),
    })

    const payload = {
      to: 'artist@example.com',
      subject: 'Placement opportunity',
      htmlBody: '<p>Hello!</p>',
    }
    const result = await gmailSendSingle(payload)

    expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_URL}/gmail-send/single`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer fake-token-123',
        apikey: 'test-anon-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    expect(result.messageId).toBe('msg-1')
    expect(result.threadId).toBe('thread-1')
  })

  it('throws on error response with server error message', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid recipient' }),
    })

    await expect(
      gmailSendSingle({
        to: 'bad@',
        subject: 'Test',
        htmlBody: '<p>Hi</p>',
      }),
    ).rejects.toThrow('Invalid recipient')
  })

  it('throws generic message when server error has no message', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    })

    await expect(
      gmailSendSingle({
        to: 'test@example.com',
        subject: 'Test',
        htmlBody: '<p>Hi</p>',
      }),
    ).rejects.toThrow('Gmail send failed: 500')
  })
})

describe('gmailSyncTokens', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetSession.mockReset()
  })

  it('sends provider tokens in POST body', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({ ok: true })

    await gmailSyncTokens({
      provider_token: 'access-tok-xyz',
      provider_refresh_token: 'refresh-tok-abc',
    })

    expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_URL}/gmail-auth/callback`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer fake-token-123',
        apikey: 'test-anon-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider_token: 'access-tok-xyz',
        provider_refresh_token: 'refresh-tok-abc',
      }),
    })
  })
})

describe('gmailAuthUrl', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetSession.mockReset()
  })

  it('calls correct URL and returns { authUrl }', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ authUrl: 'https://accounts.google.com/o/oauth2/auth?...' }),
    })

    const result = await gmailAuthUrl()

    expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_URL}/gmail-auth/auth-url`, {
      headers: {
        Authorization: 'Bearer fake-token-123',
        apikey: 'test-anon-key',
      },
    })
    expect(result).toEqual({ authUrl: 'https://accounts.google.com/o/oauth2/auth?...' })
  })
})

describe('gmailDisconnect', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockGetSession.mockReset()
  })

  it('calls correct URL with POST method', async () => {
    mockAuthenticated()
    mockFetch.mockResolvedValueOnce({ ok: true })

    await gmailDisconnect()

    expect(mockFetch).toHaveBeenCalledWith(`${FUNCTIONS_URL}/gmail-auth/disconnect`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer fake-token-123',
        apikey: 'test-anon-key',
      },
    })
  })
})
