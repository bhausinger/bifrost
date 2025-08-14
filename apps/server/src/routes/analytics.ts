import { Router } from 'express';
import { AnalyticsController } from '@/controllers/AnalyticsController';
import { authMiddleware } from '@/middleware/auth';

const router: Router = Router();
const analyticsController = new AnalyticsController();

// Apply auth middleware to all analytics routes
router.use(authMiddleware);

// Dashboard and overview routes
router.get('/dashboard', analyticsController.getDashboardStats);

// Campaign analytics routes
router.get('/campaigns/:id/metrics', analyticsController.getCampaignMetrics);
router.get('/campaigns/:id/performance', analyticsController.getPerformanceOverTime);
router.get('/campaigns/:id/roi', analyticsController.calculateCampaignROI);
router.post('/campaigns/:id/refresh', analyticsController.refreshCampaignAnalytics);

// Artist analytics routes
router.get('/artists/:id/performance', analyticsController.getArtistPerformance);

// Stream metrics routes
router.post('/stream-metrics', analyticsController.createStreamMetric);

// Legacy routes (to be implemented later)
router.get('/outreach/stats', analyticsController.getOutreachStats);
router.get('/revenue/overview', analyticsController.getRevenueOverview);

export { router as analyticsRoutes };