import { Router } from 'express';
import { CampaignController } from '@/controllers/CampaignController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();
const campaignController = new CampaignController();

// Apply auth middleware to all campaign routes
router.use(authMiddleware);

router.get('/', campaignController.getCampaigns);
router.post('/', campaignController.createCampaign);
router.get('/:id', campaignController.getCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

export { router as campaignRoutes };