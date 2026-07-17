import * as reportService from "../services/report.service.js";

export async function generateReport(req, res, next) {
  try {
    const report =
      await reportService.generateReport();

    res.json(report);
  } catch (err) {
    next(err);
  }
}