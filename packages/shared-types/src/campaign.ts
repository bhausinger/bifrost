import { z } from 'zod';
import { BaseEntitySchema, StatusSchema } from './common';

// Campaign status
export const CampaignStatusSchema = z.enum([
  'draft',
  'active',
  'paused',
  'completed',
  'cancelled'
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

// Campaign type
export const CampaignTypeSchema = z.enum([
  'promotion',
  'discovery',
  'outreach',
  'collaboration'
]);
export type CampaignType = z.infer<typeof CampaignTypeSchema>;

// Platform enum
export const PlatformSchema = z.enum([
  'soundcloud',
  'spotify',
  'youtube',
  'instagram',
  'tiktok',
  'twitter'
]);
export type Platform = z.infer<typeof PlatformSchema>;

// Campaign metrics
export const CampaignMetricsSchema = z.object({
  totalReach: z.number().default(0),
  totalPlays: z.number().default(0),
  totalLikes: z.number().default(0),
  totalShares: z.number().default(0),
  totalComments: z.number().default(0),
  conversionRate: z.number().default(0),
  engagementRate: z.number().default(0),
  costPerAcquisition: z.number().default(0),
  returnOnInvestment: z.number().default(0),
});
export type CampaignMetrics = z.infer<typeof CampaignMetricsSchema>;

// Target criteria
export const TargetCriteriaSchema = z.object({
  genres: z.array(z.string()).default([]),
  platforms: z.array(PlatformSchema).default([]),
  minFollowers: z.number().optional(),
  maxFollowers: z.number().optional(),
  locations: z.array(z.string()).default([]),
  ageRange: z.object({
    min: z.number().min(13),
    max: z.number().max(100),
  }).optional(),
  keywords: z.array(z.string()).default([]),
});
export type TargetCriteria = z.infer<typeof TargetCriteriaSchema>;

// Campaign schema
export const CampaignSchema = BaseEntitySchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  type: CampaignTypeSchema,
  status: CampaignStatusSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budget: z.number().min(0).optional(),
  targetCriteria: TargetCriteriaSchema,
  metrics: CampaignMetricsSchema,
  tags: z.array(z.string()).default([]),
  ownerId: z.string(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

// Campaign creation/update requests
export const CreateCampaignRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: CampaignTypeSchema,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  budget: z.number().min(0).optional(),
  targetCriteria: TargetCriteriaSchema,
  tags: z.array(z.string()).default([]),
});
export type CreateCampaignRequest = z.infer<typeof CreateCampaignRequestSchema>;

export const UpdateCampaignRequestSchema = CreateCampaignRequestSchema.partial().extend({
  status: CampaignStatusSchema.optional(),
});
export type UpdateCampaignRequest = z.infer<typeof UpdateCampaignRequestSchema>;

// Campaign with relations
export const CampaignWithArtistsSchema = CampaignSchema.extend({
  artists: z.array(z.object({
    id: z.string(),
    name: z.string(),
    platform: PlatformSchema,
    addedAt: z.string().datetime(),
  })),
  totalArtists: z.number(),
});
export type CampaignWithArtists = z.infer<typeof CampaignWithArtistsSchema>;