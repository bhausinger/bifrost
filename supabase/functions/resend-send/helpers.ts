/**
 * Pure helper functions for resend-send edge function.
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
 * Replace template variables in a string.
 * Supported: {{artistName}}, {{deckLink}}, {{senderName}}, {{spotifyUrl}}
 */
export function personalizeTemplate(
  template: string,
  vars: {
    artistName: string
    deckLink: string
    senderName: string
    spotifyUrl: string
  },
): string {
  return template
    .replace(/\{\{artistName\}\}/g, vars.artistName)
    .replace(/\{\{deckLink\}\}/g, vars.deckLink)
    .replace(/\{\{senderName\}\}/g, vars.senderName)
    .replace(/\{\{spotifyUrl\}\}/g, vars.spotifyUrl)
}

/** Build a deck link HTML anchor or fallback to plain text */
export function buildDeckLink(url: string | undefined, text: string | undefined): string {
  if (url && text) return `<a href="${url}">${text}</a>`
  return text || ''
}
