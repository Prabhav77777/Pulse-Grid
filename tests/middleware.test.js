import { describe, expect, it, vi } from 'vitest';
import { validateChatInput, validateLocale, validateRecommendationAction } from '../server/api/middleware.js';

function response() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn() };
}

describe('API input validation', () => {
  it('trims and HTML-escapes chat input before it reaches the LLM', () => {
    const req = { body: { message: '  <img src=x onerror=alert(1)>  ' } };
    const res = response();
    const next = vi.fn();
    validateChatInput(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body.message).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it.each([['', 'empty'], [' '.repeat(501), 'oversized'], [42, 'non-string']])('rejects %s chat input', (message) => {
    const res = response();
    const next = vi.fn();
    validateChatInput({ body: { message } }, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('normalizes a supported locale and rejects unsupported locales', () => {
    const req = { body: { locale: 'ar' }, query: {} };
    const next = vi.fn();
    validateLocale(req, response(), next);
    expect(req.locale).toBe('ar');
    expect(next).toHaveBeenCalledOnce();

    const res = response();
    validateLocale({ body: { locale: 'xx' }, query: {} }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('allows only bounded text notes in recommendation actions', () => {
    const next = vi.fn();
    validateRecommendationAction({ body: { notes: 'Reviewed by shift lead' } }, response(), next);
    expect(next).toHaveBeenCalledOnce();

    const res = response();
    validateRecommendationAction({ body: { reason: 123 } }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
