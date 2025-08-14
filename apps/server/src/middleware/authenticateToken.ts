import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { config } from '@/config/environment';

interface UserPayload {
  userId: string;
  email: string;
  isAdmin?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  // Check for admin bypass header or development mode
  const adminBypass = req.headers['x-admin-bypass'];
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Allow bypass for development testing
  if (isDevelopment && (adminBypass === 'benjamin.hausinger@gmail.com' || !req.headers['authorization'])) {
    req.user = {
      userId: 'admin-user-id',
      email: 'benjamin.hausinger@gmail.com',
      isAdmin: true
    };
    console.log('🔓 Admin bypass enabled for development testing');
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return next(new AppError('Access token required', 401));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as UserPayload;
    
    // Admin bypass for benjamin.hausinger@gmail.com
    if (decoded.email === 'benjamin.hausinger@gmail.com') {
      decoded.isAdmin = true;
      console.log('Admin access granted for benjamin.hausinger@gmail.com');
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired token', 403));
  }
}