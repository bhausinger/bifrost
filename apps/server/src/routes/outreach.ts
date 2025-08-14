import { Router } from 'express';
import { OutreachController } from '@/controllers/OutreachController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();
const outreachController = new OutreachController();

// Apply auth middleware to all outreach routes
router.use(authMiddleware);

router.get('/campaigns', outreachController.getOutreachCampaigns);
router.post('/campaigns', outreachController.createOutreachCampaign);
router.get('/campaigns/:id', outreachController.getOutreachCampaign);
router.put('/campaigns/:id', outreachController.updateOutreachCampaign);
router.delete('/campaigns/:id', outreachController.deleteOutreachCampaign);
router.post('/send', outreachController.sendEmails);
router.get('/templates', outreachController.getTemplates);
router.post('/templates', outreachController.createTemplate);

export { router as outreachRoutes };