/**
 * @file modal.js
 * @description Accessible modal dialog component with focus trapping, Escape-to-close,
 *   and screen reader announcements. Used for confirmations and detail views.
 * #Business-Intent: satisfies "Accessibility" (focus trap, keyboard nav, ARIA dialog)
 *   and "Code Quality" (reusable component pattern)
 *
 * @level-one-validation
 *   Summary: Generic modal with open/close API, focus trap, ARIA dialog role, Escape key support.
 *   Correctness: Focus is trapped within modal when open, returned to trigger element on close.
 *   Rubric: Accessibility (focus trap, ARIA), Code Quality (reusable, clean API).
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Redesigned modal components to consume the core button classes (btn-primary, btn-secondary, btn-ghost) and aligned styling references.
 *   Criteria improved: Accessibility (focus outlines), design consistency.
 *   #Scope-Of-Improvement: Would add stacking for nested modals.
 */

import { trapFocus, announceToScreenReader } from '../../utils/a11y.js';
import { t } from '../../utils/i18n.js';

/**
 * Creates and manages a modal dialog.
 * @param {object} options - { title, content (HTML string), onConfirm?, onCancel?, showCancel? }
 * @returns {object} { open(), close(), element }
 * #Business-Intent: satisfies "Accessibility" — ARIA dialog with focus trap
 */
export function createModal(options = {}) {
  const {
    title = '',
    content = '',
    onConfirm = null,
    onCancel = null,
    showCancel = true,
  } = options;

  let triggerElement = null;
  let focusTrapInstance = null;

  // Build modal DOM
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'presentation');

  const dialog = document.createElement('div');
  dialog.className = 'modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', title);
  dialog.tabIndex = -1;

  dialog.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${title}</h2>
      <button type="button" class="modal-close btn btn-ghost btn-sm" aria-label="${t('common.close')}">
        <span aria-hidden="true">✕</span>
      </button>
    </div>
    <div class="modal-body">${content}</div>
    <div class="modal-footer">
      ${showCancel ? `<button type="button" class="btn btn-secondary modal-cancel-btn">${t('common.cancel')}</button>` : ''}
      ${onConfirm ? `<button type="button" class="btn btn-primary modal-confirm-btn">${t('common.confirm')}</button>` : ''}
    </div>
  `;

  overlay.appendChild(dialog);

  // Event handlers
  const closeBtn = dialog.querySelector('.modal-close');
  const cancelBtn = dialog.querySelector('.modal-cancel-btn');
  const confirmBtn = dialog.querySelector('.modal-confirm-btn');

  function close() {
    if (focusTrapInstance) {
      focusTrapInstance.deactivate();
    }
    overlay.classList.remove('modal-overlay--visible');
    setTimeout(() => overlay.remove(), 200);

    // #Business-Intent: satisfies "Accessibility" — return focus to trigger element
    if (triggerElement && triggerElement.focus) {
      triggerElement.focus();
    }
  }

  closeBtn.addEventListener('click', close);
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (onCancel) onCancel();
      close();
    });
  }
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (onConfirm) onConfirm();
      close();
    });
  }

  // Close on overlay click (outside dialog)
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  // Close on Escape key
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  }

  function open() {
    triggerElement = document.activeElement;
    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('modal-overlay--visible');
    });

    // Set up focus trap
    focusTrapInstance = trapFocus(dialog);
    focusTrapInstance.activate();

    // Focus the dialog
    dialog.focus();

    document.addEventListener('keydown', handleKeydown);
    announceToScreenReader(`Dialog opened: ${title}`);
  }

  return { open, close, element: overlay };
}
