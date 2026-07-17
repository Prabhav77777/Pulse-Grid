import { Router } from 'express';
import auditLog from '../../action/auditLog.js';
import sessionManager from '../../action/sessionManager.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.get('/', generalLimiter.middleware(), sessionManager.requirePermission('view_audit'), (req, res) => res.json({ entries: auditLog.getEntries(req.query), statistics: auditLog.getStatistics() }));
export default router;
