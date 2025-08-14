import { z } from 'zod';

/**
 * Email validation utility
 */
export const isValidEmail = (email: string): boolean => {
  const emailSchema = z.string().email();
  return emailSchema.safeParse(email).success;
};

/**
 * URL validation utility
 */
export const isValidUrl = (url: string): boolean => {
  const urlSchema = z.string().url();
  return urlSchema.safeParse(url).success;
};

/**
 * SoundCloud URL validation
 */
export const isValidSoundCloudUrl = (url: string): boolean => {
  if (!isValidUrl(url)) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'soundcloud.com' || urlObj.hostname === 'www.soundcloud.com';
  } catch {
    return false;
  }
};

/**
 * Extract username from SoundCloud URL
 */
export const extractSoundCloudUsername = (url: string): string | null => {
  if (!isValidSoundCloudUrl(url)) return null;
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    return pathParts[0] || null;
  } catch {
    return null;
  }
};

/**
 * Password strength validation
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  errors: string[];
} => {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
};

/**
 * Sanitize input string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .slice(0, 1000); // Limit length
};

/**
 * Validate file type
 */
export const isValidFileType = (filename: string, allowedTypes: string[]): boolean => {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
};

/**
 * Validate file size
 */
export const isValidFileSize = (size: number, maxSizeBytes: number): boolean => {
  return size <= maxSizeBytes;
};

/**
 * Phone number validation (basic)
 */
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
};