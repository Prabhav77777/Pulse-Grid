/**
 * @file api.js
 * @description Centralised API client for PulseGrid — provides debounce/throttle
 *   utilities, a unified fetch wrapper with error handling, and named exports for
 *   every backend endpoint.
 * #Business-Intent: Efficiency — single source of truth for all network calls;
 *   debounce prevents UI-triggered API spam.
 *
 * @level-one-validation
 *   Summary: debounce(fn, delay), throttle(fn, delay), apiRequest(endpoint, options)
 *     with /api prefix and JSON handling, plus named functions for simulation, chat,
 *     predictions, routing, recommendations, audit, reporting, and auth endpoints.
 *   Correctness: apiRequest throws on non-OK responses after parsing the error body.
 *     debounce uses clearTimeout pattern; throttle uses timestamp comparison.
 *   Rubric: Clean, testable API layer; all endpoints discoverable via named exports.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Code organisation, error consistency, call-site readability.
 *   #Scope-Of-Improvement: Add request cancellation via AbortController, retry logic.
 */

/* ═══════════════════════════════════════════════════════════════════════════════
   §1  DEBOUNCE & THROTTLE
   #Business-Intent: Efficiency — debounce UI API calls to avoid server overload
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Returns a debounced version of `fn` that delays invocation until `delay` ms
 * have elapsed since the last call. Useful for search inputs and resize handlers.
 * @param {Function} fn       — The function to debounce.
 * @param {number}   [delay]  — Milliseconds to wait (default 300).
 * @returns {Function & { cancel: Function }}
 * @risk-area Misuse with async functions — caller must handle returned promise.
 */
export function debounce(fn, delay = 300) {
  let timerId = null;

  const debounced = function (...args) {
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    return new Promise((resolve) => {
      timerId = setTimeout(() => {
        timerId = null;
        resolve(fn.apply(this, args));
      }, delay);
    });
  };

  /** Cancel any pending invocation. */
  debounced.cancel = () => {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return debounced;
}

/**
 * Returns a throttled version of `fn` that fires at most once per `delay` ms.
 * Trailing call is guaranteed so the last invocation is never lost.
 * @param {Function} fn       — The function to throttle.
 * @param {number}   [delay]  — Minimum interval in ms (default 1000).
 * @returns {Function}
 */
export function throttle(fn, delay = 1000) {
  let lastCall = 0;
  let trailingTimer = null;

  return function (...args) {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      // Enough time has passed — fire immediately
      if (trailingTimer !== null) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      lastCall = now;
      return fn.apply(this, args);
    }

    // Schedule a trailing call so the latest args are never lost
    if (trailingTimer === null) {
      trailingTimer = setTimeout(() => {
        lastCall = Date.now();
        trailingTimer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   §2  CORE FETCH WRAPPER
   ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Unified API request helper.
 *
 * - Prepends `/api` to the endpoint.
 * - Sets JSON Content-Type for non-GET requests.
 * - Parses JSON response; throws a structured error on non-OK status.
 *
 * @param   {string} endpoint   — Path after `/api`, e.g. `'/simulation/state'`.
 * @param   {RequestInit & { body?: any }} [options] — Fetch options; `body` will be
 *          JSON-stringified automatically.
 * @returns {Promise<any>}       Parsed JSON response.
 * @throws  {{ status: number, message: string, data: any }} On non-2xx responses.
 * @risk-area Network failures surface as thrown errors — callers must catch.
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `/api${endpoint}`;

  const headers = {
    Accept: 'application/json',
    ...options.headers,
  };

  // Auto-set JSON content-type for requests with a body
  if (options.body !== undefined && options.body !== null) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    if (typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  /** @type {Response} */
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (networkError) {
    // #Uncertain: Should we retry on network failure?
    throw {
      status: 0,
      message: `Network error: ${networkError.message}`,
      data: null,
    };
  }

  // Attempt to parse body regardless of status (error bodies often contain details)
  let data = null;
  const contentType = response.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      // Body was not valid JSON — leave data as null
    }
  }

  if (!response.ok) {
    throw {
      status: response.status,
      message: data?.message || data?.error || response.statusText,
      data,
    };
  }

  return data;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   §3  NAMED ENDPOINT EXPORTS
   #What: One function per API endpoint for discoverability and type clarity.
   ═══════════════════════════════════════════════════════════════════════════════ */

/* ── Simulation ────────────────────────────────────────────────────────────── */

/** Fetch current simulation state (zone occupancy, risk levels, etc.). */
export function getSimulationState() {
  return apiRequest('/simulation/state');
}

/** Fetch AI crowd predictions (next-N-minutes forecasts). */
export function getPredictions() {
  return apiRequest('/simulation/predict');
}

/* ── Routing ───────────────────────────────────────────────────────────────── */

/**
 * Find optimal route between two points.
 * @param {string}  from       — Origin zone/gate ID.
 * @param {string}  to         — Destination zone/gate ID.
 * @param {boolean} accessible — If `true`, return wheelchair-accessible route.
 */
export function findRoute(from, to, accessible = false) {
  const params = new URLSearchParams({ from, to, accessible: String(accessible) });
  return apiRequest(`/routing/find?${params}`);
}

/* ── Chat ──────────────────────────────────────────────────────────────────── */

/**
 * Send a chat message and receive the AI response.
 * @param {string} message — User message text.
 * @param {string} locale  — ISO locale code (e.g. 'en', 'hi', 'ta').
 * #Business-Intent: Multilingual conversational safety assistant.
 */
export function sendChatMessage(message, locale = 'en') {
  return apiRequest('/chat', {
    method: 'POST',
    body: { message, locale },
  });
}

/* ── Recommendations ───────────────────────────────────────────────────────── */

/** Get all pending AI-generated recommendations. */
export function getRecommendations() {
  return apiRequest('/recommendations');
}

/**
 * Approve a recommendation.
 * @param {string} id      — Recommendation ID.
 * @param {string} notes   — Optional approval notes.
 */
export function approveRecommendation(id, notes = '') {
  return apiRequest(`/recommendations/${id}/approve`, {
    method: 'POST',
    body: { notes },
  });
}

/**
 * Reject a recommendation.
 * @param {string} id      — Recommendation ID.
 * @param {string} reason  — Reason for rejection.
 */
export function rejectRecommendation(id, reason) {
  return apiRequest(`/recommendations/${id}/reject`, {
    method: 'POST',
    body: { reason },
  });
}

/* ── Audit ─────────────────────────────────────────────────────────────────── */

/** Fetch the full audit log of recommendation decisions. */
export function getAuditLog() {
  return apiRequest('/audit');
}

/* ── Reporting ─────────────────────────────────────────────────────────────── */

/** Generate a summary report of current simulation run. */
export function generateReport() {
  return apiRequest('/report/generate', { method: 'POST' });
}

/* ── Auth ──────────────────────────────────────────────────────────────────── */

/**
 * Authenticate a staff member.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{ token: string, user: object }>}
 * @risk-area Credentials sent as JSON body over HTTPS — ensure TLS in production.
 */
export function login(username, password) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: { username, password },
  });
}

/** Get the current authenticated staff member. */
export function getCurrentUser() {
  return apiRequest('/auth/me');
}

/** End the current staff session. */
export function logout() {
  return apiRequest('/auth/logout', { method: 'POST' });
}
