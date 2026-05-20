import { assertEquals } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
import {
  htmlToText,
  cleanArtistName,
  personalizeTemplate,
  buildDeckLink,
  buildUnsubscribeUrl,
  buildUnsubscribeFooter,
  buildUnsubscribeFooterText,
} from './helpers.ts'

// htmlToText

Deno.test('htmlToText — strips basic HTML tags', () => {
  assertEquals(htmlToText('<p>Hello <strong>world</strong></p>'), 'Hello world')
})

Deno.test('htmlToText — converts <br> to newline', () => {
  assertEquals(htmlToText('line1<br>line2'), 'line1\nline2')
  assertEquals(htmlToText('line1<br/>line2'), 'line1\nline2')
  assertEquals(htmlToText('line1<br />line2'), 'line1\nline2')
})

Deno.test('htmlToText — converts </p> to double newline', () => {
  assertEquals(htmlToText('<p>First</p><p>Second</p>'), 'First\n\nSecond')
})

Deno.test('htmlToText — decodes HTML entities', () => {
  // trailing &nbsp; becomes space, then trim() removes it
  assertEquals(htmlToText('a&amp;b &lt;c&gt; &quot;d&quot; e&nbsp;f'), 'a&b <c> "d" e f')
})

Deno.test('htmlToText — trims whitespace', () => {
  assertEquals(htmlToText('  <p>hello</p>  '), 'hello')
})

Deno.test('htmlToText — handles empty string', () => {
  assertEquals(htmlToText(''), '')
})

// cleanArtistName

Deno.test('cleanArtistName — returns plain name unchanged', () => {
  assertEquals(cleanArtistName('Drake'), 'Drake')
})

Deno.test('cleanArtistName — normalizes unicode accents', () => {
  assertEquals(cleanArtistName('José'), 'Jose')
})

Deno.test('cleanArtistName — strips "Stream" prefix', () => {
  assertEquals(cleanArtistName('Stream Lofi Beats'), 'Lofi Beats')
})

Deno.test('cleanArtistName — strips "music" suffix', () => {
  assertEquals(cleanArtistName('Chill Vibes Music'), 'Chill Vibes')
})

Deno.test('cleanArtistName — collapses multiple spaces', () => {
  assertEquals(cleanArtistName('Too   Many    Spaces'), 'Too Many Spaces')
})

Deno.test('cleanArtistName — falls back to "Artist" for empty string', () => {
  assertEquals(cleanArtistName(''), 'Artist')
})

Deno.test('cleanArtistName — normalizes trademark and removes non-ASCII', () => {
  // ™ normalizes to TM via NFKD, ♪ is stripped as non-ASCII
  assertEquals(cleanArtistName('Name™ ♪'), 'NameTM')
})

// personalizeTemplate

Deno.test('personalizeTemplate — replaces all template variables', () => {
  const template =
    'Hi {{artistName}}, check {{deckLink}}. From {{senderName}}. Listen: {{spotifyUrl}}'
  const result = personalizeTemplate(template, {
    artistName: 'Drake',
    deckLink: '<a href="https://deck.com">our deck</a>',
    senderName: 'Ben',
    spotifyUrl: 'https://open.spotify.com/track/123',
  })
  assertEquals(
    result,
    'Hi Drake, check <a href="https://deck.com">our deck</a>. From Ben. Listen: https://open.spotify.com/track/123',
  )
})

Deno.test('personalizeTemplate — replaces multiple occurrences of same variable', () => {
  const template = '{{artistName}} is great. We love {{artistName}}.'
  const result = personalizeTemplate(template, {
    artistName: 'Adele',
    deckLink: '',
    senderName: '',
    spotifyUrl: '',
  })
  assertEquals(result, 'Adele is great. We love Adele.')
})

Deno.test('personalizeTemplate — leaves template unchanged when no vars match', () => {
  const template = 'No variables here.'
  const result = personalizeTemplate(template, {
    artistName: 'X',
    deckLink: 'Y',
    senderName: 'Z',
    spotifyUrl: 'W',
  })
  assertEquals(result, 'No variables here.')
})

// buildDeckLink

Deno.test('buildDeckLink — builds anchor tag when url and text provided', () => {
  assertEquals(
    buildDeckLink('https://deck.com', 'our deck'),
    '<a href="https://deck.com">our deck</a>',
  )
})

Deno.test('buildDeckLink — returns text only when no url', () => {
  assertEquals(buildDeckLink(undefined, 'plain text'), 'plain text')
})

Deno.test('buildDeckLink — returns empty string when neither provided', () => {
  assertEquals(buildDeckLink(undefined, undefined), '')
})

Deno.test('buildDeckLink — returns empty string when url but no text', () => {
  assertEquals(buildDeckLink('https://deck.com', undefined), '')
})

// buildUnsubscribeUrl

Deno.test('buildUnsubscribeUrl — encodes email as base64 token', () => {
  const url = buildUnsubscribeUrl('test@example.com', 'https://supabase.co')
  assertEquals(url.startsWith('https://supabase.co/functions/v1/email-unsubscribe?token='), true)
  // Decode the token to verify
  const token = new URL(url).searchParams.get('token')!
  assertEquals(atob(token), 'test@example.com')
})

Deno.test('buildUnsubscribeUrl — lowercases email', () => {
  const url = buildUnsubscribeUrl('Test@Example.COM', 'https://supabase.co')
  const token = new URL(url).searchParams.get('token')!
  assertEquals(atob(token), 'test@example.com')
})

// buildUnsubscribeFooter

Deno.test('buildUnsubscribeFooter — contains unsubscribe link', () => {
  const footer = buildUnsubscribeFooter('https://example.com/unsub')
  assertEquals(footer.includes('href="https://example.com/unsub"'), true)
  assertEquals(footer.includes('Unsubscribe'), true)
  assertEquals(footer.includes('Phuture Collective'), true)
})

// buildUnsubscribeFooterText

Deno.test('buildUnsubscribeFooterText — contains URL and company name', () => {
  const footer = buildUnsubscribeFooterText('https://example.com/unsub')
  assertEquals(footer.includes('https://example.com/unsub'), true)
  assertEquals(footer.includes('Phuture Collective'), true)
})
