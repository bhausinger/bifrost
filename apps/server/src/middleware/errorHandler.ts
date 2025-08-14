import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { config } from '@/config/environment';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  public readonly statusCode: number;
  public readonly isOperational: boolean = true;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { statusCode = 500, message, stack } = error;

  logger.error('Error occurred:', {
    statusCode,
    message,
    stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  const response = {
    error: {
      message,
      ...(config.nodeEnv === 'development' && { stack }),
    },
  };

  res.status(statusCode).json(response);
};