import { Request } from 'express';
import { authenticateToken } from './authenticateToken';

// Re-export the global type for convenience
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    isAdmin?: boolean;
  };
}

export const authMiddleware = authenticateToken;