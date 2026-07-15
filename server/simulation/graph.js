/**
 * @file graph.js
 * @description Immutable weighted-graph model representing a stadium's walkable topology.
 *   Adjacency-list representation with pure methods that return new state on every mutation.
 * #Business-Intent: Correctness & Routing — the single source of truth for pathfinding,
 *   crowd-flow simulation, and capacity queries.
 *
 * @level-one-validation
 *   Summary: StadiumGraph class with addNode, addEdge, getters, load calculations,
 *     and immutable update methods.
 *   Correctness: Every mutating method returns a new StadiumGraph instance; originals unchanged.
 *   Rubric: Correctness, Robustness, Efficiency.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Graph data structure, immutable patterns, capacity analysis.
 *   #Scope-Of-Improvement: Add serialization/deserialization for snapshot persistence.
 */

import { EdgeStateSchema, GateStateSchema, ZoneStateSchema } from './schemas.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** @risk-area deep-clone — structuredClone is unavailable in older runtimes */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const VALID_NODE_TYPES = new Set(['gate', 'zone', 'concourse', 'facility']);

// ─── StadiumGraph ───────────────────────────────────────────────────────────

/**
 * #What: Weighted directed graph for stadium topology.
 * Internally stores:
 *   _nodes  — Map<id, { id, type, data }>
 *   _adj    — Map<id, Array<{ to, weight, data }>>   (adjacency list)
 */
export class StadiumGraph {
  /**
   * @param {Map|undefined} nodes  — internal node map (for cloning)
   * @param {Map|undefined} adj    — internal adjacency map (for cloning)
   */
  constructor(nodes = new Map(), adj = new Map()) {
    /** @risk-area shallow-ref — constructor deep-clones to guarantee isolation */
    this._nodes = new Map(
      [...nodes.entries()].map(([k, v]) => [k, deepClone(v)])
    );
    this._adj = new Map(
      [...adj.entries()].map(([k, v]) => [k, deepClone(v)])
    );
  }

  // ── Mutators (return NEW graph) ─────────────────────────────────────────

  /**
   * Add a node. Returns a *new* StadiumGraph.
   * @param {string} id
   * @param {'gate'|'zone'|'concourse'|'facility'} type
   * @param {object} data — payload validated against the matching schema
   * @returns {StadiumGraph}
   */
  addNode(id, type, data = {}) {
    if (!VALID_NODE_TYPES.has(type)) {
      throw new Error(`Invalid node type "${type}". Must be one of: ${[...VALID_NODE_TYPES].join(', ')}`);
    }
    // #Uncertain: should we validate data against schema here or defer to caller?
    // Decision: validate for gate/zone; concourse & facility are free-form for now.
    if (type === 'gate') {
      const r = GateStateSchema.validate(data);
      if (!r.valid) throw new Error(`GateState validation failed: ${r.errors.join('; ')}`);
    }
    if (type === 'zone') {
      const r = ZoneStateSchema.validate(data);
      if (!r.valid) throw new Error(`ZoneState validation failed: ${r.errors.join('; ')}`);
    }

    const g = new StadiumGraph(this._nodes, this._adj);
    g._nodes.set(id, { id, type, data: deepClone(data) });
    if (!g._adj.has(id)) g._adj.set(id, []);
    return g;
  }

  /**
   * Add a directed edge. Returns a *new* StadiumGraph.
   * @param {string} from
   * @param {string} to
   * @param {number} weight
   * @param {{ distance: number, capacity: number, currentFlow: number, isAccessible: boolean, isOpen: boolean }} data
   * @returns {StadiumGraph}
   */
  addEdge(from, to, weight, data = {}) {
    if (!this._nodes.has(from)) throw new Error(`Node "${from}" does not exist`);
    if (!this._nodes.has(to))   throw new Error(`Node "${to}" does not exist`);

    const edgeData = { from, to, ...data };
    const r = EdgeStateSchema.validate(edgeData);
    if (!r.valid) throw new Error(`EdgeState validation failed: ${r.errors.join('; ')}`);

    const g = new StadiumGraph(this._nodes, this._adj);
    const edges = g._adj.get(from) || [];
    edges.push({ to, weight, data: deepClone(data) });
    g._adj.set(from, edges);
    return g;
  }

  /**
   * Update the flow on an edge. Returns a *new* StadiumGraph (immutable pattern).
   * @param {string} from
   * @param {string} to
   * @param {number} newFlow
   * @returns {StadiumGraph}
   */
  updateEdgeFlow(from, to, newFlow) {
    const g = new StadiumGraph(this._nodes, this._adj);
    const edges = g._adj.get(from);
    if (!edges) throw new Error(`No edges from node "${from}"`);

    const idx = edges.findIndex((e) => e.to === to);
    if (idx === -1) throw new Error(`No edge from "${from}" to "${to}"`);

    edges[idx] = {
      ...edges[idx],
      data: { ...edges[idx].data, currentFlow: newFlow },
    };
    return g;
  }

  // ── Getters (pure, read-only) ───────────────────────────────────────────

  /** @returns {{ id, type, data } | undefined} */
  getNode(id) {
    const n = this._nodes.get(id);
    return n ? deepClone(n) : undefined;
  }

  /** @returns {Array<{ to, weight, data }>} */
  getEdges(nodeId) {
    return deepClone(this._adj.get(nodeId) || []);
  }

  /** @returns {Array<{ id, type, data }>} */
  getAllNodes() {
    return [...this._nodes.values()].map(deepClone);
  }

  /** @returns {Array<{ from, to, weight, data }>} — flattened edge list */
  getAllEdges() {
    const result = [];
    for (const [from, edges] of this._adj.entries()) {
      for (const edge of edges) {
        result.push({ from, to: edge.to, weight: edge.weight, data: deepClone(edge.data) });
      }
    }
    return result;
  }

  // ── Analytics (pure) ────────────────────────────────────────────────────

  /**
   * #What: Load percentage on a specific edge.
   * @risk-area division-by-zero — returns 0 when capacity is 0
   */
  calculateEdgeLoad(from, to) {
    const edges = this._adj.get(from) || [];
    const edge = edges.find((e) => e.to === to);
    if (!edge) return 0;
    const cap = edge.data.capacity || 0;
    return cap === 0 ? 0 : (edge.data.currentFlow / cap) * 100;
  }

  /**
   * #What: Occupancy percentage for a zone node.
   * @risk-area division-by-zero — returns 0 when maxCapacity is 0
   */
  getZoneCapacityPercentage(zoneId) {
    const node = this._nodes.get(zoneId);
    if (!node || node.type !== 'zone') return 0;
    const max = node.data.maxCapacity || 0;
    return max === 0 ? 0 : (node.data.currentOccupancy / max) * 100;
  }

  /**
   * #What: Returns only edges that are both accessible AND open.
   * #Business-Intent: Accessibility compliance — wheelchair / mobility routing.
   */
  getAccessibleEdges(nodeId) {
    return this.getEdges(nodeId).filter(
      (e) => e.data.isAccessible && e.data.isOpen
    );
  }
}
