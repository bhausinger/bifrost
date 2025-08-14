/**
 * Application constants
 */

// File size limits
export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024, // 5MB
  BANNER: 10 * 1024 * 1024, // 10MB
  DOCUMENT: 50 * 1024 * 1024, // 50MB
  AUDIO: 100 * 1024 * 1024, // 100MB
} as const;

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  AUDIO: ['mp3', 'wav', 'flac', 'aac', 'm4a'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt'],
  ARCHIVE: ['zip', 'rar', '7z'],
} as const;

// Social media platforms
export const PLATFORMS = {
  SOUNDCLOUD: 'soundcloud',
  SPOTIFY: 'spotify',
  YOUTUBE: 'youtube',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
  TWITTER: 'twitter',
  FACEBOOK: 'facebook',
} as const;

// Platform URLs
export const PLATFORM_URLS = {
  [PLATFORMS.SOUNDCLOUD]: 'https://soundcloud.com',
  [PLATFORMS.SPOTIFY]: 'https://open.spotify.com',
  [PLATFORMS.YOUTUBE]: 'https://youtube.com',
  [PLATFORMS.INSTAGRAM]: 'https://instagram.com',
  [PLATFORMS.TIKTOK]: 'https://tiktok.com',
  [PLATFORMS.TWITTER]: 'https://twitter.com',
  [PLATFORMS.FACEBOOK]: 'https://facebook.com',
} as const;

// Music genres
export const MUSIC_GENRES = [
  'Electronic',
  'Hip Hop',
  'Pop',
  'Rock',
  'Indie',
  'R&B',
  'Jazz',
  'Classical',
  'Country',
  'Folk',
  'Reggae',
  'Latin',
  'World',
  'House',
  'Techno',
  'Dubstep',
  'Trap',
  'Lo-fi',
  'Ambient',
  'Alternative',
  'Funk',
  'Soul',
  'Blues',
  'Punk',
  'Metal',
] as const;

// Email templates
export const EMAIL_TEMPLATE_VARIABLES = [
  '{{artist_name}}',
  '{{artist_username}}',
  '{{campaign_name}}',
  '{{sender_name}}',
  '{{sender_email}}',
  '{{artist_followers}}',
  '{{artist_tracks}}',
  '{{platform}}',
  '{{date}}',
  '{{unsubscribe_link}}',
] as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  API_REQUESTS_PER_MINUTE: 60,
  API_REQUESTS_PER_HOUR: 1000,
  EMAIL_SENDS_PER_HOUR: 100,
  SCRAPING_REQUESTS_PER_MINUTE: 10,
} as const;

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MMM dd, yyyy',
  LONG: 'MMMM dd, yyyy',
  WITH_TIME: 'MMM dd, yyyy \\at h:mm a',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  TIME_ONLY: 'h:mm a',
} as const;

// Time periods
export const TIME_PERIODS = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
} as const;

// Chart colors
export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
] as const;

// Status colors
export const STATUS_COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  neutral: '#6B7280',
} as const;

// Campaign types
export const CAMPAIGN_TYPES = {
  PROMOTION: 'promotion',
  DISCOVERY: 'discovery',
  OUTREACH: 'outreach',
  COLLABORATION: 'collaboration',
} as const;

// Campaign statuses
export const CAMPAIGN_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Email statuses
export const EMAIL_STATUSES = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  REPLIED: 'replied',
  BOUNCED: 'bounced',
  FAILED: 'failed',
} as const;

// User roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  CAMPAIGNS: '/api/campaigns',
  ARTISTS: '/api/artists',
  OUTREACH: '/api/outreach',
  ANALYTICS: '/api/analytics',
  FINANCE: '/api/finance',
  SCRAPER: '/api/scraper',
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// Regex patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  URL: /^https?:\/\/.+/,
  SOUNDCLOUD_URL: /^https?:\/\/(www\.)?soundcloud\.com\/.+/,
} as const;