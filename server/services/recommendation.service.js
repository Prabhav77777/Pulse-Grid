import approvalController from "../action/approvalController.js";

export async function getRecommendations() {
  return {
    pending:
      approvalController.getPendingRecommendations(),

    history:
      approvalController.getRecommendationHistory(),
  };
}

export async function approveRecommendation(
  id,
  staffId,
  notes
) {
  return approvalController.approveRecommendation(
    id,
    staffId,
    notes
  );
}

export async function rejectRecommendation(
  id,
  staffId,
  reason
) {
  return approvalController.rejectRecommendation(
    id,
    staffId,
    reason
  );
}