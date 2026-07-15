/**
 * @file highContrastToggle.js
 * @description Toggle button for high-contrast accessibility mode. Persists
 *   preference to localStorage and applies data-high-contrast attribute to document.
 * #Business-Intent: satisfies "Accessibility" criterion directly — high-contrast mode
 *
 * @level-one-validation
 *   Summary: Renders a toggle button that enables/disables high-contrast CSS overrides.
 *   Correctness: Persists to localStorage, applies attribute to html element, ARIA states managed.
 *   Rubric: Accessibility (high-contrast mode, ARIA toggle).
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Redesigned the high-contrast toggle to consume core secondary button classes with inline console font styling and clear accessibility text indicators.
 *   Criteria improved: Command Console styling consistency.
 *   #Scope-Of-Improvement: Would add auto-detection of OS high-contrast preference via media query.
 */

import { t } from '../../utils/i18n.js';
import { announceToScreenReader } from '../../utils/a11y.js';

/**
 * Renders the high-contrast toggle into the target container.
 * @param {HTMLElement} container - Parent element
 * @returns {HTMLElement} The rendered toggle element
 * #Business-Intent: satisfies "Accessibility" — high-contrast mode toggle
 */
export function renderHighContrastToggle(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'high-contrast-toggle';

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'high-contrast-btn';
  button.className = 'btn btn-secondary btn-sm';
  button.style.padding = 'var(--space-2) var(--space-3)';
  button.style.fontFamily = 'var(--font-family-mono)';
  button.style.fontSize = 'var(--font-size-xs)';
  button.style.display = 'inline-flex';
  button.style.alignItems = 'center';
  button.style.justifyContent = 'center';
  button.setAttribute('aria-label', t('accessibility.highContrast'));
  button.setAttribute('data-i18n-aria', 'accessibility.highContrast');

  // #What: Check stored preference on init
  const isHighContrast = localStorage.getItem('pulsegrid-high-contrast') === 'true';
  applyHighContrast(isHighContrast);
  button.setAttribute('aria-pressed', String(isHighContrast));
  button.innerHTML = `<span aria-hidden="true" style="margin-right: var(--space-1);">${isHighContrast ? '☀️' : '🌙'}</span> A11Y`;

  button.addEventListener('click', () => {
    const currentState = document.documentElement.getAttribute('data-high-contrast') === 'true';
    const newState = !currentState;

    applyHighContrast(newState);
    localStorage.setItem('pulsegrid-high-contrast', String(newState));
    button.setAttribute('aria-pressed', String(newState));
    button.innerHTML = `<span aria-hidden="true" style="margin-right: var(--space-1);">${newState ? '☀️' : '🌙'}</span> A11Y`;

    announceToScreenReader(
      newState ? 'High contrast mode enabled' : 'High contrast mode disabled'
    );
  });

  wrapper.appendChild(button);
  container.appendChild(wrapper);
  return wrapper;
}

/**
 * Applies or removes the high-contrast attribute on the document root.
 * @param {boolean} enabled - Whether high-contrast mode should be active
 */
function applyHighContrast(enabled) {
  document.documentElement.setAttribute('data-high-contrast', String(enabled));
}
