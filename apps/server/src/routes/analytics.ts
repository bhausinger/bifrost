import { Router } from 'express';
import { AnalyticsController } from '@/controllers/AnalyticsController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// Apply auth middleware to all analytics routes
router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboardStats);
router.get('/campaigns/:id/metrics', analyticsController.getCampaignMetrics);
router.get('/artists/:id/performance', analyticsController.getArtistPerformance);
router.get('/outreach/stats', analyticsController.getOutreachStats);
router.get('/revenue/overview', analyticsController.getRevenueOverview);

export { router as analyticsRoutes };