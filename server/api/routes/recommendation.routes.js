import { Router } from 'express';
import approvalController from '../../action/approvalController.js';
import sessionManager from '../../action/sessionManager.js';
import { requireCsrf } from '../middleware/csrf.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { validateRecommendationAction } from '../middleware/validation.js';

const router = Router();

router.get('/', generalLimiter.middleware(), sessionManager.requirePermission('view_audit'), (_req, res) => res.json({ pending: approvalController.getPendingRecommendations(), history: approvalController.getRecommendationHistory() }));

function respondToDecision(decision, field) {
  return (req, res) => {
    try {
      const result = decision(req.params.id, req.staffSession.userId, req.body[field]);
      return result ? res.json(result) : res.status(404).json({ error: 'Pending recommendation not found' });
    } catch (error) { return res.status(400).json({ error: error.message }); }
  };
}

router.post('/:id/approve', generalLimiter.middleware(), sessionManager.requirePermission('approve'), requireCsrf, validateRecommendationAction, respondToDecision(approvalController.approveRecommendation.bind(approvalController), 'notes'));
router.post('/:id/reject', generalLimiter.middleware(), sessionManager.requirePermission('reject'), requireCsrf, validateRecommendationAction, respondToDecision(approvalController.rejectRecommendation.bind(approvalController), 'reason'));

export default router;
