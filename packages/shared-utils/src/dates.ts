import { 
  format, 
  formatDistanceToNow, 
  isAfter, 
  isBefore, 
  isValid, 
  parseISO, 
  startOfDay, 
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes
} from 'date-fns';

/**
 * Format date for display
 */
export const formatDate = (date: string | Date, formatString: string = 'MMM dd, yyyy'): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, formatString) : 'Invalid Date';
};

/**
 * Format date and time for display
 */
export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MMM dd, yyyy \'at\' h:mm a');
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? formatDistanceToNow(dateObj, { addSuffix: true }) : 'Invalid Date';
};

/**
 * Get time period boundaries
 */
export const getTimePeriod = (period: string, date: Date = new Date()) => {
  switch (period) {
    case 'today':
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };
    case 'week':
      return {
        start: startOfWeek(date, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case 'month':
      return {
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    case 'year':
      return {
        start: startOfYear(date),
        end: endOfYear(date),
      };
    default:
      return {
        start: startOfDay(date),
        end: endOfDay(date),
      };
  }
};

/**
 * Check if date is in the past
 */
export const isInPast = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? isBefore(dateObj, new Date()) : false;
};

/**
 * Check if date is in the future
 */
export const isInFuture = (date: string | Date): boolean => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? isAfter(dateObj, new Date()) : false;
};

/**
 * Get date range for analytics
 */
export const getAnalyticsDateRange = (period: string, customStart?: string, customEnd?: string) => {
  const now = new Date();
  
  if (period === 'custom' && customStart && customEnd) {
    return {
      start: parseISO(customStart),
      end: parseISO(customEnd),
    };
  }
  
  switch (period) {
    case 'last7days':
      return {
        start: addDays(now, -7),
        end: now,
      };
    case 'last30days':
      return {
        start: addDays(now, -30),
        end: now,
      };
    case 'last3months':
      return {
        start: addMonths(now, -3),
        end: now,
      };
    case 'lastyear':
      return {
        start: addYears(now, -1),
        end: now,
      };
    default:
      return getTimePeriod(period, now);
  }
};

/**
 * Calculate time difference in a human readable format
 */
export const getTimeDifference = (startDate: string | Date, endDate: string | Date): string => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  
  if (!isValid(start) || !isValid(end)) return 'Invalid dates';
  
  const days = differenceInDays(end, start);
  const hours = differenceInHours(end, start);
  const minutes = differenceInMinutes(end, start);
  
  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
};

/**
 * Check if a date is within business hours
 */
export const isBusinessHours = (date: Date, timezone: string = 'UTC'): boolean => {
  const hour = date.getHours();
  return hour >= 9 && hour <= 17; // 9 AM to 5 PM
};

/**
 * Get next business day
 */
export const getNextBusinessDay = (date: Date): Date => {
  let nextDay = addDays(date, 1);
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) { // Skip weekends
    nextDay = addDays(nextDay, 1);
  }
  return nextDay;
};

/**
 * Convert timezone
 */
export const convertTimezone = (date: Date, timezone: string): string => {
  return date.toLocaleString('en-US', { timeZone: timezone });
};

/**
 * Generate date range array
 */
export const generateDateRange = (start: Date, end: Date, step: 'day' | 'week' | 'month' = 'day'): Date[] => {
  const dates: Date[] = [];
  let current = new Date(start);
  
  while (current <= end) {
    dates.push(new Date(current));
    
    switch (step) {
      case 'day':
        current = addDays(current, 1);
        break;
      case 'week':
        current = addWeeks(current, 1);
        break;
      case 'month':
        current = addMonths(current, 1);
        break;
    }
  }
  
  return dates;
};