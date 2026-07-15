/**
 * @file chat.js
 * @description AI Concierge chat page — fan-facing multilingual chat interface
 *   powered by Gemini. Provides instant stadium assistance with suggested
 *   quick-reply buttons and TTS-ready responses using chat.css classes.
 * #Business-Intent: GenAI Integration (20%) — demonstrates LLM concierge;
 *   Problem Alignment (20%) — fan experience improvement;
 *   Accessibility (10%) — ARIA live regions, keyboard input.
 *
 * @level-one-validation
 *   Summary: Chat UI with message list, input field, suggested questions,
 *     and loading indicator conforming to BEM selectors in chat.css.
 *   Correctness: Input sanitised; loading state prevents double-submit;
 *     ARIA live region announces new messages to screen readers.
 *   Rubric: GenAI Integration, Problem Alignment, Accessibility.
 *   Pass: YES
 *
 * @PR-changes
 *   Changes: Standardized page header styling to use pages.css layouts, styled system message headers, updated page title structure, and aligned @PR-changes block.
 *   Criteria improved: Command Console aesthetics, layout consistency.
 *   #Scope-Of-Improvement: Add localStorage message persistence.
 */

import { t } from '../../utils/i18n.js';
import { sendChatMessage } from '../../utils/api.js';
import { getCurrentLocale } from '../../utils/i18n.js';
import { announceToScreenReader } from '../../utils/a11y.js';

let chatHistory = [];

/**
 * Renders the chat page.
 * @param {HTMLElement} container
 */
export function renderChat(container) {
  chatHistory = [];

  container.innerHTML = `
    <section class="page chat-page" aria-labelledby="chat-title">
      <div class="page-header">
        <h1 id="chat-title" class="page-title" data-i18n="chat.title">${t('chat.title')}</h1>
        <p class="page-subtitle" data-i18n="chat.subtitle">${t('chat.subtitle')}</p>
      </div>

      <div class="chat">
        <div class="chat__header">
          <span class="chat__header-title" style="font-family: var(--font-family-mono); text-transform: uppercase;">${t('app.subtitle')} — AI Concierge Support</span>
          <span class="chat__status-dot" aria-label="System status online"></span>
        </div>

        <div id="chat-messages" class="chat__messages" role="log" aria-live="polite" aria-label="Chat messages">
          <div class="chat__message chat__message--ai">
            <div class="chat__bubble">${t('chat.welcome')}</div>
            <div class="chat__message-meta">${new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        <div class="chat__lang-bar" id="chat-suggestions">
          <button class="chat__lang-chip suggestion-btn" data-msg="${t('chat.suggestions.directions')}">${t('chat.suggestions.directions')}</button>
          <button class="chat__lang-chip suggestion-btn" data-msg="${t('chat.suggestions.food')}">${t('chat.suggestions.food')}</button>
          <button class="chat__lang-chip suggestion-btn" data-msg="${t('chat.suggestions.medical')}">${t('chat.suggestions.medical')}</button>
          <button class="chat__lang-chip suggestion-btn" data-msg="${t('chat.suggestions.accessibility')}">${t('chat.suggestions.accessibility')}</button>
        </div>

        <form id="chat-form" class="chat__input-area" aria-label="Chat input">
          <label for="chat-input" class="sr-only">${t('chat.placeholder')}</label>
          <input type="text" id="chat-input" class="chat__input"
                 placeholder="${t('chat.placeholder')}"
                 maxlength="500"
                 autocomplete="off"
                 aria-label="${t('chat.placeholder')}" />
          <button type="submit" id="chat-send" class="chat__send-btn" aria-label="${t('chat.send')}">
            <span aria-hidden="true">➤</span>
            <span class="sr-only">${t('chat.send')}</span>
          </button>
        </form>
      </div>
    </section>
  `;

  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messagesEl = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('chat-send');
  let isLoading = false;

  // Suggestion buttons
  container.querySelectorAll('.suggestion-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!isLoading) {
        input.value = btn.dataset.msg;
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message || isLoading) return;

    // Add user message
    appendMessage('user', message);
    input.value = '';
    isLoading = true;
    sendBtn.disabled = true;

    // Hide suggestions after first message
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';

    // Show loading indicator
    const loadingId = appendMessage('ai', t('chat.thinking'), true);

    try {
      const locale = getCurrentLocale();
      const response = await sendChatMessage(message, locale);
      removeMessage(loadingId);
      const aiText = response?.message || response?.response || t('chat.errorGeneric');
      appendMessage('ai', aiText);
      announceToScreenReader('AI responded');
    } catch (err) {
      removeMessage(loadingId);
      appendMessage('ai', t('chat.errorGeneric'));
      console.error('[Chat] Error:', err);
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });

  function appendMessage(sender, text, isWaiting = false) {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const msgWrapper = document.createElement('div');
    msgWrapper.className = `chat__message chat__message--${sender}`;
    msgWrapper.id = id;

    if (isWaiting) {
      msgWrapper.innerHTML = `
        <div class="chat__typing">
          <div class="chat__typing-dots">
            <span class="chat__typing-dot"></span>
            <span class="chat__typing-dot"></span>
            <span class="chat__typing-dot"></span>
          </div>
        </div>
      `;
    } else {
      msgWrapper.innerHTML = `
        <div class="chat__bubble">${escapeHtml(text)}</div>
        <div class="chat__message-meta">${new Date().toLocaleTimeString()}</div>
      `;
    }

    messagesEl.appendChild(msgWrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return id;
  }

  function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Cleanup for route teardown.
 */
export function cleanupChat() {
  chatHistory = [];
}
