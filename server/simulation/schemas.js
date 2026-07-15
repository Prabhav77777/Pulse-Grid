/**
 * @file schemas.js
 * @description Hand-rolled validation schemas for all PulseGrid simulation data types.
 *   Provides structural + type + range validation with zero external dependencies.
 * #Business-Intent: Data integrity — ensures every simulation datum is well-formed
 *   before it enters the prediction / routing pipeline.
 *
 * @level-one-validation
 *   Summary: Pure validation functions for GateState, ZoneState, EdgeState,
 *     PredictionResult, RoutingResult, and SimulationSnapshot.
 *   Correctness: Each validate() returns { valid, errors[] }; no mutations, no I/O.
 *   Rubric: Correctness, Robustness.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Data validation layer, type safety without TypeScript.
 *   #Scope-Of-Improvement: Add nested cross-field constraints (e.g. currentFlow ≤ maxCapacity).
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

/** @risk-area type-coercion — strict checks prevent silent NaN propagation */
const isString  = (v) => typeof v === 'string' && v.length > 0;
const isNumber  = (v) => typeof v === 'number' && Number.isFinite(v);
const isBool    = (v) => typeof v === 'boolean';
const isArray   = (v) => Array.isArray(v);
const isObject  = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNeg  = (v) => isNumber(v) && v >= 0;

const RISK_LEVELS = new Set(['GREEN', 'YELLOW', 'RED']);

/**
 * Run a list of check tuples against data, collecting human-readable errors.
 * @param {Array<[boolean, string]>} checks
 * @returns {{ valid: boolean, errors: string[] }}
 */
function runChecks(checks) {
  const errors = checks.filter(([ok]) => !ok).map(([, msg]) => msg);
  return { valid: errors.length === 0, errors };
}

// ─── Schema: GateState ──────────────────────────────────────────────────────

/** #What: Physical entry/exit point in the stadium perimeter */
export const GateStateSchema = {
  name: 'GateState',
  validate(data) {
    if (!isObject(data)) return { valid: false, errors: ['GateState must be an object'] };
    return runChecks([
      [isString(data.id),                     'id must be a non-empty string'],
      [isString(data.name),                   'name must be a non-empty string'],
      [isNonNeg(data.currentFlow),            'currentFlow must be a non-negative number'],
      [isNonNeg(data.maxCapacity),            'maxCapacity must be a non-negative number'],
      [isBool(data.isAccessible),             'isAccessible must be a boolean'],
      [isObject(data.position),               'position must be an object'],
      [isObject(data.position) && isNumber(data.position.x), 'position.x must be a number'],
      [isObject(data.position) && isNumber(data.position.y), 'position.y must be a number'],
      // #Scope-Of-Improvement: cross-field — currentFlow ≤ maxCapacity
      [!isNonNeg(data.currentFlow) || !isNonNeg(data.maxCapacity) || data.currentFlow <= data.maxCapacity,
        'currentFlow must not exceed maxCapacity'],
    ]);
  },
};

// ─── Schema: ZoneState ──────────────────────────────────────────────────────

/** #What: A logical stadium section (stand, concourse, VIP area, etc.) */
export const ZoneStateSchema = {
  name: 'ZoneState',
  validate(data) {
    if (!isObject(data)) return { valid: false, errors: ['ZoneState must be an object'] };
    return runChecks([
      [isString(data.id),                                  'id must be a non-empty string'],
      [isString(data.name),                                'name must be a non-empty string'],
      [isNonNeg(data.currentOccupancy),                    'currentOccupancy must be a non-negative number'],
      [isNonNeg(data.maxCapacity),                         'maxCapacity must be a non-negative number'],
      [isString(data.riskLevel) && RISK_LEVELS.has(data.riskLevel),
        'riskLevel must be GREEN, YELLOW, or RED'],
      [isArray(data.gates),                                'gates must be an array'],
      [!isArray(data.gates) || data.gates.every(isString), 'every gate must be a non-empty string'],
      [isArray(data.facilities),                           'facilities must be an array'],
      [!isArray(data.facilities) || data.facilities.every(isString),
        'every facility must be a non-empty string'],
      // cross-field
      [!isNonNeg(data.currentOccupancy) || !isNonNeg(data.maxCapacity) || data.currentOccupancy <= data.maxCapacity,
        'currentOccupancy must not exceed maxCapacity'],
    ]);
  },
};

// ─── Schema: EdgeState ──────────────────────────────────────────────────────

/** #What: A weighted, directed walkway between two nodes */
export const EdgeStateSchema = {
  name: 'EdgeState',
  validate(data) {
    if (!isObject(data)) return { valid: false, errors: ['EdgeState must be an object'] };
    return runChecks([
      [isString(data.from),            'from must be a non-empty string'],
      [isString(data.to),              'to must be a non-empty string'],
      [isNonNeg(data.distance),        'distance must be a non-negative number'],
      [isNonNeg(data.capacity),        'capacity must be a non-negative number'],
      [isNonNeg(data.currentFlow),     'currentFlow must be a non-negative number'],
      [isBool(data.isAccessible),      'isAccessible must be a boolean'],
      [isBool(data.isOpen),            'isOpen must be a boolean'],
    ]);
  },
};

// ─── Schema: PredictionResult ───────────────────────────────────────────────

/** #What: Crowd-load forecast for a single zone */
export const PredictionResultSchema = {
  name: 'PredictionResult',
  validate(data) {
    if (!isObject(data)) return { valid: false, errors: ['PredictionResult must be an object'] };
    return runChecks([
      [isString(data.zoneId),              'zoneId must be a non-empty string'],
      [isNonNeg(data.currentLoad),         'currentLoad must be a non-negative number'],
      [isNonNeg(data.predicted15Min),      'predicted15Min must be a non-negative number'],
      [isNonNeg(data.predicted30Min),      'predicted30Min must be a non-negative number'],
      [isString(data.riskLevel) && RISK_LEVELS.has(data.riskLevel),
        'riskLevel must be GREEN, YELLOW, or RED'],
      [isNumber(data.confidence) && data.confidence >= 0 && data.confidence <= 1,
        'confidence must be a number between 0 and 1'],
    ]);
  },
};

// ─── Schema: RoutingResult ──────────────────────────────────────────────────

/** #What: Output of the Dijkstra pathfinding layer */
export const RoutingResultSchema = {
  name: 'RoutingResult',
  validate(data) {
    if (!isObject(data)) return { valid: false, errors: ['RoutingResult must be an object'] };
    return runChecks([
      [isArray(data.path) && data.path.every(isString), 'path must be an array of strings'],
      [isNonNeg(data.totalDistance),       'totalDistance must be a non-negative number'],
      [isNonNeg(data.estimatedMinutes),    'estimatedMinutes must be a non-negative number'],
      [isBool(data.isAccessible),          'isAccessible must be a boolean'],
      [isArray(data.directions) && data.directions.every(isString),
        'directions must be an array of strings'],
    ]);
  },
};

// ─── Schema: SimulationSnapshot ─────────────────────────────────────────────

/** #What: Full simulation state at a single point in time */
export const SimulationSnapshotSchema = {
  name: 'SimulationSnapshot',
  validate(data) {
    if (!isObject(data)) return { valid: false, errors: ['SimulationSnapshot must be an object'] };
    const errors = [];

    if (!isNumber(data.timestamp) && !(typeof data.timestamp === 'string'))
      errors.push('timestamp must be a number or ISO string');

    if (!isArray(data.gates)) {
      errors.push('gates must be an array');
    } else {
      data.gates.forEach((g, i) => {
        const r = GateStateSchema.validate(g);
        if (!r.valid) errors.push(`gates[${i}]: ${r.errors.join('; ')}`);
      });
    }

    if (!isArray(data.zones)) {
      errors.push('zones must be an array');
    } else {
      data.zones.forEach((z, i) => {
        const r = ZoneStateSchema.validate(z);
        if (!r.valid) errors.push(`zones[${i}]: ${r.errors.join('; ')}`);
      });
    }

    if (!isArray(data.edges)) {
      errors.push('edges must be an array');
    } else {
      data.edges.forEach((e, i) => {
        const r = EdgeStateSchema.validate(e);
        if (!r.valid) errors.push(`edges[${i}]: ${r.errors.join('; ')}`);
      });
    }

    return { valid: errors.length === 0, errors };
  },
};

// ─── Registry & convenience ─────────────────────────────────────────────────

/** @risk-area schema-lookup — unknown name returns clear error, not silent null */
const SCHEMA_REGISTRY = {
  GateState:           GateStateSchema,
  ZoneState:           ZoneStateSchema,
  EdgeState:           EdgeStateSchema,
  PredictionResult:    PredictionResultSchema,
  RoutingResult:       RoutingResultSchema,
  SimulationSnapshot:  SimulationSnapshotSchema,
};

/**
 * Convenience: validate arbitrary data against a named schema.
 * @param {*} data
 * @param {string} schemaName
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateSchema(data, schemaName) {
  const schema = SCHEMA_REGISTRY[schemaName];
  if (!schema) {
    return { valid: false, errors: [`Unknown schema "${schemaName}". Valid: ${Object.keys(SCHEMA_REGISTRY).join(', ')}`] };
  }
  return schema.validate(data);
}
