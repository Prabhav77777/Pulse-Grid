import { Router } from 'express';
import auditLog from '../../action/auditLog.js';
import sessionManager from '../../action/sessionManager.js';
import { generateOpsReport } from '../../reasoning/reportGenerator.js';
import { getIncidents, getPredictions } from '../../state/simulationState.js';
import { requireCsrf } from '../middleware/csrf.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.post('/generate', generalLimiter.middleware(), sessionManager.requirePermission('generate_report'), requireCsrf, async (_req, res, next) => {
  try {
    const result = await generateOpsReport(auditLog.entries, getPredictions(), getIncidents());
    res.json({ report: result.markdown, summary: result.summary });
  } catch (error) { next(error); }
});
export default router;
