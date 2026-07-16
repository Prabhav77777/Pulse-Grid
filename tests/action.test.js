import { beforeEach, describe, expect, it, vi } from 'vitest';
import approvalController from '../server/action/approvalController.js';
import auditLog from '../server/action/auditLog.js';
import { generateMockStaffUsers, verifyMockPassword } from '../server/action/sessionManager.js';
import { requireCsrf } from '../server/api/csrf.js';

function resetState() {
  approvalController.pendingRecommendations.clear();
  approvalController.history.length = 0;
  auditLog.entries.length = 0;
}

describe('human approval workflow', () => {
  beforeEach(resetState);

  it('links a pending recommendation to an immutable audit snapshot', () => {
    const record = approvalController.addRecommendation({ type: 'redirect', message: 'Open gate B', priority: 'high', zone: 'A', predictionSnapshot: { occupancy: 90 } });
    const audit = auditLog.getEntry(record.auditEntryId);
    expect(record.status).toBe('pending');
    expect(audit.aiRecommendation.message).toBe('Open gate B');
    record.message = 'mutated';
    expect(audit.aiRecommendation.message).toBe('Open gate B');
  });

  it('approves exactly once and records the staff decision', () => {
    const record = approvalController.addRecommendation({ type: 'redirect', message: 'Open gate B', priority: 'high', zone: 'A' });
    const approved = approvalController.approveRecommendation(record.id, 'staff-001', 'Confirmed');
    expect(approved).toMatchObject({ status: 'approved', decidedBy: 'staff-001', notes: 'Confirmed' });
    expect(approved.decidedAt).toBeTruthy();
    expect(approvalController.approveRecommendation(record.id, 'staff-002')).toBeNull();
    expect(approvalController.approveRecommendation('missing', 'staff-002')).toBeNull();
    expect(auditLog.getEntry(record.auditEntryId).humanDecision).toBe('approved');
  });

  it('rejects exactly once and records the staff decision', () => {
    const record = approvalController.addRecommendation({ type: 'redirect', message: 'Open gate B', priority: 'high', zone: 'A' });
    const rejected = approvalController.rejectRecommendation(record.id, 'staff-002', 'Staffing unavailable');
    expect(rejected).toMatchObject({ status: 'rejected', decidedBy: 'staff-002', reason: 'Staffing unavailable' });
    expect(approvalController.rejectRecommendation(record.id, 'staff-001')).toBeNull();
    expect(approvalController.rejectRecommendation('missing', 'staff-001')).toBeNull();
    expect(auditLog.getEntry(record.auditEntryId).humanDecision).toBe('rejected');
  });
});

describe('credential and CSRF defenses', () => {
  it('stores only derived password material and verifies credentials in constant time', () => {
    const user = generateMockStaffUsers()[0];
    expect(user.password).toBeUndefined();
    expect(verifyMockPassword(user, 'pulse2026!')).toBe(true);
    expect(verifyMockPassword(user, 'incorrect')).toBe(false);
  });

  it('rejects missing or mismatched CSRF tokens', () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const next = vi.fn();
    requireCsrf({ cookies: {}, get: () => null }, { status, json }, next);
    expect(status).toHaveBeenCalledWith(403);

    requireCsrf({ cookies: { pulsegrid_csrf: 'token-a' }, get: () => 'token-b' }, { status, json }, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts matching CSRF tokens', () => {
    const next = vi.fn();
    requireCsrf({ cookies: { pulsegrid_csrf: 'token-a' }, get: () => 'token-a' }, {}, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
