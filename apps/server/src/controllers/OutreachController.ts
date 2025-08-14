import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { GmailService } from '@/services/GmailService';
import { GmailTokenService } from '@/services/GmailTokenService';
import { AuthenticatedRequest } from '@/middleware/auth';
import { z } from 'zod';

const prisma = new PrismaClient();
const gmailService = new GmailService();
const tokenService = new GmailTokenService();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  templateId: z.string().min(1, 'Template ID is required'),
  targetArtistIds: z.array(z.string()).min(1, 'At least one artist must be selected'),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional(),
  sendingSchedule: z.object({
    emailsPerDay: z.number().min(1).max(500).default(50),
    startTime: z.string().default('09:00'),
    endTime: z.string().default('17:00'),
    timezone: z.string().default('UTC')
  }).optional(),
  tags: z.array(z.string()).default([])
});

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  type: z.enum(['INITIAL_OUTREACH', 'FOLLOW_UP', 'COLLABORATION_PROPOSAL', 'THANK_YOU', 'REJECTION_RESPONSE']),
  variables: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false)
});

export class OutreachController {
  async getOutreachCampaigns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const campaigns = await prisma.outreachCampaign.findMany({
        where: {
          ownerId: req.user!.userId
        },
        include: {
          template: true,
          emails: {
            select: {
              id: true,
              status: true,
              sentBy: true,
              createdAt: true
            }
          },
          _count: {
            select: {
              emails: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Add statistics for each campaign
      const campaignsWithStats = campaigns.map(campaign => ({
        ...campaign,
        statistics: {
          totalEmails: campaign._count.emails,
          sentEmails: campaign.emails.filter(e => e.status === 'SENT' || e.status === 'DELIVERED').length,
          draftEmails: campaign.emails.filter(e => e.status === 'DRAFT').length,
          scheduledEmails: campaign.emails.filter(e => e.status === 'SCHEDULED').length,
          repliedEmails: campaign.emails.filter(e => e.status === 'REPLIED').length
        }
      }));

      res.status(200).json({
        message: 'Outreach campaigns retrieved successfully',
        data: campaignsWithStats,
        count: campaigns.length
      });
    } catch (error) {
      logger.error('Get outreach campaigns error:', error);
      next(new AppError('Failed to get outreach campaigns', 500));
    }
  }

  async createOutreachCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedData = createCampaignSchema.parse(req.body);

      // Verify template exists and belongs to user
      const template = await prisma.emailTemplate.findFirst({
        where: {
          id: validatedData.templateId,
          ownerId: req.user!.userId
        }
      });

      if (!template) {
        return next(new AppError('Template not found', 404));
      }

      // Verify all artists exist and have email contact info
      const artists = await prisma.artist.findMany({
        where: {
          id: {
            in: validatedData.targetArtistIds
          }
        }
      });

      if (artists.length !== validatedData.targetArtistIds.length) {
        return next(new AppError('Some artists not found', 400));
      }

      // Check which artists have email contact info
      const artistsWithEmails = artists.filter(artist => {
        if (!artist.contactInfo) return false;
        const contactInfo = typeof artist.contactInfo === 'string' 
          ? JSON.parse(artist.contactInfo) 
          : artist.contactInfo;
        return contactInfo?.email && contactInfo?.hasEmail === true;
      });

      if (artistsWithEmails.length === 0) {
        return next(new AppError('No artists have email contact information', 400));
      }

      // Create outreach campaign
      const campaign = await prisma.outreachCampaign.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          templateId: validatedData.templateId,
          targetArtistIds: artistsWithEmails.map(a => a.id),
          scheduledStartDate: validatedData.scheduledStartDate ? new Date(validatedData.scheduledStartDate) : null,
          scheduledEndDate: validatedData.scheduledEndDate ? new Date(validatedData.scheduledEndDate) : null,
          sendingSchedule: validatedData.sendingSchedule || {
            emailsPerDay: 50,
            startTime: '09:00',
            endTime: '17:00',
            timezone: 'UTC'
          },
          tags: validatedData.tags,
          ownerId: req.user!.userId
        },
        include: {
          template: true
        }
      });

      // Create email records for each artist
      const emailRecords = artistsWithEmails.map(artist => {
        const contactInfo = typeof artist.contactInfo === 'string' 
          ? JSON.parse(artist.contactInfo) 
          : artist.contactInfo;

        return {
          outreachCampaignId: campaign.id,
          artistId: artist.id,
          templateId: template.id,
          recipientEmail: contactInfo.email,
          recipientName: artist.displayName || artist.name,
          subject: template.subject,
          body: template.body,
          sentBy: req.user!.email
        };
      });

      await prisma.emailRecord.createMany({
        data: emailRecords
      });

      res.status(201).json({
        message: 'Outreach campaign created successfully',
        data: {
          ...campaign,
          emailsCreated: emailRecords.length,
          artistsSkipped: artists.length - artistsWithEmails.length
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400));
      }
      logger.error('Create outreach campaign error:', error);
      next(new AppError('Failed to create outreach campaign', 500));
    }
  }

  async getOutreachCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const campaign = await prisma.outreachCampaign.findFirst({
        where: {
          id,
          ownerId: req.user!.userId
        },
        include: {
          template: true,
          emails: {
            include: {
              artist: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  contactInfo: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!campaign) {
        return next(new AppError('Outreach campaign not found', 404));
      }

      res.status(200).json({
        message: 'Outreach campaign retrieved successfully',
        data: campaign
      });
    } catch (error) {
      logger.error('Get outreach campaign error:', error);
      next(new AppError('Failed to get outreach campaign', 500));
    }
  }

  async updateOutreachCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingCampaign = await prisma.outreachCampaign.findFirst({
        where: {
          id,
          ownerId: req.user!.userId
        }
      });

      if (!existingCampaign) {
        return next(new AppError('Outreach campaign not found', 404));
      }

      const updatedCampaign = await prisma.outreachCampaign.update({
        where: { id },
        data: {
          name: updateData.name,
          description: updateData.description,
          status: updateData.status,
          scheduledStartDate: updateData.scheduledStartDate ? new Date(updateData.scheduledStartDate) : undefined,
          scheduledEndDate: updateData.scheduledEndDate ? new Date(updateData.scheduledEndDate) : undefined,
          sendingSchedule: updateData.sendingSchedule,
          tags: updateData.tags
        },
        include: {
          template: true
        }
      });

      res.status(200).json({
        message: 'Outreach campaign updated successfully',
        data: updatedCampaign
      });
    } catch (error) {
      logger.error('Update outreach campaign error:', error);
      next(new AppError('Failed to update outreach campaign', 500));
    }
  }

  async deleteOutreachCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const existingCampaign = await prisma.outreachCampaign.findFirst({
        where: {
          id,
          ownerId: req.user!.userId
        }
      });

      if (!existingCampaign) {
        return next(new AppError('Outreach campaign not found', 404));
      }

      await prisma.outreachCampaign.delete({
        where: { id }
      });

      res.status(200).json({
        message: 'Outreach campaign deleted successfully'
      });
    } catch (error) {
      logger.error('Delete outreach campaign error:', error);
      next(new AppError('Failed to delete outreach campaign', 500));
    }
  }

  async sendEmails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { campaignId, emailIds } = req.body;

      if (!campaignId) {
        return next(new AppError('Campaign ID is required', 400));
      }

      // Verify campaign belongs to user
      const campaign = await prisma.outreachCampaign.findFirst({
        where: {
          id: campaignId,
          ownerId: req.user!.userId
        },
        include: {
          template: true
        }
      });

      if (!campaign) {
        return next(new AppError('Campaign not found', 404));
      }

      // Check Gmail connection
      const tokens = await tokenService.getTokens(req.user!.userId);
      if (!tokens) {
        return next(new AppError('Gmail account not connected', 400));
      }

      gmailService.setCredentials(tokens);

      // Get emails to send
      const whereClause: any = {
        outreachCampaignId: campaignId,
        status: 'DRAFT'
      };

      if (emailIds && emailIds.length > 0) {
        whereClause.id = { in: emailIds };
      }

      const emailsToSend = await prisma.emailRecord.findMany({
        where: whereClause,
        include: {
          artist: true
        },
        take: 50 // Limit to 50 emails per batch
      });

      if (emailsToSend.length === 0) {
        return next(new AppError('No emails to send', 400));
      }

      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const email of emailsToSend) {
        try {
          // Parse template variables
          const variables = {
            artistName: email.artist.displayName || email.artist.name,
            artistGenres: email.artist.genres?.join(', ') || 'Unknown',
            recipientName: email.recipientName
          };

          const parsedSubject = GmailService.parseTemplate(email.subject, variables);
          const parsedBody = GmailService.parseTemplate(email.body, variables);

          // Send email
          const messageId = await gmailService.sendEmail({
            to: email.recipientEmail,
            subject: parsedSubject,
            body: parsedBody,
            isHtml: false
          });

          // Update email record
          await prisma.emailRecord.update({
            where: { id: email.id },
            data: {
              status: 'SENT',
              subject: parsedSubject,
              body: parsedBody,
              tracking: {
                sentAt: new Date().toISOString(),
                messageId,
                variables
              }
            }
          });

          // Update artist last contacted
          await prisma.artist.update({
            where: { id: email.artistId },
            data: {
              lastContactedAt: new Date()
            }
          });

          results.push({
            emailId: email.id,
            artistName: email.artist.name,
            status: 'sent',
            messageId
          });

          successCount++;

          // Add delay between emails (rate limiting)
          if (emailsToSend.indexOf(email) < emailsToSend.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }

        } catch (emailError) {
          logger.error(`Failed to send email ${email.id}:`, emailError);
          
          await prisma.emailRecord.update({
            where: { id: email.id },
            data: {
              status: 'FAILED',
              tracking: {
                failedAt: new Date().toISOString(),
                error: emailError instanceof Error ? emailError.message : 'Unknown error'
              }
            }
          });

          results.push({
            emailId: email.id,
            artistName: email.artist.name,
            status: 'failed',
            error: emailError instanceof Error ? emailError.message : 'Unknown error'
          });

          failureCount++;
        }
      }

      res.status(200).json({
        message: 'Email sending completed',
        data: {
          campaign: campaign.name,
          totalProcessed: emailsToSend.length,
          successCount,
          failureCount,
          results
        }
      });

    } catch (error) {
      logger.error('Send emails error:', error);
      next(new AppError('Failed to send emails', 500));
    }
  }

  async getTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const templates = await prisma.emailTemplate.findMany({
        where: {
          ownerId: req.user!.userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.status(200).json({
        message: 'Email templates retrieved successfully',
        data: templates,
        count: templates.length
      });
    } catch (error) {
      logger.error('Get templates error:', error);
      next(new AppError('Failed to get templates', 500));
    }
  }

  async createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validatedData = createTemplateSchema.parse(req.body);

      const template = await prisma.emailTemplate.create({
        data: {
          ...validatedData,
          ownerId: req.user!.userId
        }
      });

      res.status(201).json({
        message: 'Email template created successfully',
        data: template
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(new AppError(`Validation error: ${error.errors.map(e => e.message).join(', ')}`, 400));
      }
      logger.error('Create template error:', error);
      next(new AppError('Failed to create template', 500));
    }
  }

  async updateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: {
          id,
          ownerId: req.user!.userId
        }
      });

      if (!existingTemplate) {
        return next(new AppError('Template not found', 404));
      }

      const updatedTemplate = await prisma.emailTemplate.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({
        message: 'Email template updated successfully',
        data: updatedTemplate
      });
    } catch (error) {
      logger.error('Update template error:', error);
      next(new AppError('Failed to update template', 500));
    }
  }

  async deleteTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: {
          id,
          ownerId: req.user!.userId
        }
      });

      if (!existingTemplate) {
        return next(new AppError('Template not found', 404));
      }

      // Check if template is being used in any campaigns
      const campaignsUsingTemplate = await prisma.outreachCampaign.count({
        where: {
          templateId: id
        }
      });

      if (campaignsUsingTemplate > 0) {
        return next(new AppError('Cannot delete template that is being used in campaigns', 400));
      }

      await prisma.emailTemplate.delete({
        where: { id }
      });

      res.status(200).json({
        message: 'Email template deleted successfully'
      });
    } catch (error) {
      logger.error('Delete template error:', error);
      next(new AppError('Failed to delete template', 500));
    }
  }
}