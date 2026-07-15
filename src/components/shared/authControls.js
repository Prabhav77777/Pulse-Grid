import { getCurrentUser, login, logout } from '../../utils/api.js';
import { announceToScreenReader } from '../../utils/a11y.js';

/** Render a keyboard-accessible staff login/logout control. */
export async function renderAuthControls(container) {
  const renderLogin = () => {
    container.innerHTML = '<button class="btn btn-secondary btn-sm" type="button" id="staff-login">Staff login</button>';
    container.querySelector('#staff-login').addEventListener('click', openLoginDialog);
  };

  const renderUser = (user) => {
    container.innerHTML = `<span class="nav-user" aria-label="Signed in as ${escapeHtml(user.username)}">${escapeHtml(user.username)}</span><button class="btn btn-ghost btn-sm" type="button" id="staff-logout">Log out</button>`;
    container.querySelector('#staff-logout').addEventListener('click', async () => {
      await logout();
      renderLogin();
      announceToScreenReader('Signed out');
      window.dispatchEvent(new CustomEvent('pulsegrid-auth-changed'));
    });
  };

  try {
    const { user } = await getCurrentUser();
    renderUser(user);
  } catch {
    renderLogin();
  }

  function openLoginDialog() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="staff-login-title">
        <div class="modal-header"><h2 id="staff-login-title" class="modal-title">Staff login</h2></div>
        <form id="staff-login-form" class="modal-body">
          <label class="form-label" for="staff-username">Username</label>
          <input class="form-input" id="staff-username" name="username" autocomplete="username" required style="width: 100%; margin-bottom: var(--space-3); padding: var(--space-2); background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary);" />
          <label class="form-label" for="staff-password">Password</label>
          <input class="form-input" id="staff-password" name="password" type="password" autocomplete="current-password" required style="width: 100%; margin-bottom: var(--space-3); padding: var(--space-2); background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-md); color: var(--color-text-primary);" />
          
          <div class="demo-credentials" style="margin-bottom: var(--space-4); padding: var(--space-3); background: rgba(56, 189, 248, 0.08); border: 1px dashed rgba(6, 182, 212, 0.4); border-radius: var(--radius-md); font-size: var(--font-size-xs); font-family: var(--font-family-mono); color: var(--color-text-secondary);">
            <strong style="display: block; margin-bottom: var(--space-2); color: var(--color-accent-primary); font-family: var(--font-family-mono);">DEMO STAFF CREDENTIALS:</strong>
            <div>User: <span style="color: var(--color-accent-primary);">ops_commander</span></div>
            <div>Pass: <span style="color: var(--color-accent-primary);">pulse2026!</span></div>
          </div>

          <p id="staff-login-error" role="alert" style="color: var(--color-risk-red); font-size: var(--font-size-xs); margin-bottom: var(--space-3);" hidden></p>
          <div class="modal-footer"><button class="btn btn-secondary" type="button" id="staff-login-cancel">Cancel</button><button class="btn btn-primary" type="submit">Sign in</button></div>
        </form>
      </section>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--visible'));
    const username = overlay.querySelector('#staff-username');
    username.focus();
    const close = () => overlay.remove();
    overlay.querySelector('#staff-login-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    overlay.querySelector('#staff-login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const error = overlay.querySelector('#staff-login-error');
      const form = new FormData(event.currentTarget);
      try {
        const result = await login(form.get('username'), form.get('password'));
        renderUser(result.user);
        close();
        announceToScreenReader('Signed in successfully');
        window.dispatchEvent(new CustomEvent('pulsegrid-auth-changed'));
      } catch (err) {
        error.hidden = false;
        error.textContent = err.message || 'Sign-in failed. Check your credentials.';
      }
    });
  }
}

function escapeHtml(value) {
  const element = document.createElement('span');
  element.textContent = value || '';
  return element.innerHTML;
}
