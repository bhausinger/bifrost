/**
 * Number utility functions
 */

/**
 * Clamp a number between min and max values
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Round number to specified decimal places
 */
export const roundTo = (value: number, decimals: number = 2): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Generate random number between min and max
 */
export const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

/**
 * Generate random integer between min and max (inclusive)
 */
export const randomIntBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Check if number is within range
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  return total === 0 ? 0 : (value / total) * 100;
};

/**
 * Calculate percentage change
 */
export const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  return oldValue === 0 ? 0 : ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Safe division (returns 0 if divisor is 0)
 */
export const safeDivide = (dividend: number, divisor: number): number => {
  return divisor === 0 ? 0 : dividend / divisor;
};

/**
 * Calculate average of array of numbers
 */
export const average = (numbers: number[]): number => {
  return numbers.length === 0 ? 0 : numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
};

/**
 * Calculate median of array of numbers
 */
export const median = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

/**
 * Calculate standard deviation
 */
export const standardDeviation = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  
  const avg = average(numbers);
  const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2));
  const avgSquaredDiff = average(squaredDiffs);
  
  return Math.sqrt(avgSquaredDiff);
};

/**
 * Format number with thousands separators
 */
export const addThousandsSeparator = (value: number, separator: string = ','): string => {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
};

/**
 * Check if number is even
 */
export const isEven = (value: number): boolean => {
  return value % 2 === 0;
};

/**
 * Check if number is odd
 */
export const isOdd = (value: number): boolean => {
  return value % 2 !== 0;
};