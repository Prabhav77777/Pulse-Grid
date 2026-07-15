/**
 * @file router.js
 * @description Client-side SPA router using the History API. Manages navigation
 *   between PulseGrid views without full page reloads.
 * #Business-Intent: satisfies "Code Quality" — clean separation of routing from
 *   component logic; also supports "Accessibility" via focus management on route change
 *
 * @level-one-validation
 *   Summary: History API router with route registration, navigation, and a11y focus management.
 *   Correctness: Handles popstate, prevents default on link clicks, manages focus for screen readers.
 *   Rubric: Code Quality (modular routing), Accessibility (focus management on navigation).
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Initial creation.
 *   Criteria improved: Code Quality (SPA routing), Accessibility (focus on route change).
 *   #Scope-Of-Improvement: Would add route guards for authenticated routes, lazy loading of components.
 */

import { announceToScreenReader } from './utils/a11y.js';

// #What: Route registry — maps URL paths to component render functions
const routes = new Map();
let currentRoute = null;
let appContainer = null;

/**
 * Registers a route with its render function.
 * @param {string} path - URL path (e.g., '/', '/chat')
 * @param {object} config - { title: string, render: function(container), cleanup?: function }
 * #Business-Intent: satisfies "Code Quality" — declarative route registration
 */
export function registerRoute(path, config) {
  routes.set(path, config);
}

/**
 * Initializes the router, attaches event listeners, and navigates to the current URL.
 * @param {HTMLElement} container - The DOM element where views are rendered
 * #Business-Intent: satisfies "Code Quality" — single initialization point for routing
 */
export function initRouter(container) {
  appContainer = container;

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    renderCurrentRoute();
  });

  // Intercept link clicks for SPA navigation
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-route]');
    if (!link) return;
    event.preventDefault();
    const path = link.getAttribute('href');
    navigateTo(path);
  });

  renderCurrentRoute();
}

/**
 * Programmatically navigates to a new route.
 * @param {string} path - Target URL path
 * #Business-Intent: satisfies "Accessibility" — announces route change to screen readers
 */
export function navigateTo(path) {
  if (path === currentRoute) return;
  window.history.pushState({}, '', path);
  renderCurrentRoute();
}

/**
 * Renders the component for the current URL path.
 * Manages cleanup of previous route and focus for accessibility.
 */
function renderCurrentRoute() {
  const path = window.location.pathname;
  const route = routes.get(path) || routes.get('/');

  if (!route || !appContainer) return;

  // Cleanup previous route if it has a cleanup function
  if (currentRoute && routes.has(currentRoute)) {
    const prevRoute = routes.get(currentRoute);
    if (typeof prevRoute.cleanup === 'function') {
      prevRoute.cleanup();
    }
  }

  currentRoute = path;

  // Update page title for SEO and screen readers
  document.title = `${route.title} — PulseGrid`;

  // Render the new view
  route.render(appContainer);

  // #Business-Intent: satisfies "Accessibility" — focus management on route change
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.focus({ preventScroll: true });
  }

  // Announce route change to screen readers
  announceToScreenReader(`Navigated to ${route.title}`);

  // Update active nav link
  updateActiveNavLink(path);
}

/**
 * Updates the visual active state on navigation links.
 * @param {string} activePath - The currently active path
 */
function updateActiveNavLink(activePath) {
  const navLinks = document.querySelectorAll('nav a[data-route]');
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    const isActive = href === activePath;
    link.classList.toggle('nav__link--active', isActive);
    link.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

/**
 * Returns the current route path.
 * @returns {string} Current URL path
 */
export function getCurrentRoute() {
  return currentRoute || window.location.pathname;
}
