import auditLog from "../action/auditLog.js";

export async function getAuditLog(filters) {
  return {
    entries: auditLog.getEntries(filters),
    statistics: auditLog.getStatistics(),
  };
}