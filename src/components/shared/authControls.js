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
          <input class="form-input" id="staff-username" name="username" autocomplete="username" required />
          <label class="form-label" for="staff-password">Password</label>
          <input class="form-input" id="staff-password" name="password" type="password" autocomplete="current-password" required />
          <p id="staff-login-error" role="alert" hidden></p>
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
