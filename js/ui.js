/**
 * @file ui.js
 * @description DOM helper utilities, toast notifications, animations, and reusable UI components.
 */

const UI = (() => {
  "use strict";

  // ── Toast Notifications ───────────────────────────────────────────────────

  let toastQueue = [];
  let toastVisible = false;

  /**
   * Show a toast notification
   * @param {string} message
   * @param {'success'|'info'|'warning'|'achievement'} type
   * @param {number} duration ms
   */
  function toast(message, type = 'success', duration = 3500) {
    toastQueue.push({ message, type, duration });
    if (!toastVisible) processToastQueue();
  }

  function processToastQueue() {
    if (toastQueue.length === 0) { toastVisible = false; return; }
    toastVisible = true;
    const { message, type, duration } = toastQueue.shift();

    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', achievement: '🏆' };
    el.innerHTML = `<span class="toast__icon">${icons[type] || '💬'}</span><span>${message}</span>`;
    container.appendChild(el);

    requestAnimationFrame(() => { el.classList.add('toast--visible'); });

    setTimeout(() => {
      el.classList.remove('toast--visible');
      el.classList.add('toast--hiding');
      setTimeout(() => { el.remove(); processToastQueue(); }, 400);
    }, duration);
  }

  // ── Number Counter Animation ──────────────────────────────────────────────

  /**
   * Animate a number from 0 to target in an element
   * @param {HTMLElement} el
   * @param {number} target
   * @param {number} duration ms
   * @param {number} decimals
   */
  function animateCount(el, target, duration = 800, decimals = 2) {
    if (!el) return;
    const start = parseFloat(el.textContent) || 0;
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = start + (target - start) * eased;
      el.textContent = current.toFixed(decimals);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  // ── SVG Progress Ring ─────────────────────────────────────────────────────

  /**
   * Create an SVG progress ring
   * @param {number} percent 0-100
   * @param {number} size px
   * @param {string} color
   * @param {string} label
   * @param {string} sublabel
   */
  function createProgressRing(percent, size = 120, color = '#22c55e', label = '', sublabel = '') {
    const r = (size / 2) - 10;
    const circ = 2 * Math.PI * r;
    const offset = circ - (Math.min(percent, 100) / 100) * circ;
    const ringColor = percent > 100 ? '#ef4444' : color;

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="progress-ring" aria-label="${label}: ${percent}%">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
        <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${ringColor}" stroke-width="8"
          stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"
          stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"
          class="progress-ring__arc" style="transition: stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"/>
        <text x="${size/2}" y="${size/2 - 6}" text-anchor="middle" fill="#f0fdf4" font-size="15" font-weight="700" font-family="'Plus Jakarta Sans',system-ui">${label}</text>
        <text x="${size/2}" y="${size/2 + 12}" text-anchor="middle" fill="#6b7280" font-size="11" font-family="'Plus Jakarta Sans',system-ui">${sublabel}</text>
      </svg>`;
  }

  // ── Category Icon & Color Helpers ─────────────────────────────────────────

  const CATEGORY_META = {
    transport: { icon: '🚗', color: '#0ea5e9', label: 'Transport' },
    food:      { icon: '🍽️', color: '#22c55e', label: 'Food'      },
    energy:    { icon: '⚡', color: '#f59e0b', label: 'Energy'    },
    shopping:  { icon: '🛍️', color: '#8b5cf6', label: 'Shopping'  },
  };

  function getCategoryMeta(category) {
    return CATEGORY_META[category] || { icon: '📊', color: '#9ca3af', label: category };
  }

  // ── Equivalency Cards ─────────────────────────────────────────────────────

  /**
   * Render equivalency comparison cards for a given kg CO₂e
   * @param {number} kgCO2e
   * @returns {string} HTML
   */
  function renderEquivalencies(kgCO2e) {
    if (kgCO2e <= 0) return `<p class="muted-text">Log activities to see impact equivalencies.</p>`;
    const eq = Calculator.getEquivalencies(kgCO2e);
    const cards = [
      { icon: '🌳', label: 'Days of tree absorption',  value: eq.trees },
      { icon: '🚗', label: 'Km driven by car',         value: `${eq.carKm} km` },
      { icon: '📱', label: 'Smartphone charges',        value: eq.smartphoneCharges },
      { icon: '✈️', label: 'Minutes of flight',         value: `${eq.flightMinutes} min` },
    ];
    return cards.map(c => `
      <div class="equiv-card">
        <div class="equiv-icon">${c.icon}</div>
        <div class="equiv-value">${c.value}</div>
        <div class="equiv-label">${c.label}</div>
      </div>`).join('');
  }

  // ── Log Entry Card ────────────────────────────────────────────────────────

  /**
   * Render a single log entry card (for recent logs list)
   * @param {object} log
   * @returns {string} HTML
   */
  function renderLogCard(log) {
    const meta = getCategoryMeta(log.category);
    const time = new Date(log.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
    const date = new Date(log.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' });

    return `
      <div class="log-card" data-id="${log.id}" role="listitem">
        <div class="log-card__icon" style="color:${meta.color}">${log.icon || meta.icon}</div>
        <div class="log-card__info">
          <div class="log-card__label">${log.label}</div>
          <div class="log-card__meta">${date} · ${time} · ${log.quantity} ${log.unit || ''}</div>
        </div>
        <div class="log-card__kg" style="color:${meta.color}">
          ${log.kgCO2e.toFixed(2)} <span>kg</span>
        </div>
        <button class="log-card__delete" onclick="App.deleteLog('${log.id}')" aria-label="Delete log entry" title="Delete">✕</button>
      </div>`;
  }

  // ── Badge Card ────────────────────────────────────────────────────────────

  function renderBadge(badge) {
    const tierColors = { bronze: '#cd7f32', silver: '#9ca3af', gold: '#fbbf24' };
    const tierColor = tierColors[badge.tier] || '#6b7280';
    return `
      <div class="badge-card ${badge.unlocked ? 'badge-card--unlocked' : 'badge-card--locked'}"
           title="${badge.description}" role="img" aria-label="${badge.name}: ${badge.unlocked ? 'Unlocked' : 'Locked'}">
        <div class="badge-card__icon">${badge.unlocked ? badge.icon : '🔒'}</div>
        <div class="badge-card__name">${badge.name}</div>
        <div class="badge-card__tier" style="color:${tierColor}">${badge.tier.toUpperCase()}</div>
        ${badge.unlocked && badge.unlockedAt
          ? `<div class="badge-card__date">${new Date(badge.unlockedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>`
          : `<div class="badge-card__desc">${badge.description}</div>`}
      </div>`;
  }

  // ── Insight Card ──────────────────────────────────────────────────────────

  function renderInsightCard(tip, index) {
    const impactColors = { high: '#22c55e', medium: '#f59e0b', low: '#0ea5e9' };
    const color = impactColors[tip.impact] || '#9ca3af';
    return `
      <div class="insight-card" style="animation-delay:${index * 0.1}s" role="article">
        <div class="insight-card__header">
          <span class="insight-card__impact" style="background:${color}20;color:${color}">${tip.impact.toUpperCase()} IMPACT</span>
          ${tip.saving ? `<span class="insight-card__saving">💚 ${tip.saving}</span>` : ''}
        </div>
        <p class="insight-card__message">${tip.message}</p>
        <div class="insight-card__action">
          <span class="insight-card__action-label">💡 Action:</span> ${tip.action}
        </div>
      </div>`;
  }

  // ── Chat Bubble ───────────────────────────────────────────────────────────

  function renderChatBubble(text, role = 'ai') {
    const isAI = role === 'ai';
    const formattedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    return `
      <div class="chat-bubble chat-bubble--${role}" role="listitem">
        ${isAI ? `<div class="chat-bubble__avatar">🤖</div>` : ''}
        <div class="chat-bubble__content">
          <div class="chat-bubble__text">${formattedText}</div>
          <div class="chat-bubble__time">${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        ${!isAI ? `<div class="chat-bubble__avatar chat-bubble__avatar--user">👤</div>` : ''}
      </div>`;
  }

  // ── Scroll to bottom ──────────────────────────────────────────────────────

  function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Skeleton loader ───────────────────────────────────────────────────────

  function skeleton(lines = 3) {
    return Array.from({ length: lines }, () =>
      `<div class="skeleton-line"></div>`).join('');
  }

  // Public API
  return {
    toast,
    animateCount,
    createProgressRing,
    getCategoryMeta,
    renderEquivalencies,
    renderLogCard,
    renderBadge,
    renderInsightCard,
    renderChatBubble,
    scrollToBottom,
    skeleton,
    CATEGORY_META,
  };
})();
