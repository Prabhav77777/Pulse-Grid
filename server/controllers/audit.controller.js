import * as auditService from "../services/audit.service.js";

export async function getAuditLog(req, res, next) {
  try {
    const result = await auditService.getAuditLog(
      req.query
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
}