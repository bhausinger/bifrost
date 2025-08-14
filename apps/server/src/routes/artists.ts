import { Router } from 'express';
import { ArtistController } from '@/controllers/ArtistController';
import { authenticateToken } from '@/middleware/authenticateToken';

const router = Router();
const artistController = new ArtistController();

// Apply auth middleware to all artist routes
router.use(authenticateToken);

router.get('/', artistController.getArtists.bind(artistController));
router.post('/', artistController.createArtist.bind(artistController));
router.get('/:id', artistController.getArtist.bind(artistController));
router.put('/:id', artistController.updateArtist.bind(artistController));
router.delete('/:id', artistController.deleteArtist.bind(artistController));
router.post('/discover', artistController.discoverArtists.bind(artistController));
router.post('/save', artistController.saveDiscoveredArtist.bind(artistController));

// AI Conversation endpoints
router.post('/ai/start', artistController.startAIConversation.bind(artistController));
router.post('/ai/continue', artistController.continueAIConversation.bind(artistController));
router.post('/ai/scrape-emails', artistController.scrapeArtistEmails.bind(artistController));
router.post('/ai/save-with-emails', artistController.saveArtistsWithEmails.bind(artistController));

export { router as artistRoutes };