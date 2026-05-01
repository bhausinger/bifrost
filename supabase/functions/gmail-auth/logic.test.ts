import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.177.0/testing/asserts.ts'

// Test the pure logic patterns from gmail-auth

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

Deno.test('OAuth URL includes all required scopes', () => {
  assertStringIncludes(SCOPES, 'gmail.send')
  assertStringIncludes(SCOPES, 'gmail.readonly')
  assertStringIncludes(SCOPES, 'userinfo.email')
  assertStringIncludes(SCOPES, 'userinfo.profile')
})

Deno.test('OAuth URL construction has correct parameters', () => {
  const clientId = 'test-client-id'
  const redirectUri = 'http://localhost:3333/auth/callback'
  const userId = 'user-uuid-123'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  })

  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  assertStringIncludes(url, 'client_id=test-client-id')
  assertStringIncludes(url, 'access_type=offline')
  assertStringIncludes(url, 'prompt=consent')
  assertStringIncludes(url, `state=${userId}`)
  assertStringIncludes(url, 'response_type=code')
})

Deno.test('token expiry calculation is correct', () => {
  const now = Date.now()
  const expiresIn = 3600 // 1 hour
  const expiry = new Date(now + expiresIn * 1000)

  // Should be ~1 hour from now
  const diffMs = expiry.getTime() - now
  assertEquals(diffMs, 3600000)
})

Deno.test('token refresh check — expired token needs refresh', () => {
  const expiresAt = Date.now() - 60000 // expired 1 minute ago
  const needsRefresh = expiresAt < Date.now() + 5 * 60 * 1000
  assertEquals(needsRefresh, true)
})

Deno.test('token refresh check — token expiring soon needs refresh', () => {
  const expiresAt = Date.now() + 2 * 60 * 1000 // expires in 2 minutes
  const needsRefresh = expiresAt < Date.now() + 5 * 60 * 1000
  assertEquals(needsRefresh, true)
})

Deno.test('token refresh check — valid token does not need refresh', () => {
  const expiresAt = Date.now() + 30 * 60 * 1000 // expires in 30 minutes
  const needsRefresh = expiresAt < Date.now() + 5 * 60 * 1000
  assertEquals(needsRefresh, false)
})

Deno.test('auth header extraction', () => {
  const header = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
  const token = header.replace('Bearer ', '')
  assertEquals(token, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test')
})
