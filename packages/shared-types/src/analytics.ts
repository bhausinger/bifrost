import { z } from 'zod';

// Time period enum
export const TimePeriodSchema = z.enum([
  'day',
  'week',
  'month',
  'quarter',
  'year',
  'custom'
]);
export type TimePeriod = z.infer<typeof TimePeriodSchema>;

// Metric type enum
export const MetricTypeSchema = z.enum([
  'count',
  'rate',
  'percentage',
  'currency',
  'duration',
  'score'
]);
export type MetricType = z.infer<typeof MetricTypeSchema>;

// Chart type enum
export const ChartTypeSchema = z.enum([
  'line',
  'bar',
  'area',
  'pie',
  'donut',
  'scatter',
  'heatmap'
]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

// Data point schema
export const DataPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  label: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});
export type DataPoint = z.infer<typeof DataPointSchema>;

// Metric schema
export const MetricSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: MetricTypeSchema,
  value: z.number(),
  previousValue: z.number().optional(),
  change: z.number().optional(),
  changePercentage: z.number().optional(),
  trend: z.enum(['up', 'down', 'stable']).optional(),
  unit: z.string().optional(),
  format: z.string().optional(), // For display formatting
});
export type Metric = z.infer<typeof MetricSchema>;

// Chart data schema
export const ChartDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: ChartTypeSchema,
  data: z.array(DataPointSchema),
  xAxisLabel: z.string().optional(),
  yAxisLabel: z.string().optional(),
  color: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});
export type ChartData = z.infer<typeof ChartDataSchema>;

// Dashboard widget schema
export const DashboardWidgetSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['metric', 'chart', 'table', 'list']),
  size: z.enum(['small', 'medium', 'large', 'full']),
  position: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  data: z.union([MetricSchema, ChartDataSchema, z.record(z.any())]),
  refreshInterval: z.number().optional(), // seconds
  lastUpdated: z.string().datetime(),
});
export type DashboardWidget = z.infer<typeof DashboardWidgetSchema>;

// Dashboard schema
export const DashboardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  widgets: z.array(DashboardWidgetSchema),
  layout: z.array(z.object({
    i: z.string(), // widget id
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  })),
  isDefault: z.boolean().default(false),
  ownerId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Dashboard = z.infer<typeof DashboardSchema>;

// Campaign analytics
export const CampaignAnalyticsSchema = z.object({
  campaignId: z.string(),
  metrics: z.object({
    totalReach: MetricSchema,
    engagement: MetricSchema,
    conversion: MetricSchema,
    roi: MetricSchema,
    costPerAcquisition: MetricSchema,
  }),
  charts: z.object({
    reachOverTime: ChartDataSchema,
    engagementByPlatform: ChartDataSchema,
    demographicBreakdown: ChartDataSchema,
  }),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  lastUpdated: z.string().datetime(),
});
export type CampaignAnalytics = z.infer<typeof CampaignAnalyticsSchema>;

// Artist analytics
export const ArtistAnalyticsSchema = z.object({
  artistId: z.string(),
  metrics: z.object({
    totalFollowers: MetricSchema,
    totalPlays: MetricSchema,
    engagementRate: MetricSchema,
    growthRate: MetricSchema,
    avgStreamsPerTrack: MetricSchema,
  }),
  charts: z.object({
    followersOverTime: ChartDataSchema,
    playsOverTime: ChartDataSchema,
    platformDistribution: ChartDataSchema,
    topTracks: ChartDataSchema,
  }),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  lastUpdated: z.string().datetime(),
});
export type ArtistAnalytics = z.infer<typeof ArtistAnalyticsSchema>;

// Outreach analytics
export const OutreachAnalyticsSchema = z.object({
  campaignId: z.string().optional(),
  metrics: z.object({
    totalEmails: MetricSchema,
    openRate: MetricSchema,
    clickRate: MetricSchema,
    replyRate: MetricSchema,
    conversionRate: MetricSchema,
  }),
  charts: z.object({
    emailsOverTime: ChartDataSchema,
    responseRates: ChartDataSchema,
    bestSendTimes: ChartDataSchema,
    templatePerformance: ChartDataSchema,
  }),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  lastUpdated: z.string().datetime(),
});
export type OutreachAnalytics = z.infer<typeof OutreachAnalyticsSchema>;

// Analytics request schemas
export const GetAnalyticsRequestSchema = z.object({
  period: TimePeriodSchema,
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  metrics: z.array(z.string()).optional(), // Specific metrics to include
  filters: z.record(z.any()).optional(),
});
export type GetAnalyticsRequest = z.infer<typeof GetAnalyticsRequestSchema>;

export const CreateDashboardRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  widgets: z.array(DashboardWidgetSchema).default([]),
  isDefault: z.boolean().default(false),
});
export type CreateDashboardRequest = z.infer<typeof CreateDashboardRequestSchema>;

export const UpdateDashboardRequestSchema = CreateDashboardRequestSchema.partial();
export type UpdateDashboardRequest = z.infer<typeof UpdateDashboardRequestSchema>;