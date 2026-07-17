import { Router } from 'express';
import { identifyBottlenecks, summarizeForLLM } from '../../simulation/crowdPredictor.js';
import { getPredictions, getStadiumGraph } from '../../state/simulationState.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/state', generalLimiter.middleware(), (_req, res) => {
  const stadiumGraph = getStadiumGraph();
  const nodes = stadiumGraph.getAllNodes();
  res.json({ timestamp: new Date().toISOString(), zones: nodes.filter((node) => node.type === 'zone'), gates: nodes.filter((node) => node.type === 'gate'), edges: stadiumGraph.getAllEdges(), totalNodes: nodes.length });
});

router.get('/predict', generalLimiter.middleware(), (_req, res) => {
  const predictions = getPredictions();
  res.json({ predictions, bottlenecks: identifyBottlenecks(predictions), llmSummary: summarizeForLLM(predictions) });
});

export default router;
