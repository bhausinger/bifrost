/**
 * String utility functions
 */

/**
 * Generate a random string
 */
export const generateRandomString = (length: number = 8): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Convert string to slug format
 */
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Capitalize first letter
 */
export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

/**
 * Convert to title case
 */
export const toTitleCase = (text: string): string => {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

/**
 * Extract initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);
};

/**
 * Remove HTML tags from string
 */
export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML characters
 */
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Check if string contains only ASCII characters
 */
export const isAscii = (text: string): boolean => {
  return /^[\x00-\x7F]*$/.test(text);
};

/**
 * Count words in text
 */
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).length;
};

/**
 * Generate hash from string (simple hash function)
 */
export const simpleHash = (text: string): number => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
};