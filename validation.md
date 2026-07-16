# PulseGrid Validation Report

## Quality gates

- `npm test` — unit, integration-contract, security-validation, and API-client tests.
- `npm run test:coverage` — V8 coverage for simulation, reasoning, action, API, and utility layers.
- `npm run build` — production frontend bundle compilation.

## Test strategy

- Simulation: schemas, graph operations, shortest and accessible routes, crowd prediction, and mock-data integration.
- Security: signed sessions, permission denial, rate limiting, input sanitization, locale validation, and bounded audit notes.
- GenAI: structured-prompt guardrails, malformed-response handling, and recommendation/concierge/transport response contracts.
- Client: JSON request encoding, API error handling, debounce, and throttle behavior.

## Risk boundaries

- Demo credentials and in-memory storage are development-only boundaries. Production requires OIDC, database-backed audits, and a shared session/rate-limit store.
- LLM output remains advisory, is structurally validated, and requires a human decision before operational action.
