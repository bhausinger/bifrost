/**
 * Pure helper functions for gmail-send edge function.
 * Extracted to enable unit testing without mocking serve().
 */

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

export function cleanArtistName(name: string): string {
  return (name || 'Artist')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/^Stream\s+/i, '')
    .replace(/\s+music$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Build a MIME multipart/alternative message with text and HTML parts.
 * Returns the raw message string (NOT base64-encoded).
 * The caller is responsible for base64url encoding before sending to Gmail API.
 */
export function buildMimeMessage(opts: {
  to: string
  from: string
  subject: string
  htmlBody: string
  textBody: string
  boundary?: string
}): string {
  const boundary = opts.boundary ?? '----BifrostTestBoundary'

  const headers = [
    `To: ${opts.to}`,
    `From: ${opts.from}`,
    `Subject: ${opts.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]

  return [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n')
}
