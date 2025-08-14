import { Router } from 'express';
import { ArtistController } from '@/controllers/ArtistController';
import { authMiddleware } from '@/middleware/auth';

const router = Router();
const artistController = new ArtistController();

// Apply auth middleware to all artist routes
router.use(authMiddleware);

router.get('/', artistController.getArtists);
router.post('/', artistController.createArtist);
router.get('/:id', artistController.getArtist);
router.put('/:id', artistController.updateArtist);
router.delete('/:id', artistController.deleteArtist);
router.post('/discover', artistController.discoverArtists);

export { router as artistRoutes };