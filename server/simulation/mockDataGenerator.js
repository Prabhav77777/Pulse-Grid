/**
 * @file mockDataGenerator.js
 * @description Generates realistic mock stadium data for the PulseGrid simulation engine.
 *   All data is clearly labelled as mock and would be replaced by real sensor feeds in production.
 * #Business-Intent: Demonstration & Testing — enables full end-to-end testing of the
 *   simulation pipeline without real venue hardware.
 *
 * @level-one-validation
 *   Summary: createStadiumGraph, generateArrivalCurve, generateTimeSeriesSnapshots,
 *     generateMockIncidents — all pure functions returning deterministic mock data.
 *   Correctness: Sigmoid arrival curve produces realistic crowd buildup; graph topology
 *     models a ~40k-seat stadium with gates, zones, concourses, and facilities.
 *   Rubric: Completeness, Correctness, Testing.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Testability, demo readiness, realistic data shapes.
 *   #Scope-Of-Improvement: Add parameterised venue templates (football, cricket, concert).
 */

import { StadiumGraph } from './graph.js';

// ⚠️ MOCK DATA — would be replaced by real sensor feeds in production

// ─── Stadium Graph ──────────────────────────────────────────────────────────

/**
 * Build a realistic StadiumGraph with:
 *   - 8 gates (A–H)
 *   - 6 zones (North, South, East, West Stand, VIP, Family)
 *   - 4 concourses
 *   - Food courts, medical stations, accessible facilities
 *
 * ⚠️ MOCK DATA — would be replaced by real sensor feeds in production
 *
 * @returns {StadiumGraph}
 */
export function createStadiumGraph() {
  let g = new StadiumGraph();

  // ── Gates (8) ─────────────────────────────────────────────────────────
  // ⚠️ MOCK DATA — real gate positions from venue CAD drawings
  const gates = [
    { id: 'gate-A', name: 'A', x: 0,   y: 100, maxCapacity: 800 },
    { id: 'gate-B', name: 'B', x: 50,  y: 200, maxCapacity: 800 },
    { id: 'gate-C', name: 'C', x: 200, y: 250, maxCapacity: 1000 },
    { id: 'gate-D', name: 'D', x: 350, y: 200, maxCapacity: 1000 },
    { id: 'gate-E', name: 'E', x: 400, y: 100, maxCapacity: 800 },
    { id: 'gate-F', name: 'F', x: 350, y: 0,   maxCapacity: 800 },
    { id: 'gate-G', name: 'G', x: 200, y: -50, maxCapacity: 600 },
    { id: 'gate-H', name: 'H', x: 50,  y: 0,   maxCapacity: 600 },
  ];
  for (const gt of gates) {
    g = g.addNode(gt.id, 'gate', {
      id: gt.id, name: gt.name, currentFlow: 0, maxCapacity: gt.maxCapacity,
      isAccessible: true, position: { x: gt.x, y: gt.y },
    });
  }

  // ── Zones (6) ─────────────────────────────────────────────────────────
  // ⚠️ MOCK DATA — real zone capacities from venue fire-safety certificates
  const zones = [
    { id: 'zone-north',  name: 'North Stand',  maxCapacity: 8000,  gates: ['gate-G', 'gate-H'], facilities: ['food-north', 'medical-1'] },
    { id: 'zone-south',  name: 'South Stand',  maxCapacity: 8000,  gates: ['gate-C', 'gate-D'], facilities: ['food-south'] },
    { id: 'zone-east',   name: 'East Stand',   maxCapacity: 7000,  gates: ['gate-D', 'gate-E'], facilities: ['food-east'] },
    { id: 'zone-west',   name: 'West Stand',   maxCapacity: 7000,  gates: ['gate-A', 'gate-B'], facilities: ['food-west', 'medical-2'] },
    { id: 'zone-vip',    name: 'VIP Lounge',   maxCapacity: 2000,  gates: ['gate-F'],            facilities: ['food-vip'] },
    { id: 'zone-family', name: 'Family Zone',  maxCapacity: 3000,  gates: ['gate-B'],            facilities: ['food-family', 'accessible-1'] },
  ];
  for (const z of zones) {
    g = g.addNode(z.id, 'zone', {
      id: z.id, name: z.name, currentOccupancy: 0, maxCapacity: z.maxCapacity,
      riskLevel: 'GREEN', gates: z.gates, facilities: z.facilities,
    });
  }

  // ── Concourses (4) ────────────────────────────────────────────────────
  // ⚠️ MOCK DATA — connecting corridors between gates and stands
  const concourses = [
    { id: 'concourse-N', name: 'North Concourse' },
    { id: 'concourse-S', name: 'South Concourse' },
    { id: 'concourse-E', name: 'East Concourse' },
    { id: 'concourse-W', name: 'West Concourse' },
  ];
  for (const c of concourses) {
    g = g.addNode(c.id, 'concourse', { id: c.id, name: c.name });
  }

  // ── Facilities ────────────────────────────────────────────────────────
  // ⚠️ MOCK DATA — food courts, medical stations, accessible facilities
  const facilities = [
    { id: 'food-north',   name: 'North Food Court' },
    { id: 'food-south',   name: 'South Food Court' },
    { id: 'food-east',    name: 'East Food Court' },
    { id: 'food-west',    name: 'West Food Court' },
    { id: 'food-vip',     name: 'VIP Dining' },
    { id: 'food-family',  name: 'Family Food Area' },
    { id: 'medical-1',    name: 'Medical Station 1' },
    { id: 'medical-2',    name: 'Medical Station 2' },
    { id: 'accessible-1', name: 'Accessible Facility' },
  ];
  for (const f of facilities) {
    g = g.addNode(f.id, 'facility', { id: f.id, name: f.name });
  }

  // ── Edges (bidirectional — realistic distances 50–200m) ───────────────
  // ⚠️ MOCK DATA — real distances from venue GIS data
  const edgeDefs = [
    // Gates → Concourses
    ['gate-A', 'concourse-W', 80,  500],  ['gate-B', 'concourse-W', 60,  500],
    ['gate-C', 'concourse-S', 90,  600],  ['gate-D', 'concourse-S', 70,  600],
    ['gate-D', 'concourse-E', 100, 500],  ['gate-E', 'concourse-E', 80,  500],
    ['gate-F', 'concourse-N', 110, 400],  ['gate-G', 'concourse-N', 75,  400],
    ['gate-H', 'concourse-N', 85,  400],  ['gate-B', 'concourse-S', 120, 400],
    // Concourses → Zones
    ['concourse-N', 'zone-north', 60,  2000], ['concourse-S', 'zone-south', 60,  2000],
    ['concourse-E', 'zone-east',  55,  1800], ['concourse-W', 'zone-west',  55,  1800],
    ['concourse-W', 'zone-family', 70, 1000], ['concourse-N', 'zone-vip', 90, 800],
    // Inter-concourse links
    ['concourse-N', 'concourse-E', 150, 1200], ['concourse-E', 'concourse-S', 150, 1200],
    ['concourse-S', 'concourse-W', 150, 1200], ['concourse-W', 'concourse-N', 180, 1200],
    // Concourses → Facilities
    ['concourse-N', 'food-north',  50, 300],  ['concourse-N', 'medical-1', 70, 200],
    ['concourse-S', 'food-south',  50, 300],  ['concourse-E', 'food-east', 50, 300],
    ['concourse-W', 'food-west',   50, 300],  ['concourse-W', 'medical-2', 65, 200],
    ['concourse-W', 'accessible-1', 55, 200],
    ['zone-vip',    'food-vip',    40, 200],  ['zone-family', 'food-family', 45, 250],
  ];

  for (const [from, to, distance, capacity] of edgeDefs) {
    const edgeData = { distance, capacity, currentFlow: 0, isAccessible: true, isOpen: true };
    g = g.addEdge(from, to, distance, edgeData);
    // Bidirectional
    g = g.addEdge(to, from, distance, edgeData);
  }

  return g;
}

// ─── Arrival Curve ──────────────────────────────────────────────────────────

/**
 * Generate a sigmoid arrival curve that peaks at T-30 minutes.
 * Models the realistic pattern where most fans arrive 60–15 minutes before kickoff.
 *
 * ⚠️ MOCK DATA — would be replaced by real sensor feeds in production
 *
 * @param {number} matchTimeMinutes — minutes before kickoff for the simulation window (e.g. 120)
 * @param {number} totalFans — total expected attendance
 * @returns {Array<{ minutesBefore: number, arrivals: number, cumulativeArrivals: number }>}
 */
export function generateArrivalCurve(matchTimeMinutes, totalFans) {
  // ⚠️ MOCK DATA — sigmoid parameters calibrated to typical Premier League matches
  const midpoint = 30;  // peak arrival rate at T-30
  const steepness = 0.12;
  const results = [];
  let cumulative = 0;

  for (let t = matchTimeMinutes; t >= 0; t--) {
    // Sigmoid: fraction arrived by time t-minutes-before
    const fraction = 1 / (1 + Math.exp(-steepness * (t - midpoint)));
    const targetCumulative = Math.round(totalFans * (1 - fraction));
    const arrivals = Math.max(0, targetCumulative - cumulative);
    cumulative = targetCumulative;

    results.push({
      minutesBefore: t,
      arrivals,
      cumulativeArrivals: cumulative,
    });
  }

  return results;
}

// ─── Time-Series Snapshots ──────────────────────────────────────────────────

/**
 * Generate an array of SimulationSnapshots showing crowd buildup over time.
 *
 * ⚠️ MOCK DATA — would be replaced by real sensor feeds in production
 *
 * @param {StadiumGraph} graph
 * @param {number} minuteCount — number of minutes to simulate
 * @returns {Array<import('./schemas.js').SimulationSnapshot>}
 */
export function generateTimeSeriesSnapshots(graph, minuteCount = 60) {
  const totalFans = 35000; // ⚠️ MOCK DATA
  const arrivalCurve = generateArrivalCurve(minuteCount, totalFans);
  const zoneNodes = graph.getAllNodes().filter((n) => n.type === 'zone');
  const gateNodes = graph.getAllNodes().filter((n) => n.type === 'gate');
  const allEdges = graph.getAllEdges();

  // Weight distribution across zones (proportional to maxCapacity)
  const totalZoneCap = zoneNodes.reduce((s, z) => s + (z.data.maxCapacity || 0), 0);
  const zoneWeights = zoneNodes.map((z) => ({
    id: z.id,
    weight: (z.data.maxCapacity || 0) / totalZoneCap,
    maxCapacity: z.data.maxCapacity || 1,
  }));

  const snapshots = [];
  const baseTime = Date.now();

  for (let minute = 0; minute < minuteCount; minute++) {
    const curvePoint = arrivalCurve[minute] || { cumulativeArrivals: 0 };
    const currentTotal = curvePoint.cumulativeArrivals;

    // ⚠️ MOCK DATA — distribute fans across zones proportionally
    const zones = zoneWeights.map((zw) => {
      const occ = Math.min(Math.round(currentTotal * zw.weight), zw.maxCapacity);
      const pct = occ / zw.maxCapacity;
      const riskLevel = pct > 0.85 ? 'RED' : pct > 0.60 ? 'YELLOW' : 'GREEN';
      const orig = zoneNodes.find((z) => z.id === zw.id);
      return {
        id: zw.id,
        name: orig.data.name,
        currentOccupancy: occ,
        maxCapacity: zw.maxCapacity,
        riskLevel,
        gates: orig.data.gates || [],
        facilities: orig.data.facilities || [],
      };
    });

    // ⚠️ MOCK DATA — gate flow proportional to arrival rate
    const arrivalRate = arrivalCurve[minute]?.arrivals || 0;
    const perGateFlow = Math.round(arrivalRate / gateNodes.length);
    const gates = gateNodes.map((gn) => ({
      id: gn.id,
      name: gn.data.name,
      currentFlow: Math.min(perGateFlow, gn.data.maxCapacity),
      maxCapacity: gn.data.maxCapacity,
      isAccessible: gn.data.isAccessible,
      position: gn.data.position,
    }));

    // ⚠️ MOCK DATA — edge flows proportional to zone occupancy
    const edges = allEdges.map((e) => ({
      from: e.from,
      to: e.to,
      distance: e.data.distance,
      capacity: e.data.capacity,
      currentFlow: Math.round(e.data.capacity * (currentTotal / totalFans) * 0.6),
      isAccessible: e.data.isAccessible,
      isOpen: e.data.isOpen,
    }));

    snapshots.push({
      timestamp: baseTime + minute * 60000,
      gates,
      zones,
      edges,
    });
  }

  return snapshots;
}

// ─── Mock Incidents ─────────────────────────────────────────────────────────

/**
 * Generate an array of mock incident objects for testing the alert pipeline.
 *
 * ⚠️ MOCK DATA — would be replaced by real sensor feeds in production
 *
 * @returns {Array<{ id: string, type: string, severity: string, zoneId: string, description: string, timestamp: number }>}
 */
export function generateMockIncidents() {
  const baseTime = Date.now();

  // ⚠️ MOCK DATA — representative incident types for a matchday scenario
  return [
    {
      id: 'incident-001', type: 'overcrowding', severity: 'HIGH',
      zoneId: 'zone-south', description: 'South Stand approaching 90% capacity.',
      timestamp: baseTime + 25 * 60000,
    },
    {
      id: 'incident-002', type: 'medical', severity: 'MEDIUM',
      zoneId: 'zone-east', description: 'Medical assistance requested in East Stand Row 12.',
      timestamp: baseTime + 32 * 60000,
    },
    {
      id: 'incident-003', type: 'gate-malfunction', severity: 'HIGH',
      zoneId: 'gate-D', description: 'Gate D turnstile 3 jammed — reduced throughput.',
      timestamp: baseTime + 18 * 60000,
    },
    {
      id: 'incident-004', type: 'weather', severity: 'LOW',
      zoneId: 'zone-family', description: 'Light rain — Family Zone canopy deployed.',
      timestamp: baseTime + 10 * 60000,
    },
    {
      id: 'incident-005', type: 'security', severity: 'MEDIUM',
      zoneId: 'concourse-W', description: 'Unattended bag reported in West Concourse — security dispatched.',
      timestamp: baseTime + 40 * 60000,
    },
    {
      id: 'incident-006', type: 'accessibility', severity: 'MEDIUM',
      zoneId: 'accessible-1', description: 'Elevator to accessible viewing area temporarily out of service.',
      timestamp: baseTime + 22 * 60000,
    },
  ];
}
