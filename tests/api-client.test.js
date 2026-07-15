import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, debounce, throttle } from '../src/utils/api.js';

afterEach(() => vi.useRealTimers());

describe('API client', () => {
  it('serializes JSON and returns parsed successful responses', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } }));
    await expect(apiRequest('/test', { method: 'POST', body: { value: 1 } })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ body: '{"value":1}' }));
  });

  it('exposes API error information to callers', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    await expect(apiRequest('/protected')).rejects.toMatchObject({ status: 403, message: 'Denied' });
  });

  it('debounces bursts and preserves the final call', async () => {
    vi.useFakeTimers();
    const fn = vi.fn((value) => value);
    const delayed = debounce(fn, 100);
    const first = delayed('first');
    const final = delayed('final');
    await vi.advanceTimersByTimeAsync(100);
    expect(fn).toHaveBeenCalledTimes(1);
    await expect(final).resolves.toBe('final');
    // The cancelled invocation deliberately never resolves; callers use only the final request.
    void first;
  });

  it('throttles rapid repeat calls', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const limited = throttle(fn, 100);
    limited('first');
    limited('second');
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith('second');
  });
});
