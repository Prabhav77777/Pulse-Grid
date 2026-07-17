import * as recommendationService from "../services/recommendation.service.js";

export async function getRecommendations(req, res, next) {
  try {
    const data =
      await recommendationService.getRecommendations();

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function approveRecommendation(req, res, next) {
  try {
    const result =
      await recommendationService.approveRecommendation(
        req.params.id,
        req.staffSession.userId,
        req.body.notes
      );

    if (!result) {
      return res.status(404).json({
        error: "Pending recommendation not found",
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function rejectRecommendation(req, res, next) {
  try {
    const result =
      await recommendationService.rejectRecommendation(
        req.params.id,
        req.staffSession.userId,
        req.body.reason
      );

    if (!result) {
      return res.status(404).json({
        error: "Pending recommendation not found",
      });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}