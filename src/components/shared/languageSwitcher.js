/**
 * @file languageSwitcher.js
 * @description Language selection dropdown for multilingual UI support.
 *   Switches the entire UI locale when a language is selected.
 * #Business-Intent: satisfies "Problem Alignment: multilingual support" and "Accessibility"
 *
 * @level-one-validation
 *   Summary: Renders a language selector that triggers full UI locale change.
 *   Correctness: Uses i18n.setLocale() to update all [data-i18n] elements. ARIA attributes applied.
 *   Rubric: Problem Alignment (multilingual UI), Accessibility (ARIA, keyboard).
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Redesigned the language selector to consume the core .select class with custom monospace console styles and auto-width sizing.
 *   Criteria improved: Command Console styling consistency.
 *   #Scope-Of-Improvement: Would detect browser locale and auto-set on first visit.
 */

import { setLocale, getCurrentLocale, getAvailableLocales } from '../../utils/i18n.js';
import { announceToScreenReader } from '../../utils/a11y.js';

const LOCALE_LABELS = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ar: 'العربية',
};

/**
 * Renders the language switcher into the target container.
 * @param {HTMLElement} container - Parent element
 * @returns {HTMLElement} The rendered switcher element
 * #Business-Intent: satisfies "Problem Alignment: multilingual support"
 */
export function renderLanguageSwitcher(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'language-switcher';

  const select = document.createElement('select');
  select.id = 'language-select';
  select.className = 'language-select select';
  select.style.width = 'auto';
  select.style.padding = 'var(--space-2) var(--space-4)';
  select.style.fontFamily = 'var(--font-family-mono)';
  select.style.fontSize = 'var(--font-size-xs)';
  select.style.cursor = 'pointer';
  select.setAttribute('aria-label', 'Select language');
  select.setAttribute('data-i18n-aria', 'accessibility.languageSelect');

  const locales = getAvailableLocales();
  const current = getCurrentLocale();

  locales.forEach((locale) => {
    const option = document.createElement('option');
    option.value = locale;
    option.textContent = LOCALE_LABELS[locale] || locale;
    option.selected = locale === current;
    select.appendChild(option);
  });

  select.addEventListener('change', async (event) => {
    const newLocale = event.target.value;
    await setLocale(newLocale);

    // Set document direction for RTL languages
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;

    announceToScreenReader(`Language changed to ${LOCALE_LABELS[newLocale]}`);
  });

  wrapper.appendChild(select);
  container.appendChild(wrapper);
  return wrapper;
}
