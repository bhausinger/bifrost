import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // TODO: Implement JWT token validation
    // For now, just pass through - this will be implemented later
    req.user = {
      id: 'temp-user-id',
      email: 'temp@example.com',
      role: 'user'
    };
    
    next();
  } catch (error) {
    next(new AppError('Authentication failed', 401));
  }
};