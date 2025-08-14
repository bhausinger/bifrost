import { Router } from 'express';
import { CampaignController } from '@/controllers/CampaignController';
import { authenticateToken } from '@/middleware/authenticateToken';

const router: Router = Router();
const campaignController = new CampaignController();

// Apply auth middleware to all campaign routes
router.use(authenticateToken);

router.get('/', campaignController.getCampaigns);
router.post('/', campaignController.createCampaign);
router.get('/:id', campaignController.getCampaign);
router.put('/:id', campaignController.updateCampaign);
router.delete('/:id', campaignController.deleteCampaign);

// Artist association routes
router.get('/:id/artists', campaignController.getCampaignArtists);
router.post('/:id/artists', campaignController.addArtistToCampaign);
router.post('/:id/artists/bulk', campaignController.addMultipleArtistsToCampaign);
router.delete('/:id/artists/:artistId', campaignController.removeArtistFromCampaign);

export { router as campaignRoutes };