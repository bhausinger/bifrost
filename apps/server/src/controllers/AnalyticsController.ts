import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import { StreamAnalyticsService } from '@/services/StreamAnalyticsService';
// import { CreateStreamMetricSchema } from '@campaign-manager/shared-types/analytics';

export class AnalyticsController {
  private streamAnalyticsService: StreamAnalyticsService;

  constructor() {
    this.streamAnalyticsService = new StreamAnalyticsService();
  }

  async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const dashboard = await this.streamAnalyticsService.getAnalyticsDashboard(userId);

      res.status(200).json({
        message: 'Dashboard statistics retrieved successfully',
        data: dashboard
      });
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      next(new AppError('Failed to get dashboard stats', 500));
    }
  }

  async getCampaignMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const analytics = await this.streamAnalyticsService.getCampaignAnalytics(id);

      if (!analytics) {
        return next(new AppError('Campaign analytics not found', 404));
      }

      res.status(200).json({
        message: 'Campaign metrics retrieved successfully',
        data: analytics
      });
    } catch (error) {
      logger.error('Get campaign metrics error:', error);
      next(new AppError('Failed to get campaign metrics', 500));
    }
  }

  async getArtistPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { campaignId, platform, startDate, endDate, limit } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const metrics = await this.streamAnalyticsService.getArtistStreamMetrics(id, {
        campaignId: campaignId as string,
        platform: platform as string,
        startDate: startDate as string,
        endDate: endDate as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.status(200).json({
        message: 'Artist performance metrics retrieved successfully',
        data: metrics
      });
    } catch (error) {
      logger.error('Get artist performance error:', error);
      next(new AppError('Failed to get artist performance', 500));
    }
  }

  async getPerformanceOverTime(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // campaign id
      const { period = 'month' } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const validPeriods = ['day', 'week', 'month', 'quarter', 'year'];
      if (!validPeriods.includes(period as string)) {
        return next(new AppError('Invalid period. Must be one of: day, week, month, quarter, year', 400));
      }

      const performance = await this.streamAnalyticsService.getPerformanceMetrics(
        id, 
        period as 'day' | 'week' | 'month' | 'quarter' | 'year'
      );

      res.status(200).json({
        message: 'Performance metrics over time retrieved successfully',
        data: performance
      });
    } catch (error) {
      logger.error('Get performance over time error:', error);
      next(new AppError('Failed to get performance metrics over time', 500));
    }
  }

  async calculateCampaignROI(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // campaign id
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const roi = await this.streamAnalyticsService.calculateROI(id);

      res.status(200).json({
        message: 'Campaign ROI calculated successfully',
        data: roi
      });
    } catch (error) {
      logger.error('Calculate campaign ROI error:', error);
      next(new AppError('Failed to calculate campaign ROI', 500));
    }
  }

  async createStreamMetric(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      // Validate request body - temporarily disabled
      // const validationResult = CreateStreamMetricSchema.safeParse(req.body);
      // if (!validationResult.success) {
      //   return next(new AppError(`Validation failed: ${validationResult.error.message}`, 400));
      // }

      const metric = await this.streamAnalyticsService.createStreamMetric(req.body);

      res.status(201).json({
        message: 'Stream metric created successfully',
        data: metric
      });
    } catch (error) {
      logger.error('Create stream metric error:', error);
      next(new AppError('Failed to create stream metric', 500));
    }
  }

  async refreshCampaignAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // campaign id
      const userId = req.user?.userId;

      if (!userId) {
        return next(new AppError('User ID required', 400));
      }

      const analytics = await this.streamAnalyticsService.generateCampaignAnalytics(id);

      res.status(200).json({
        message: 'Campaign analytics refreshed successfully',
        data: analytics
      });
    } catch (error) {
      logger.error('Refresh campaign analytics error:', error);
      next(new AppError('Failed to refresh campaign analytics', 500));
    }
  }

  async getOutreachStats(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ message: 'Get outreach stats endpoint - not implemented yet', data: {} });
    } catch (error) {
      logger.error('Get outreach stats error:', error);
      next(new AppError('Failed to get outreach stats', 500));
    }
  }

  async getRevenueOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ message: 'Get revenue overview endpoint - not implemented yet', data: {} });
    } catch (error) {
      logger.error('Get revenue overview error:', error);
      next(new AppError('Failed to get revenue overview', 500));
    }
  }
}