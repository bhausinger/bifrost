import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { supabase } from '@/config/supabase';
import { config } from '@/config/environment';
import { AuthenticatedRequest } from '@/middleware/auth';

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
        { expiresIn: '1d' }
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

      // Generate JWT tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: '1d' }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.refreshSecret,
        { expiresIn: '30d' }
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
        accessToken,
        refreshToken,
        // Keep backward compatibility
        token: accessToken
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(new AppError('Login failed', 500));
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return next(new AppError('Refresh token is required', 400));
      }

      try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
        
        // Get user from database
        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name, role')
          .eq('id', decoded.userId)
          .single();

        if (error || !user) {
          return next(new AppError('Invalid refresh token', 401));
        }

        // Generate new access token
        const newAccessToken = jwt.sign(
          { userId: user.id, email: user.email },
          config.jwt.secret,
          { expiresIn: '1d' }
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
          { userId: user.id, email: user.email },
          config.jwt.refreshSecret,
          { expiresIn: '30d' }
        );

        res.status(200).json({
          message: 'Token refreshed successfully',
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: user.role
          }
        });
      } catch (tokenError) {
        return next(new AppError('Invalid refresh token', 401));
      }
    } catch (error) {
      logger.error('Token refresh error:', error);
      next(new AppError('Token refresh failed', 500));
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        return next(new AppError('Email is required', 400));
      }

      // Check if user exists
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, first_name')
        .eq('email', email)
        .single();

      // Always return success message for security (don't reveal if email exists)
      if (error || !user) {
        return res.status(200).json({
          message: 'If the email exists in our system, you will receive a password reset link'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Store reset token in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_reset_token: resetTokenHash,
          password_reset_expires: resetTokenExpiry.toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        logger.error('Failed to store reset token:', updateError);
        return next(new AppError('Failed to process password reset request', 500));
      }

      // TODO: Send email with reset link
      // For now, we'll log the reset token (in production, this should be emailed)
      const resetUrl = `${config.frontend.url}/reset-password?token=${resetToken}`;
      logger.info(`Password reset requested for ${email}. Reset URL: ${resetUrl}`);

      res.status(200).json({
        message: 'If the email exists in our system, you will receive a password reset link',
        // TODO: Remove this in production
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      next(new AppError('Password reset request failed', 500));
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return next(new AppError('Token and new password are required', 400));
      }

      if (newPassword.length < 8) {
        return next(new AppError('Password must be at least 8 characters long', 400));
      }

      // Hash the provided token
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      // Find user with valid reset token
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, password_reset_token, password_reset_expires')
        .eq('password_reset_token', hashedToken)
        .gt('password_reset_expires', new Date().toISOString())
        .single();

      if (error || !user) {
        return next(new AppError('Invalid or expired reset token', 400));
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_reset_token: null,
          password_reset_expires: null
        })
        .eq('id', user.id);

      if (updateError) {
        logger.error('Failed to update password:', updateError);
        return next(new AppError('Failed to reset password', 500));
      }

      res.status(200).json({
        message: 'Password reset successfully'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      next(new AppError('Password reset failed', 500));
    }
  }

  async logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // In a stateless JWT system, logout is handled client-side by removing the token
      // However, we can log the logout event and optionally blacklist the token
      
      if (req.user) {
        logger.info(`User ${req.user.email} logged out`);
      }

      res.status(200).json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(new AppError('Logout failed', 500));
    }
  }
}