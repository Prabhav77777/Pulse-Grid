import { createStadiumGraph, generateMockIncidents, generateTimeSeriesSnapshots } from '../simulation/mockDataGenerator.js';
import { generatePredictions, summarizeForLLM } from '../simulation/crowdPredictor.js';
import { generateRecommendations } from '../reasoning/recommendationGen.js';
import approvalController from '../action/approvalController.js';
import logger from '../utils/logger.js';

const SNAPSHOT_WINDOW_SIZE = 30;
const stadiumGraph = createStadiumGraph();
let snapshots = generateTimeSeriesSnapshots(stadiumGraph, SNAPSHOT_WINDOW_SIZE);
let predictions = generatePredictions(stadiumGraph, snapshots);
const incidents = generateMockIncidents();

/** Returns the shared deterministic simulation graph. */
export function getStadiumGraph() {
  return stadiumGraph;
}

/** Returns the current prediction set. */
export function getPredictions() {
  return predictions;
}

/** Returns the current simulated incident set. */
export function getIncidents() {
  return incidents;
}

/** Refreshes demo snapshots and the derived crowd predictions. */
export function refreshSimulation() {
  snapshots = generateTimeSeriesSnapshots(stadiumGraph, SNAPSHOT_WINDOW_SIZE);
  predictions = generatePredictions(stadiumGraph, snapshots);
}

/** Generates advisory recommendations from the latest deterministic summary. */
export async function triggerRecommendationCycle() {
  try {
    const recommendations = await generateRecommendations(summarizeForLLM(predictions));
    recommendations?.forEach((recommendation) => approvalController.addRecommendation(recommendation));
  } catch (error) {
    logger.error('Recommendation cycle failed.', { message: error.message });
  }
}
