import { z } from 'zod';
import { BaseEntitySchema, StatusSchema } from './common';

// Email template type
export const TemplateTypeSchema = z.enum([
  'initial_outreach',
  'follow_up',
  'collaboration_proposal',
  'thank_you',
  'rejection_response'
]);
export type TemplateType = z.infer<typeof TemplateTypeSchema>;

// Email status
export const EmailStatusSchema = z.enum([
  'draft',
  'scheduled',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'replied',
  'bounced',
  'failed'
]);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;

// Outreach campaign status
export const OutreachCampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
]);
export type OutreachCampaignStatus = z.infer<typeof OutreachCampaignStatusSchema>;

// Email template schema
export const EmailTemplateSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  type: TemplateTypeSchema,
  variables: z.array(z.string()).default([]), // Available template variables
  isDefault: z.boolean().default(false),
  ownerId: z.string(),
});
export type EmailTemplate = z.infer<typeof EmailTemplateSchema>;

// Email tracking data
export const EmailTrackingSchema = z.object({
  sentAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  openedAt: z.string().datetime().optional(),
  clickedAt: z.string().datetime().optional(),
  repliedAt: z.string().datetime().optional(),
  bouncedAt: z.string().datetime().optional(),
  openCount: z.number().default(0),
  clickCount: z.number().default(0),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});
export type EmailTracking = z.infer<typeof EmailTrackingSchema>;

// Email record schema
export const EmailRecordSchema = BaseEntitySchema.extend({
  outreachCampaignId: z.string(),
  artistId: z.string(),
  templateId: z.string(),
  recipientEmail: z.string().email(),
  recipientName: z.string(),
  subject: z.string(),
  body: z.string(),
  status: EmailStatusSchema,
  tracking: EmailTrackingSchema,
  scheduledFor: z.string().datetime().optional(),
  sentBy: z.string(),
  replyContent: z.string().optional(),
  notes: z.string().optional(),
});
export type EmailRecord = z.infer<typeof EmailRecordSchema>;

// Outreach campaign schema
export const OutreachCampaignSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  status: OutreachCampaignStatusSchema,
  templateId: z.string(),
  targetArtistIds: z.array(z.string()),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional(),
  sendingSchedule: z.object({
    timezone: z.string().default('UTC'),
    daysOfWeek: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]), // 0 = Sunday
    startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    maxEmailsPerDay: z.number().min(1).default(50),
    delayBetweenEmails: z.number().min(1).default(60), // minutes
  }),
  tags: z.array(z.string()).default([]),
  ownerId: z.string(),
});
export type OutreachCampaign = z.infer<typeof OutreachCampaignSchema>;

// Outreach metrics
export const OutreachMetricsSchema = z.object({
  totalEmails: z.number().default(0),
  sentEmails: z.number().default(0),
  deliveredEmails: z.number().default(0),
  openedEmails: z.number().default(0),
  clickedEmails: z.number().default(0),
  repliedEmails: z.number().default(0),
  bouncedEmails: z.number().default(0),
  failedEmails: z.number().default(0),
  openRate: z.number().default(0),
  clickRate: z.number().default(0),
  replyRate: z.number().default(0),
  bounceRate: z.number().default(0),
});
export type OutreachMetrics = z.infer<typeof OutreachMetricsSchema>;

// Create email template request
export const CreateEmailTemplateRequestSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  type: TemplateTypeSchema,
  variables: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
});
export type CreateEmailTemplateRequest = z.infer<typeof CreateEmailTemplateRequestSchema>;

// Update email template request
export const UpdateEmailTemplateRequestSchema = CreateEmailTemplateRequestSchema.partial();
export type UpdateEmailTemplateRequest = z.infer<typeof UpdateEmailTemplateRequestSchema>;

// Create outreach campaign request
export const CreateOutreachCampaignRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  templateId: z.string(),
  targetArtistIds: z.array(z.string()),
  scheduledStartDate: z.string().datetime().optional(),
  scheduledEndDate: z.string().datetime().optional(),
  sendingSchedule: z.object({
    timezone: z.string().default('UTC'),
    daysOfWeek: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    maxEmailsPerDay: z.number().min(1).default(50),
    delayBetweenEmails: z.number().min(1).default(60),
  }),
  tags: z.array(z.string()).default([]),
});
export type CreateOutreachCampaignRequest = z.infer<typeof CreateOutreachCampaignRequestSchema>;

// Update outreach campaign request
export const UpdateOutreachCampaignRequestSchema = CreateOutreachCampaignRequestSchema.partial().extend({
  status: OutreachCampaignStatusSchema.optional(),
});
export type UpdateOutreachCampaignRequest = z.infer<typeof UpdateOutreachCampaignRequestSchema>;

// Send emails request
export const SendEmailsRequestSchema = z.object({
  campaignId: z.string(),
  artistIds: z.array(z.string()).optional(), // If not provided, send to all
  scheduleFor: z.string().datetime().optional(), // If not provided, send immediately
});
export type SendEmailsRequest = z.infer<typeof SendEmailsRequestSchema>;

// Outreach campaign with details
export const OutreachCampaignWithDetailsSchema = OutreachCampaignSchema.extend({
  template: EmailTemplateSchema,
  emails: z.array(EmailRecordSchema),
  metrics: OutreachMetricsSchema,
  totalArtists: z.number(),
});
export type OutreachCampaignWithDetails = z.infer<typeof OutreachCampaignWithDetailsSchema>;