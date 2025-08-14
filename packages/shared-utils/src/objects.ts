/**
 * Object utility functions
 */

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  return obj;
};

/**
 * Pick specific keys from object
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

/**
 * Omit specific keys from object
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};

/**
 * Get nested property value safely
 */
export const get = <T>(
  obj: Record<string, any>,
  path: string,
  defaultValue?: T
): T | undefined => {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current as T;
};

/**
 * Set nested property value safely
 */
export const set = (
  obj: Record<string, any>,
  path: string,
  value: any
): Record<string, any> => {
  const keys = path.split('.');
  const result = deepClone(obj);
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
};

/**
 * Merge objects deeply
 */
export const merge = <T extends Record<string, any>>(
  target: T,
  ...sources: Partial<T>[]
): T => {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {} as T[Extract<keyof T, string>];
        }
        merge(target[key] as Record<string, any>, source[key] as Record<string, any>);
      } else {
        target[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
  }
  
  return merge(target, ...sources);
};

/**
 * Transform object keys
 */
export const mapKeys = <T extends Record<string, any>>(
  obj: T,
  transform: (key: string) => string
): Record<string, T[keyof T]> => {
  const result: Record<string, T[keyof T]> = {};
  for (const key in obj) {
    result[transform(key)] = obj[key];
  }
  return result;
};

/**
 * Transform object values
 */
export const mapValues = <T extends Record<string, any>, U>(
  obj: T,
  transform: (value: T[keyof T], key: string) => U
): Record<keyof T, U> => {
  const result = {} as Record<keyof T, U>;
  for (const key in obj) {
    result[key] = transform(obj[key], key);
  }
  return result;
};

/**
 * Convert object to array of key-value pairs
 */
export const toPairs = <T>(
  obj: Record<string, T>
): Array<[string, T]> => {
  return Object.entries(obj);
};

/**
 * Convert array of key-value pairs to object
 */
export const fromPairs = <T>(
  pairs: Array<[string, T]>
): Record<string, T> => {
  const result: Record<string, T> = {};
  pairs.forEach(([key, value]) => {
    result[key] = value;
  });
  return result;
};