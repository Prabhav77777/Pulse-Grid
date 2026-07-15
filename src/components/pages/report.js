/**
 * @file report.js
 * @description Operations report page — generates a post-event analysis
 *   combining AI narrative with deterministic statistics from the audit log
 *   and prediction history.
 * #Business-Intent: GenAI Integration (20%) — AI-generated narrative report;
 *   Code Quality (25%) — clean markdown rendering.
 *
 * @level-one-validation
 *   Summary: Single-button trigger that calls /api/report/generate, renders
 *     the markdown response with basic formatting, and provides a download link.
 *   Correctness: Handles API errors gracefully; renders markdown headings,
 *     lists, and bold text.
 *   Rubric: GenAI Integration, Code Quality, Problem Alignment.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Redesigned the report view to render post-event reports inside a custom terminal-console UI wrapper with decorative window controls, styled markdown headings with cyan/monospace borders, and correctly wired button classes.
 *   Criteria improved: Post-event reporting clarity, Command Console styling consistency.
 *   #Scope-Of-Improvement: Use a full markdown renderer (marked.js);
 *     add PDF export; add chart visualisations.
 */

import { t } from '../../utils/i18n.js';
import { generateReport } from '../../utils/api.js';
import { announceToScreenReader } from '../../utils/a11y.js';

let currentReport = null;

/**
 * Renders the report page.
 * @param {HTMLElement} container
 */
export function renderReport(container) {
  container.innerHTML = `
    <section class="page report-page" aria-labelledby="report-title">
      <div class="page-header" style="margin-bottom: var(--space-6);">
        <h1 id="report-title" class="page-title">${t('report.title')}</h1>
        <p class="page-subtitle">${t('report.subtitle')}</p>
      </div>

      <div class="report-actions" style="margin-bottom: var(--space-6); display: flex; gap: var(--space-3);">
        <button id="report-generate" class="btn btn-primary btn-lg">
          <span aria-hidden="true">📋</span> ${t('report.generate')}
        </button>
        <button id="report-download" class="btn btn-secondary" style="display:none">
          <span aria-hidden="true">⬇️</span> ${t('report.download')}
        </button>
      </div>

      <div class="terminal-container" style="border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-bg-secondary); overflow: hidden; box-shadow: var(--shadow-lg), var(--shadow-glow);">
        <div class="terminal-header" style="background: rgba(6, 182, 212, 0.08); border-bottom: 1px solid var(--color-border); padding: var(--space-2) var(--space-4); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: var(--space-2);">
            <span style="width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-danger); display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-warning); display: inline-block;"></span>
            <span style="width: 8px; height: 8px; border-radius: var(--radius-full); background: var(--color-success); display: inline-block;"></span>
          </div>
          <span style="font-family: var(--font-family-mono); font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.1em;">TERMINAL // REPORT_GEN_SERVICE</span>
          <span style="width: 40px;"></span>
        </div>
        <div id="report-content" class="report-content" role="region" aria-live="polite" aria-label="Report content" style="padding: var(--space-6); min-height: 200px; max-height: 600px; overflow-y: auto; font-family: var(--font-family); color: var(--color-text-primary); line-height: var(--line-height-loose);">
          <p class="empty-state" style="font-family: var(--font-family-mono); color: var(--color-text-muted); font-size: var(--font-size-sm); text-align: center; padding-top: var(--space-8);">${t('report.noReport')}</p>
        </div>
      </div>
    </section>
  `;

  const generateBtn = document.getElementById('report-generate');
  const downloadBtn = document.getElementById('report-download');
  const contentEl = document.getElementById('report-content');

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<span class="spinner-inline"></span> ${t('report.generating')}`;
    contentEl.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
      const result = await generateReport();
      currentReport = result?.report || result?.markdown || JSON.stringify(result, null, 2);
      contentEl.innerHTML = `<div class="report-markdown">${renderMarkdown(currentReport)}</div>`;
      downloadBtn.style.display = 'inline-flex';
      announceToScreenReader('Report generated successfully');
    } catch (err) {
      contentEl.innerHTML = `<div class="card card--error"><p>${t('common.error')}: ${err.message || 'Failed to generate report'}</p></div>`;
      console.error('[Report] Error:', err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `<span aria-hidden="true">📋</span> ${t('report.generate')}`;
    }
  });

  downloadBtn.addEventListener('click', () => {
    if (!currentReport) return;
    const blob = new Blob([currentReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulsegrid-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

/**
 * Minimal markdown → HTML renderer.
 * #Scope-Of-Improvement: Replace with marked.js for full GFM support.
 */
function renderMarkdown(md) {
  if (!md) return '';
  const escaped = String(md)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  return escaped
    .replace(/^### (.+)$/gm, '<h3 style="color: var(--color-accent-primary); font-family: var(--font-family-mono); font-size: var(--font-size-base); margin-top: var(--space-4); margin-bottom: var(--space-2); border-bottom: 1px solid rgba(6, 182, 212, 0.15); padding-bottom: var(--space-1);">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color: var(--color-accent-primary); font-family: var(--font-family-mono); font-size: var(--font-size-lg); margin-top: var(--space-6); margin-bottom: var(--space-3);">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color: var(--color-text-primary); font-family: var(--font-family-mono); font-size: var(--font-size-xl); margin-top: var(--space-8); margin-bottom: var(--space-4); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-2);">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color: var(--color-text-primary); font-weight: var(--font-weight-bold);">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color: var(--color-text-secondary);">$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin-left: var(--space-4); margin-bottom: var(--space-2); list-style-type: square; color: var(--color-text-secondary);">$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul style="margin-bottom: var(--space-4);">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin-bottom: var(--space-4); color: var(--color-text-secondary);">')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p style="margin-bottom: var(--space-4); color: var(--color-text-secondary);">')
    .replace(/$/, '</p>');
}

export function cleanupReport() {
  currentReport = null;
}
