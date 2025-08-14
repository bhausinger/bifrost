import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { supabase } from '@/config/supabase';
import { config } from '@/config/environment';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        return next(new AppError('User already exists with this email', 400));
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user in database
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: 'USER'
        })
        .select('id, email, first_name, last_name, role, created_at')
        .single();

      if (error) {
        logger.error('Database error during registration:', error);
        return next(new AppError('Failed to create user', 500));
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role
        },
        token
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(new AppError('Registration failed', 500));
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password_hash, first_name, last_name, role')
        .eq('email', email)
        .single();

      if (error || !user) {
        return next(new AppError('Invalid email or password', 401));
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return next(new AppError('Invalid email or password', 401));
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id);

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      res.status(200).json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        token
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(new AppError('Login failed', 500));
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement token refresh
      res.status(200).json({
        message: 'Token refresh endpoint - not implemented yet'
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(new AppError('Token refresh failed', 500));
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      // TODO: Implement user logout
      res.status(200).json({
        message: 'User logout endpoint - not implemented yet'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(new AppError('Logout failed', 500));
    }
  }
}