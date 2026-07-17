import * as transportService from "../services/transport.service.js";

export async function getTransportRecommendations(req, res, next) {
  try {
    const result = await transportService.getRecommendations(
      req.body
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}