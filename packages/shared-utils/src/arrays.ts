/**
 * Array utility functions
 */

/**
 * Remove duplicates from array
 */
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

/**
 * Chunk array into smaller arrays of specified size
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Shuffle array randomly
 */
export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Get random item from array
 */
export const randomItem = <T>(array: T[]): T | undefined => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Get multiple random items from array
 */
export const randomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = shuffle(array);
  return shuffled.slice(0, Math.min(count, array.length));
};

/**
 * Group array by key function
 */
export const groupBy = <T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    groups[key] = groups[key] || [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

/**
 * Sort array by key function
 */
export const sortBy = <T>(
  array: T[],
  keyFn: (item: T) => string | number,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aKey = keyFn(a);
    const bKey = keyFn(b);
    
    if (aKey < bKey) return direction === 'asc' ? -1 : 1;
    if (aKey > bKey) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Find difference between two arrays
 */
export const difference = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter(item => !array2.includes(item));
};

/**
 * Find intersection of two arrays
 */
export const intersection = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter(item => array2.includes(item));
};

/**
 * Move item in array from one index to another
 */
export const moveItem = <T>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

/**
 * Paginate array
 */
export const paginate = <T>(array: T[], page: number, pageSize: number): {
  data: T[];
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
} => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const data = array.slice(startIndex, endIndex);
  const totalPages = Math.ceil(array.length / pageSize);
  
  return {
    data,
    totalPages,
    currentPage: page,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};