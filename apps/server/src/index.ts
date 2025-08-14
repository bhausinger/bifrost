import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { requestLogger } from '@/middleware/requestLogger';
import { authRoutes } from '@/routes/auth';
import { campaignRoutes } from '@/routes/campaigns';
import { artistRoutes } from '@/routes/artists';
import { outreachRoutes } from '@/routes/outreach';
import { analyticsRoutes } from '@/routes/analytics';
import { financeRoutes } from '@/routes/finance';

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());
app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/finance', financeRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const port = config.port || 5000;

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
});