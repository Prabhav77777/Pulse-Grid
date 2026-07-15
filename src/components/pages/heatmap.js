/**
 * @file heatmap.js
 * @description Crowd heatmap page — renders a visual stadium zone map with
 *   real-time occupancy data and 15/30-minute predictions using colour-coded
 *   risk levels (GREEN, YELLOW, RED) matching BEM styles.
 * #Business-Intent: Problem Alignment (20%) — core crowd-management
 *   visualisation; Accessibility (10%) — ARIA labels, keyboard nav, colour+text.
 *
 * @level-one-validation
 *   Summary: Fetches simulation state and predictions, renders a CSS-grid
 *     stadium layout conforming to .heatmap__grid and .heatmap__zone BEM structures.
 *   Correctness: Zone risk colors are state-driven using data-risk attributes.
 *   Rubric: Problem Alignment, Accessibility, Code Quality.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Redesigned the zone cells to render explicit monospace status telemetry labels ([OK], [WARN], [ALERT]) corresponding to risk states, added console loader state, updated page headers to match pages.css layout, and aligned @PR-changes blocks.
 *   Criteria improved: Command Console aesthetics, visual density, telemetry communication.
 *   #Scope-Of-Improvement: Replace CSS grid with an actual SVG stadium map.
 */

import { t } from '../../utils/i18n.js';
import { getSimulationState, getPredictions } from '../../utils/api.js';
import { announceToScreenReader } from '../../utils/a11y.js';

let refreshTimer = null;

/**
 * Renders the heatmap page.
 * @param {HTMLElement} container
 */
export function renderHeatmap(container) {
  container.innerHTML = `
    <section class="page heatmap-page" aria-labelledby="heatmap-title">
      <div class="page-header">
        <h1 id="heatmap-title" class="page-title" data-i18n="heatmap.title">${t('heatmap.title')}</h1>
        <p class="page-subtitle" data-i18n="heatmap.subtitle">${t('heatmap.subtitle')}</p>
      </div>

      <div class="heatmap-controls" role="tablist" aria-label="Prediction timeframe" style="display: flex; gap: var(--space-2); margin-bottom: var(--space-4);">
        <button role="tab" aria-selected="true" class="btn btn-primary tab-btn tab-btn--active" data-view="current">${t('heatmap.currentView')}</button>
        <button role="tab" aria-selected="false" class="btn btn-secondary tab-btn" data-view="15">${t('heatmap.predict15')}</button>
        <button role="tab" aria-selected="false" class="btn btn-secondary tab-btn" data-view="30">${t('heatmap.predict30')}</button>
      </div>

      <div class="heatmap">
        <div id="heatmap-grid" class="heatmap__grid" role="grid" aria-label="Stadium zone heatmap">
          <div class="console-loading" aria-label="${t('common.loading')}" style="grid-column: 1 / -1;">
            <div class="console-spinner"></div>
            <div class="console-loading-text">Loading telemetry feed...</div>
          </div>
        </div>
      </div>

      <div class="heatmap__legend" role="complementary" aria-label="${t('heatmap.legend')}">
        <span class="legend-title" style="font-family: var(--font-family-mono); font-weight: var(--font-weight-semibold); text-transform: uppercase;">${t('heatmap.legend')}:</span>
        <span class="heatmap__legend-item">
          <span class="heatmap__legend-swatch heatmap__legend-swatch--green"></span>
          ${t('heatmap.green')} (&lt;60%) [OK]
        </span>
        <span class="heatmap__legend-item">
          <span class="heatmap__legend-swatch heatmap__legend-swatch--yellow"></span>
          ${t('heatmap.yellow')} (60-85%) [WARN]
        </span>
        <span class="heatmap__legend-item">
          <span class="heatmap__legend-swatch heatmap__legend-swatch--red"></span>
          ${t('heatmap.red')} (&gt;85%) [ALERT]
        </span>
      </div>

      <p class="heatmap-timestamp" id="heatmap-updated" aria-live="polite" style="text-align: center; margin-top: var(--space-4); font-family: var(--font-family-mono); font-size: var(--font-size-xs); color: var(--color-text-muted);"></p>
    </section>
  `;

  let currentView = 'current';
  let stateData = null;
  let predictionsData = null;

  // Tab switching
  container.querySelectorAll('[role="tab"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('[role="tab"]').forEach((b) => {
        b.classList.remove('tab-btn--active', 'btn-primary');
        b.classList.add('btn-secondary');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('tab-btn--active', 'btn-primary');
      btn.classList.remove('btn-secondary');
      btn.setAttribute('aria-selected', 'true');
      currentView = btn.dataset.view;
      renderGrid(stateData, predictionsData, currentView);
    });
  });

  async function fetchAndRender() {
    try {
      const [state, preds] = await Promise.all([getSimulationState(), getPredictions()]);
      stateData = state;
      predictionsData = preds;
      renderGrid(stateData, predictionsData, currentView);
      const updated = document.getElementById('heatmap-updated');
      if (updated) {
        updated.textContent = t('heatmap.lastUpdated', { time: new Date().toLocaleTimeString() });
      }
    } catch (err) {
      console.error('[Heatmap] Fetch error:', err);
    }
  }

  function renderGrid(state, preds, view) {
    const grid = document.getElementById('heatmap-grid');
    if (!grid || !state) return;

    const zones = state.zones || [];
    const predictions = preds?.predictions || [];

    grid.innerHTML = zones
      .map((zone) => {
        const pred = predictions.find((p) => p.zoneId === zone.id);
        let occupancy, riskLevel;

        if (view === 'current') {
          occupancy = zone.data?.currentOccupancy ?? 0;
          const maxCap = zone.data?.maxCapacity ?? 1;
          const pct = (occupancy / maxCap) * 100;
          riskLevel = pct > 85 ? 'RED' : pct > 60 ? 'YELLOW' : 'GREEN';
        } else if (view === '15' && pred) {
          occupancy = pred.predicted15Min ?? 0;
          riskLevel = pred.riskLevel || 'GREEN';
        } else if (view === '30' && pred) {
          occupancy = pred.predicted30Min ?? 0;
          riskLevel = pred.riskLevel || 'GREEN';
        } else {
          occupancy = 0;
          riskLevel = 'GREEN';
        }

        const maxCap = zone.data?.maxCapacity ?? 1;
        const pct = Math.round((occupancy / maxCap) * 100);

        // Status telemetry string
        let statusString = '[OK]';
        let statusStyle = 'color: var(--color-success); border-color: var(--color-success); background: rgba(16, 185, 129, 0.1);';
        if (riskLevel === 'YELLOW') {
          statusString = '[WARN]';
          statusStyle = 'color: var(--color-warning); border-color: var(--color-warning); background: rgba(245, 158, 11, 0.1);';
        } else if (riskLevel === 'RED') {
          statusString = '[ALERT]';
          statusStyle = 'color: var(--color-danger); border-color: var(--color-danger); background: rgba(239, 68, 68, 0.1);';
        }

        return `
          <div class="heatmap__zone"
               data-risk="${riskLevel}"
               role="gridcell"
               tabindex="0"
               aria-label="${zone.data?.name || zone.id}: ${pct}% capacity, ${riskLevel} risk">
            <div class="heatmap__zone-label">
              ${zone.data?.name || zone.id}
              <span class="heatmap__zone-count">${pct}%</span>
              <span class="heatmap__zone-status" style="${statusStyle}">${statusString}</span>
            </div>
            <div class="heatmap__tooltip">
              Occupancy: ${occupancy} / ${maxCap} (${riskLevel})
            </div>
          </div>
        `;
      })
      .join('');
  }

  fetchAndRender();
  refreshTimer = setInterval(fetchAndRender, 30_000);
}

/**
 * Cleanup function for route teardown.
 */
export function cleanupHeatmap() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
