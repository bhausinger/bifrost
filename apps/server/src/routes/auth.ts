import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { validateRequest } from '@/middleware/validation';
import { loginSchema, registerSchema } from '@/schemas/auth';

const router = Router();
const authController = new AuthController();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

export { router as authRoutes };