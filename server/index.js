import 'dotenv/config';
import express from 'express';
import apiRouter from './api/index.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import sessionManager from './action/sessionManager.js';
import { HTTP_PORT } from './config/constants.js';
import { configureMiddleware } from './config/middleware.js';
import { registerGracefulShutdown } from './config/shutdown.js';
import { configureStaticAssets } from './config/static.js';
import { startOperationalTimers } from './config/timer.js';
import { refreshSimulation, triggerRecommendationCycle } from './state/simulationState.js';
import logger from './utils/logger.js';

const app = express();
const port = process.env.PORT || HTTP_PORT;

configureMiddleware(app);
app.use('/api', apiRouter);
configureStaticAssets(app);
app.use(errorHandler);

const timers = startOperationalTimers({
  refreshSimulation,
  triggerRecommendationCycle,
  cleanExpiredSessions: () => sessionManager.cleanExpiredSessions(),
});
const server = app.listen(port, () => logger.info('PulseGrid API server started.', {
  environment: process.env.NODE_ENV || 'development',
  geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  port,
}));

registerGracefulShutdown(server, timers);

export default app;
