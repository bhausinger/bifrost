import { PrismaClient } from '@prisma/client';
import { GmailTokens } from './GmailService';
import { logger } from '@/utils/logger';

interface StoredGmailTokens extends GmailTokens {
  userId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GmailTokenService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Store Gmail tokens for a user
   */
  async storeTokens(userId: string, email: string, tokens: GmailTokens): Promise<void> {
    try {
      await this.prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: 'gmail_tokens'
          }
        },
        update: {
          value: JSON.stringify({
            ...tokens,
            email,
            updatedAt: new Date()
          })
        },
        create: {
          userId,
          key: 'gmail_tokens',
          value: JSON.stringify({
            ...tokens,
            email,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      });

      logger.info(`Gmail tokens stored for user ${userId}`);
    } catch (error) {
      logger.error('Error storing Gmail tokens:', error);
      throw new Error('Failed to store Gmail tokens');
    }
  }

  /**
   * Retrieve Gmail tokens for a user
   */
  async getTokens(userId: string): Promise<StoredGmailTokens | null> {
    try {
      const setting = await this.prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'gmail_tokens'
          }
        }
      });

      if (!setting) {
        return null;
      }

      const tokenData = JSON.parse(setting.value);
      return {
        userId,
        ...tokenData
      };
    } catch (error) {
      logger.error('Error retrieving Gmail tokens:', error);
      return null;
    }
  }

  /**
   * Update stored tokens (useful after refresh)
   */
  async updateTokens(userId: string, tokens: Partial<GmailTokens>): Promise<void> {
    try {
      const existing = await this.getTokens(userId);
      if (!existing) {
        throw new Error('No tokens found to update');
      }

      const updatedTokens = {
        ...existing,
        ...tokens,
        updatedAt: new Date()
      };

      await this.prisma.userSetting.update({
        where: {
          userId_key: {
            userId,
            key: 'gmail_tokens'
          }
        },
        data: {
          value: JSON.stringify(updatedTokens)
        }
      });

      logger.info(`Gmail tokens updated for user ${userId}`);
    } catch (error) {
      logger.error('Error updating Gmail tokens:', error);
      throw new Error('Failed to update Gmail tokens');
    }
  }

  /**
   * Remove Gmail tokens for a user
   */
  async removeTokens(userId: string): Promise<void> {
    try {
      await this.prisma.userSetting.delete({
        where: {
          userId_key: {
            userId,
            key: 'gmail_tokens'
          }
        }
      });

      logger.info(`Gmail tokens removed for user ${userId}`);
    } catch (error) {
      logger.error('Error removing Gmail tokens:', error);
      throw new Error('Failed to remove Gmail tokens');
    }
  }

  /**
   * Check if user has valid Gmail tokens
   */
  async hasValidTokens(userId: string): Promise<boolean> {
    const tokens = await this.getTokens(userId);
    
    if (!tokens || !tokens.access_token || !tokens.refresh_token) {
      return false;
    }

    // Check if tokens are expired (with 5 minute buffer)
    if (tokens.expiry_date) {
      const expiryTime = new Date(tokens.expiry_date);
      const now = new Date();
      const buffer = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (now.getTime() > (expiryTime.getTime() - buffer)) {
        logger.info(`Gmail tokens expired for user ${userId}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get user's connected Gmail email address
   */
  async getUserGmailEmail(userId: string): Promise<string | null> {
    const tokens = await this.getTokens(userId);
    return tokens?.email || null;
  }

  /**
   * List all users with Gmail integration
   */
  async getUsersWithGmail(): Promise<Array<{ userId: string; email: string; connectedAt: Date }>> {
    try {
      const settings = await this.prisma.userSetting.findMany({
        where: {
          key: 'gmail_tokens'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      return settings.map(setting => {
        const tokenData = JSON.parse(setting.value);
        return {
          userId: setting.userId,
          email: tokenData.email,
          connectedAt: new Date(tokenData.createdAt)
        };
      });
    } catch (error) {
      logger.error('Error getting users with Gmail:', error);
      return [];
    }
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const settings = await this.prisma.userSetting.findMany({
        where: {
          key: 'gmail_tokens'
        }
      });

      let cleanedCount = 0;
      const now = new Date();

      for (const setting of settings) {
        try {
          const tokenData = JSON.parse(setting.value);
          
          if (tokenData.expiry_date) {
            const expiryTime = new Date(tokenData.expiry_date);
            
            // If expired over 30 days ago, remove
            if (now.getTime() > (expiryTime.getTime() + (30 * 24 * 60 * 60 * 1000))) {
              await this.removeTokens(setting.userId);
              cleanedCount++;
            }
          }
        } catch (parseError) {
          logger.warn(`Invalid token data for user ${setting.userId}, removing`);
          await this.removeTokens(setting.userId);
          cleanedCount++;
        }
      }

      logger.info(`Cleaned up ${cleanedCount} expired Gmail token entries`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}