/**
 * Error handling utilities
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errorCode?: string,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, true, 'VALIDATION_ERROR', context);
  }
}

/**
 * Authentication error class
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error class
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

/**
 * Conflict error class
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

/**
 * Rate limit error class
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

/**
 * External service error class
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `External service ${service} is unavailable`,
      503,
      true,
      'EXTERNAL_SERVICE_ERROR',
      { service }
    );
  }
}

/**
 * Error result type for safe error handling
 */
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

/**
 * Safe async function wrapper
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>
): Promise<Result<T>> => {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Safe sync function wrapper
 */
export const safe = <T>(
  fn: () => T
): Result<T> => {
  try {
    const data = fn();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Check if error is operational
 */
export const isOperationalError = (error: Error): boolean => {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
};

/**
 * Format error for logging
 */
export const formatError = (error: Error): Record<string, any> => {
  const baseInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };

  if (error instanceof AppError) {
    return {
      ...baseInfo,
      statusCode: error.statusCode,
      errorCode: error.errorCode,
      isOperational: error.isOperational,
      context: error.context,
    };
  }

  return baseInfo;
};

/**
 * Create error response object
 */
export const createErrorResponse = (error: Error) => {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
        statusCode: error.statusCode,
        context: error.context,
      },
    };
  }

  return {
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    },
  };
};