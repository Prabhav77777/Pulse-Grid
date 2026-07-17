import { Router } from 'express';
import geminiClient from '../../reasoning/geminiClient.js';
import { buildTransportPrompt } from '../../reasoning/promptBuilder.js';
import { validateTransportResponse } from '../../reasoning/responseValidator.js';
import logger from '../../utils/logger.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = Router();
const eventInfo = { eventName: 'FIFA World Cup 2026 Match', venue: 'PulseGrid Arena', nearbyTransit: [{ mode: 'Metro', line: 'Line 1', station: 'Stadium Station', headway: '5 min' }, { mode: 'Bus', route: 'Line 42', stop: 'Gate 3 Bus Bay', headway: '10 min' }, { mode: 'Taxi / Rideshare', pickupPoint: 'Zone C Parking', availability: 'High' }] };
const fallbackOptions = [{ mode: 'Metro', estimatedTime: '25 min', cost: '$2.50', co2Estimate: '0.04 kg', sustainability: '🌿 Very Low Impact' }, { mode: 'Bus', estimatedTime: '35 min', cost: '$1.75', co2Estimate: '0.08 kg', sustainability: '🌿 Low Impact' }, { mode: 'Rideshare', estimatedTime: '20 min', cost: '$15.00', co2Estimate: '0.45 kg', sustainability: '⚠️ Medium Impact' }, { mode: 'Taxi', estimatedTime: '18 min', cost: '$25.00', co2Estimate: '0.52 kg', sustainability: '⚠️ Medium Impact' }];

router.post('/', generalLimiter.middleware(), async (req, res) => {
  try {
    const response = await geminiClient.generateJSON(buildTransportPrompt(eventInfo, req.body.locale || 'en'), { options: [] });
    const validation = validateTransportResponse(response);
    if (validation.valid) return res.json({ options: validation.data.options, source: 'ai' });
    logger.warn('Transport response validation failed.', { errors: validation.errors });
  } catch (error) { logger.error('Transport recommendation failed.', { message: error.message }); }
  return res.json({ options: fallbackOptions, source: 'fallback' });
});
export default router;
