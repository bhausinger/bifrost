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

/** Build the unsubscribe URL for a recipient email */
export function buildUnsubscribeUrl(recipientEmail: string, supabaseUrl: string): string {
  const token = btoa(recipientEmail.toLowerCase().trim())
  return `${supabaseUrl}/functions/v1/email-unsubscribe?token=${encodeURIComponent(token)}`
}

/** Build the HTML unsubscribe footer appended to every outgoing email */
export function buildUnsubscribeFooter(unsubscribeUrl: string): string {
  return [
    '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;text-align:center;">',
    `Phuture Collective &middot; <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>`,
    '</div>',
  ].join('')
}

/** Build the plain text unsubscribe footer */
export function buildUnsubscribeFooterText(unsubscribeUrl: string): string {
  return `\n\n---\nPhuture Collective · Unsubscribe: ${unsubscribeUrl}`
}
