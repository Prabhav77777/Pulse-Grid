import { Router } from 'express';
import auditRoutes from './routes/audit.routes.js';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import reportRoutes from './routes/report.routes.js';
import routingRoutes from './routes/routing.routes.js';
import simulationRoutes from './routes/simulation.routes.js';
import transportRoutes from './routes/transport.routes.js';

const router = Router();
router.use('/simulation', simulationRoutes);
router.use('/routing', routingRoutes);
router.use('/chat', chatRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/report', reportRoutes);
router.use('/transport', transportRoutes);
router.use('/audit', auditRoutes);
router.use('/auth', authRoutes);

export default router;
