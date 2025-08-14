import { Router } from 'express';
import { OutreachController } from '@/controllers/OutreachController';
import { authMiddleware } from '@/middleware/auth';

const router: Router = Router();
const outreachController = new OutreachController();

// Apply auth middleware to all outreach routes
router.use(authMiddleware);

// Campaign routes
router.get('/campaigns', outreachController.getOutreachCampaigns);
router.post('/campaigns', outreachController.createOutreachCampaign);
router.get('/campaigns/:id', outreachController.getOutreachCampaign);
router.put('/campaigns/:id', outreachController.updateOutreachCampaign);
router.delete('/campaigns/:id', outreachController.deleteOutreachCampaign);

// Email sending
router.post('/send', outreachController.sendEmails);

// Template routes
router.get('/templates', outreachController.getTemplates);
router.post('/templates', outreachController.createTemplate);
router.put('/templates/:id', outreachController.updateTemplate);
router.delete('/templates/:id', outreachController.deleteTemplate);

export { router as outreachRoutes };