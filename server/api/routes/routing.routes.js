import { Router } from 'express';
import { findAccessiblePath, findShortestPath } from '../../simulation/dijkstra.js';
import { getStadiumGraph } from '../../state/simulationState.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/find', generalLimiter.middleware(), (req, res) => {
  const { from, to, accessible } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Missing required query params: from, to' });
  try {
    const route = accessible === 'true' ? findAccessiblePath(getStadiumGraph(), from, to) : findShortestPath(getStadiumGraph(), from, to);
    return res.json(route);
  } catch (error) {
    return res.status(404).json({ error: error.message || 'Path not found' });
  }
});

export default router;
