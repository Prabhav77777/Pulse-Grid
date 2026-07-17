import { Router } from 'express';
import { handleChatMessage } from '../../reasoning/conciergeChat.js';
import { getIncidents, getPredictions, getStadiumGraph } from '../../state/simulationState.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import { validateChatInput, validateLocale } from '../middleware/validation.js';

const router = Router();

router.post('/', chatLimiter.middleware(), validateChatInput, validateLocale, async (req, res, next) => {
  try {
    const graph = getStadiumGraph();
    const response = await handleChatMessage(req.body.message, {
      zones: graph.getAllNodes().filter((node) => node.type === 'zone'),
      gates: graph.getAllNodes().filter((node) => node.type === 'gate'),
      predictions: getPredictions(),
      incidents: getIncidents(),
    }, req.body.locale || 'en');
    res.json(response);
  } catch (error) { next(error); }
});

export default router;
