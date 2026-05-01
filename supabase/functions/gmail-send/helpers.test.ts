import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.177.0/testing/asserts.ts'
import { htmlToText, cleanArtistName, buildMimeMessage } from './helpers.ts'

// ── htmlToText ──────────────────────────────────────────────────────

Deno.test('htmlToText converts <br> to newlines', () => {
  assertEquals(htmlToText('Hello<br>World'), 'Hello\nWorld')
  assertEquals(htmlToText('Hello<br/>World'), 'Hello\nWorld')
  assertEquals(htmlToText('Hello<BR />World'), 'Hello\nWorld')
})

Deno.test('htmlToText converts </p> to double newlines', () => {
  assertEquals(htmlToText('<p>Para 1</p><p>Para 2</p>'), 'Para 1\n\nPara 2')
})

Deno.test('htmlToText strips all HTML tags', () => {
  assertEquals(htmlToText('<b>bold</b> and <i>italic</i>'), 'bold and italic')
  assertEquals(htmlToText('<a href="url">link</a>'), 'link')
})

Deno.test('htmlToText decodes HTML entities', () => {
  assertEquals(htmlToText('&amp; &lt; &gt; &quot; &nbsp;'), '& < > "')
})

Deno.test('htmlToText trims whitespace', () => {
  assertEquals(htmlToText('  hello  '), 'hello')
})

// ── cleanArtistName ─────────────────────────────────────────────────

Deno.test('cleanArtistName removes diacritics', () => {
  assertEquals(cleanArtistName('José García'), 'Jose Garcia')
  assertEquals(cleanArtistName('naïve café'), 'naive cafe')
})

Deno.test('cleanArtistName strips "Stream " prefix', () => {
  assertEquals(cleanArtistName('Stream DJ Beats'), 'DJ Beats')
})

Deno.test('cleanArtistName strips " music" suffix', () => {
  assertEquals(cleanArtistName('Cool Vibes Music'), 'Cool Vibes')
})

Deno.test('cleanArtistName removes non-ASCII characters', () => {
  assertEquals(cleanArtistName('DJ 🎵 Beats'), 'DJ Beats')
})

Deno.test('cleanArtistName defaults to Artist for empty input', () => {
  assertEquals(cleanArtistName(''), 'Artist')
})

Deno.test('cleanArtistName collapses multiple spaces', () => {
  assertEquals(cleanArtistName('DJ    Beats'), 'DJ Beats')
})

// ── buildMimeMessage ────────────────────────────────────────────────

Deno.test('buildMimeMessage includes correct MIME headers', () => {
  const msg = buildMimeMessage({
    to: 'artist@test.com',
    from: 'Ben <ben@agency.com>',
    subject: 'Placement Opportunity',
    htmlBody: '<p>Hello</p>',
    textBody: 'Hello',
    boundary: 'TEST_BOUNDARY',
  })

  assertStringIncludes(msg, 'To: artist@test.com')
  assertStringIncludes(msg, 'From: Ben <ben@agency.com>')
  assertStringIncludes(msg, 'Subject: Placement Opportunity')
  assertStringIncludes(msg, 'MIME-Version: 1.0')
  assertStringIncludes(msg, 'multipart/alternative; boundary="TEST_BOUNDARY"')
})

Deno.test('buildMimeMessage includes both text and HTML parts', () => {
  const msg = buildMimeMessage({
    to: 'test@test.com',
    from: 'sender@test.com',
    subject: 'Test',
    htmlBody: '<b>HTML content</b>',
    textBody: 'Plain content',
    boundary: 'TEST_BOUNDARY',
  })

  assertStringIncludes(msg, 'Content-Type: text/plain; charset="UTF-8"')
  assertStringIncludes(msg, 'Plain content')
  assertStringIncludes(msg, 'Content-Type: text/html; charset="UTF-8"')
  assertStringIncludes(msg, '<b>HTML content</b>')
  assertStringIncludes(msg, '--TEST_BOUNDARY--')
})

Deno.test('buildMimeMessage uses CRLF line endings', () => {
  const msg = buildMimeMessage({
    to: 'a@b.com',
    from: 'c@d.com',
    subject: 'X',
    htmlBody: '<p>Hi</p>',
    textBody: 'Hi',
  })

  assertEquals(msg.includes('\r\n'), true)
})
