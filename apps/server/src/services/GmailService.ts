import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

export interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}

export class GmailService {
  private oauth2Client: OAuth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.apis.gmail.clientId,
      config.apis.gmail.clientSecret,
      `${process.env.NODE_ENV === 'production' ? 'https://yourapp.com' : 'http://localhost:3002'}/auth/gmail/callback`
    );
  }

  /**
   * Generate OAuth URL for Gmail authentication
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<GmailTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      logger.info('Gmail tokens obtained successfully');
      
      return {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        expiry_date: tokens.expiry_date || undefined
      };
    } catch (error) {
      logger.error('Error getting Gmail tokens:', error);
      throw new Error('Failed to obtain Gmail tokens');
    }
  }

  /**
   * Set credentials for the OAuth client
   */
  setCredentials(tokens: GmailTokens): void {
    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    });
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokens(): Promise<GmailTokens> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      logger.info('Gmail tokens refreshed successfully');
      
      return {
        access_token: credentials.access_token!,
        refresh_token: credentials.refresh_token!,
        expiry_date: credentials.expiry_date || undefined
      };
    } catch (error) {
      logger.error('Error refreshing Gmail tokens:', error);
      throw new Error('Failed to refresh Gmail tokens');
    }
  }

  /**
   * Send an email via Gmail API
   */
  async sendEmail(message: EmailMessage): Promise<string> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Create the email content
      const emailContent = this.createEmailContent(message);

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(emailContent).toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        }
      });

      logger.info(`Email sent successfully. Message ID: ${response.data.id}`);
      return response.data.id!;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Get user's Gmail profile information
   */
  async getUserProfile(): Promise<{ email: string; name?: string }> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });

      // Also get user info from People API
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const userInfo = await oauth2.userinfo.get();

      return {
        email: profile.data.emailAddress!,
        name: userInfo.data.name || undefined
      };
    } catch (error) {
      logger.error('Error getting Gmail profile:', error);
      throw new Error('Failed to get Gmail profile');
    }
  }

  /**
   * Check if tokens are valid and not expired
   */
  async isTokenValid(): Promise<boolean> {
    try {
      await this.getUserProfile();
      return true;
    } catch (error) {
      logger.warn('Gmail tokens are invalid or expired');
      return false;
    }
  }

  /**
   * Create raw email content in RFC 2822 format
   */
  private createEmailContent(message: EmailMessage): string {
    const boundary = 'boundary_' + Math.random().toString(36).substring(2);
    const contentType = message.isHtml ? 'text/html' : 'text/plain';

    const emailLines = [
      `To: ${message.to}`,
      `Subject: ${message.subject}`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: ${contentType}; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      '',
      message.body,
      '',
      `--${boundary}--`
    ];

    return emailLines.join('\r\n');
  }

  /**
   * Get email sending quota information
   */
  async getQuotaInfo(): Promise<{ dailyLimit: number; currentUsage: number }> {
    // Gmail API doesn't provide direct quota info, so we return standard limits
    // In production, you might want to track usage in your database
    return {
      dailyLimit: 500, // Standard Gmail limit
      currentUsage: 0 // Would need to track this in database
    };
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Parse template variables in email content
   */
  static parseTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, value);
    }
    
    return result;
  }
}