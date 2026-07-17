import auditLog from "../action/auditLog.js";

import {
  predictions,
  incidents,
} from "../state/simulationState.js";

import {
  generateOpsReport,
} from "../reasoning/reportGenerator.js";

export async function generateReport() {
  const rawEntries = auditLog.entries;

  const result = await generateOpsReport(
    rawEntries,
    predictions,
    incidents
  );

  return {
    report: result.markdown,
    summary: result.summary,
  };
}