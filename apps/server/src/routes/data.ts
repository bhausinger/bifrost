import { Router } from 'express';
import { DataController, upload } from '@/controllers/DataController';
import { authMiddleware } from '@/middleware/auth';

const router: Router = Router();
const dataController = new DataController();

// Apply auth middleware to all data routes
router.use(authMiddleware);

// Import routes
router.get('/import/template', dataController.getImportTemplate);
router.post('/import/validate', upload.single('file'), dataController.validateImport);
router.post('/import/artists', upload.single('file'), dataController.importArtists);

// Export routes
router.get('/export/campaigns', dataController.exportCampaigns);
router.get('/export/artists', dataController.exportArtists);
router.get('/export/analytics', dataController.exportAnalytics);

// Backup routes
router.post('/backup', dataController.createBackup);

// Statistics routes
router.get('/stats', dataController.getDataStats);

export { router as dataRoutes };