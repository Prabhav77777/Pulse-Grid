import { describe, expect, it } from 'vitest';
import { validateConciergeResponse, validateGenericJSON, validateRecommendationResponse, validateTransportResponse } from '../server/reasoning/responseValidator.js';
import { buildConciergePrompt, buildRecommendationPrompt, buildReportPrompt, buildTransportPrompt } from '../server/reasoning/promptBuilder.js';
import { createReportSummary, formatReportMarkdown } from '../server/reasoning/reportGenerator.js';

describe('LLM response validation', () => {
  it('accepts a complete recommendation response and rejects invalid severity', () => {
    const valid = { recommendations: [{ id: 'r1', severity: 'high', title: 'Open gate', description: 'Reduce queue', affectedZones: ['A'], suggestedAction: 'Open Gate B', estimatedImpact: '10% less waiting' }] };
    expect(validateRecommendationResponse(JSON.stringify(valid)).valid).toBe(true);
    valid.recommendations[0].severity = 'urgent';
    expect(validateRecommendationResponse(valid).valid).toBe(false);
  });

  it('handles malformed and fenced LLM JSON safely', () => {
    expect(validateConciergeResponse('not json').valid).toBe(false);
    expect(validateConciergeResponse('```json\n{"message":"Hi","language":"en","suggestions":[]}\n```').valid).toBe(true);
    expect(validateGenericJSON({ message: 'ok' }, ['message', 'missing']).valid).toBe(false);
  });

  it('validates transport options and rejects non-array options', () => {
    const valid = { options: [{ mode: 'Metro', estimatedTime: '20m', cost: '2', co2Estimate: '0.1kg', sustainability: 'high' }] };
    expect(validateTransportResponse(valid).valid).toBe(true);
    expect(validateTransportResponse({ options: {} }).valid).toBe(false);
  });
});

describe('Prompt and report contracts', () => {
  it('keeps deterministic-data guardrails and locale instruction in prompts', () => {
    expect(buildRecommendationPrompt({ zones: [] }, 'es')).toContain('Do NOT recalculate');
    expect(buildConciergePrompt('Where is gate A?', {}, 'fr')).toContain('locale code "fr"');
    expect(buildTransportPrompt({ modes: [] })).toContain('Do NOT invent data');
    expect(buildReportPrompt([], [], [])).toContain('Do NOT fabricate statistics');
  });

  it('creates deterministic report metrics and a safe fallback narrative', () => {
    const summary = createReportSummary([{ timestamp: '2026-01-01T00:00:00Z', zone: 'A' }], [{ accurate: true }]);
    expect(summary.accuracyRate).toBe('100.0%');
    expect(formatReportMarkdown(null, summary, [])).toContain('deterministic analysis only');
  });
});
