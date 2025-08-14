import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { GmailService } from '@/services/GmailService';
import { GmailTokenService } from '@/services/GmailTokenService';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

const router: Router = Router();
const gmailService = new GmailService();
const tokenService = new GmailTokenService();

// Apply auth middleware to all Gmail routes
router.use(authMiddleware);

/**
 * Get Gmail authentication URL
 */
router.get('/auth-url', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authUrl = gmailService.getAuthUrl();
    
    res.status(200).json({
      message: 'Gmail auth URL generated successfully',
      data: {
        authUrl,
        state: req.user?.userId // Include user ID for security
      }
    });
  } catch (error) {
    logger.error('Error generating Gmail auth URL:', error);
    next(new AppError('Failed to generate Gmail authentication URL', 500));
  }
});

/**
 * Handle Gmail OAuth callback
 */
router.post('/callback', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { code, state } = req.body;

    if (!code) {
      return next(new AppError('Authorization code is required', 400));
    }

    // Verify state matches current user (security check)
    if (state !== req.user?.userId) {
      return next(new AppError('Invalid state parameter', 400));
    }

    // Exchange code for tokens
    const tokens = await gmailService.getTokensFromCode(code);
    
    // Set credentials to get user profile
    gmailService.setCredentials(tokens);
    const profile = await gmailService.getUserProfile();

    // Store tokens in database
    await tokenService.storeTokens(req.user!.userId, profile.email, tokens);

    res.status(200).json({
      message: 'Gmail account connected successfully',
      data: {
        email: profile.email,
        name: profile.name
      }
    });
  } catch (error) {
    logger.error('Error handling Gmail callback:', error);
    next(new AppError('Failed to connect Gmail account', 500));
  }
});

/**
 * Get current Gmail connection status
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const hasTokens = await tokenService.hasValidTokens(req.user!.userId);
    const gmailEmail = await tokenService.getUserGmailEmail(req.user!.userId);

    res.status(200).json({
      message: 'Gmail status retrieved successfully',
      data: {
        isConnected: hasTokens,
        email: gmailEmail,
        canSendEmails: hasTokens
      }
    });
  } catch (error) {
    logger.error('Error getting Gmail status:', error);
    next(new AppError('Failed to get Gmail status', 500));
  }
});

/**
 * Disconnect Gmail account
 */
router.delete('/disconnect', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await tokenService.removeTokens(req.user!.userId);

    res.status(200).json({
      message: 'Gmail account disconnected successfully'
    });
  } catch (error) {
    logger.error('Error disconnecting Gmail:', error);
    next(new AppError('Failed to disconnect Gmail account', 500));
  }
});

/**
 * Test Gmail connection by sending a test email
 */
router.post('/test', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tokens = await tokenService.getTokens(req.user!.userId);
    
    if (!tokens) {
      return next(new AppError('Gmail account not connected', 400));
    }

    gmailService.setCredentials(tokens);

    // Check if tokens are still valid
    const isValid = await gmailService.isTokenValid();
    if (!isValid) {
      // Try to refresh tokens
      try {
        const newTokens = await gmailService.refreshTokens();
        await tokenService.updateTokens(req.user!.userId, newTokens);
        gmailService.setCredentials(newTokens);
      } catch (refreshError) {
        return next(new AppError('Gmail tokens expired. Please reconnect your account.', 401));
      }
    }

    // Send test email to user's own email
    const profile = await gmailService.getUserProfile();
    const testMessage = {
      to: profile.email,
      subject: 'Test Email from Campaign Manager',
      body: `This is a test email to verify your Gmail integration is working correctly.\n\nSent at: ${new Date().toISOString()}`,
      isHtml: false
    };

    const messageId = await gmailService.sendEmail(testMessage);

    res.status(200).json({
      message: 'Test email sent successfully',
      data: {
        messageId,
        sentTo: profile.email
      }
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    next(new AppError('Failed to send test email', 500));
  }
});

/**
 * Get Gmail quota information
 */
router.get('/quota', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const tokens = await tokenService.getTokens(req.user!.userId);
    
    if (!tokens) {
      return next(new AppError('Gmail account not connected', 400));
    }

    gmailService.setCredentials(tokens);
    const quotaInfo = await gmailService.getQuotaInfo();

    res.status(200).json({
      message: 'Gmail quota retrieved successfully',
      data: quotaInfo
    });
  } catch (error) {
    logger.error('Error getting Gmail quota:', error);
    next(new AppError('Failed to get Gmail quota', 500));
  }
});

export { router as gmailRoutes };