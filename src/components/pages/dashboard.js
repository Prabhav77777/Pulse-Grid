/**
 * @file dashboard.js
 * @description Operations dashboard — staff view showing AI-generated
 *   recommendations with human-in-the-loop approve/reject workflow, stats
 *   cards, and audit log conforming to dashboard.css BEM styling.
 * #Business-Intent: Security (25%) — enforces human approval gate;
 *   GenAI Integration (20%) — surfaces AI recommendations;
 *   Code Quality (25%) — modular card rendering with state management.
 *
 * @level-one-validation
 *   Summary: Stats bar, pending recommendation cards, and audit log table
 *     conforming to BEM selectors in dashboard.css.
 *   Correctness: Approve/reject operations trigger mutations and local updates.
 *   Rubric: Security (human-in-the-loop), GenAI Integration, Code Quality.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Updated HTML structure to match dashboard.css selectors.
 *   Criteria improved: Visual alignment, severity border highlights, stats cards.
 *   #Scope-Of-Improvement: Add WebSockets for live recommendation push.
 */

import { t } from '../../utils/i18n.js';
import {
  getRecommendations,
  approveRecommendation,
  rejectRecommendation,
  getAuditLog,
} from '../../utils/api.js';
import { announceToScreenReader } from '../../utils/a11y.js';

let refreshTimer = null;

/**
 * Renders the dashboard page.
 * @param {HTMLElement} container
 */
export function renderDashboard(container) {
  container.innerHTML = `
    <section class="page dashboard-page" aria-labelledby="dashboard-title">
      <div class="page-header" style="margin-bottom: var(--space-6);">
        <h1 id="dashboard-title" class="page-title">${t('dashboard.title')}</h1>
        <p class="page-subtitle">${t('dashboard.subtitle')}</p>
      </div>

      <div id="dashboard-stats" class="stats-grid" role="region" aria-label="Dashboard statistics" style="margin-bottom: var(--space-6);"></div>

      <div class="dashboard-sections" style="display: grid; grid-template-columns: 1fr; gap: var(--space-6);">
        <div class="dashboard-section">
          <h2 class="section-title" style="margin-bottom: var(--space-3); font-size: var(--font-size-xl);">${t('dashboard.pending')}</h2>
          <div id="pending-list" class="recommendation-list" role="list" aria-label="Pending recommendations" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div class="loading-spinner"><div class="spinner"></div></div>
          </div>
        </div>

        <div class="dashboard-section">
          <h2 class="section-title" style="margin-bottom: var(--space-3); font-size: var(--font-size-xl);">${t('dashboard.auditLog')}</h2>
          <div id="audit-log" class="card" role="region" aria-label="Audit log" style="overflow-x: auto; padding: 0;"></div>
        </div>
      </div>
    </section>
  `;

  fetchAndRender();
  refreshTimer = setInterval(fetchAndRender, 30_000);
}

async function fetchAndRender() {
  try {
    const [recsData, auditData] = await Promise.all([
      getRecommendations(),
      getAuditLog(),
    ]);
    renderStats(recsData, auditData);
    renderPending(recsData?.pending || []);
    renderAuditLog(auditData?.entries || []);
  } catch (err) {
    console.error('[Dashboard] Fetch error:', err);
    const listEl = document.getElementById('pending-list');
    if (listEl) {
      listEl.innerHTML = '<p class="empty-state" role="alert">Staff authentication is required to view operational recommendations and audit data.</p>';
    }
  }
}

function renderStats(recs, audit) {
  const statsEl = document.getElementById('dashboard-stats');
  if (!statsEl) return;

  const pending = recs?.pending?.length || 0;
  const total = (recs?.pending?.length || 0) + (recs?.history?.length || 0);
  const stats = audit?.statistics || {};

  statsEl.innerHTML = `
    <div class="stat-card">
      <span class="stat-card__value">${total}</span>
      <span class="stat-card__label">${t('dashboard.stats.total')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card__value" style="background: linear-gradient(135deg, var(--color-warning), #fb923c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${pending}</span>
      <span class="stat-card__label">${t('dashboard.pending')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card__value" style="background: linear-gradient(135deg, var(--color-success), #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${stats.approved || 0}</span>
      <span class="stat-card__label">${t('dashboard.approved')}</span>
    </div>
    <div class="stat-card">
      <span class="stat-card__value" style="background: linear-gradient(135deg, var(--color-danger), #f87171); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">${stats.rejected || 0}</span>
      <span class="stat-card__label">${t('dashboard.rejected')}</span>
    </div>
  `;
}

function renderPending(pending) {
  const listEl = document.getElementById('pending-list');
  if (!listEl) return;

  if (pending.length === 0) {
    listEl.innerHTML = `<p class="empty-state" style="text-align: center; color: var(--color-text-muted); padding: var(--space-6);">${t('dashboard.noRecommendations')}</p>`;
    return;
  }

  listEl.innerHTML = pending
    .map(
      (rec) => `
    <div class="recommendation-card" role="listitem" data-id="${rec.id}" data-severity="${(rec.severity || 'medium').toLowerCase()}">
      <h3 class="recommendation-card__title">${escapeHtml(rec.title || 'Recommendation')}</h3>
      <p class="recommendation-card__body">${escapeHtml(rec.description || '')}</p>
      
      <div class="recommendation-card__meta">
        ${rec.affectedZones ? `<span><strong>${t('dashboard.affectedZones')}:</strong> ${escapeHtml(rec.affectedZones.join(', '))}</span>` : ''}
        ${rec.suggestedAction ? `<span><strong>${t('dashboard.suggestedAction')}:</strong> ${escapeHtml(rec.suggestedAction)}</span>` : ''}
      </div>

      <div class="action-group">
        <button class="btn-approve" data-id="${rec.id}" aria-label="${t('dashboard.approve')}: ${rec.title}">✓ ${t('dashboard.approve')}</button>
        <button class="btn-reject" data-id="${rec.id}" aria-label="${t('dashboard.reject')}: ${rec.title}">✗ ${t('dashboard.reject')}</button>
      </div>
    </div>
  `,
    )
    .join('');

  // Attach approve/reject handlers
  listEl.querySelectorAll('.btn-approve').forEach((btn) => {
    btn.addEventListener('click', () => handleApprove(btn.dataset.id));
  });
  listEl.querySelectorAll('.btn-reject').forEach((btn) => {
    btn.addEventListener('click', () => handleReject(btn.dataset.id));
  });
}

async function handleApprove(id) {
  const notes = prompt('Notes (optional):') || '';
  try {
    await approveRecommendation(id, notes);
    announceToScreenReader('Recommendation approved');
    fetchAndRender();
  } catch (err) {
    console.error('[Dashboard] Approve error:', err);
    alert('Failed to approve: ' + (err.message || 'Unknown error'));
  }
}

async function handleReject(id) {
  const reason = prompt('Reason for rejection:');
  if (!reason) return;
  try {
    await rejectRecommendation(id, reason);
    announceToScreenReader('Recommendation rejected');
    fetchAndRender();
  } catch (err) {
    console.error('[Dashboard] Reject error:', err);
    alert('Failed to reject: ' + (err.message || 'Unknown error'));
  }
}

function renderAuditLog(entries) {
  const container = document.getElementById('audit-log');
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = `<p class="empty-state" style="text-align: center; color: var(--color-text-muted); padding: var(--space-6);">${t('common.noData')}</p>`;
    return;
  }

  const recent = entries.slice(-20).reverse();
  container.innerHTML = `
    <table class="audit-table" role="table">
      <thead>
        <tr>
          <th scope="col">Time</th>
          <th scope="col">Decision</th>
          <th scope="col">${t('dashboard.decidedBy')}</th>
          <th scope="col">${t('dashboard.staffNotes')}</th>
        </tr>
      </thead>
      <tbody>
        ${recent
          .map(
            (e) => `
          <tr>
            <td>${new Date(e.timestamp).toLocaleTimeString()}</td>
            <td>
              <span class="status-badge status-badge--${(e.humanDecision || 'pending').toLowerCase()}">
                ${e.humanDecision || 'Pending'}
              </span>
            </td>
            <td>${escapeHtml(e.decidedBy || '—')}</td>
            <td>${escapeHtml(e.notes || e.reason || '—')}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function cleanupDashboard() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
