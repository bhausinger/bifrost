import { Router } from 'express';
import { CampaignController } from '@/controllers/CampaignController';
import { authenticateToken } from '@/middleware/authenticateToken';

const router = Router();
const campaignController = new CampaignController();

// Apply auth middleware to all campaign routes
router.use(authenticateToken);

router.get('/', campaignController.getCampaigns);
router.post('/', campaignController.createCampaign);
router.get('/:id', campaignController.getCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

export { router as campaignRoutes };