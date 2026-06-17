/**
 * @file app.js
 * @description Main application bootstrap, routing, and view rendering for EcoTrace.
 * Single-page app with 5 views: dashboard, log, analytics, coach, achievements.
 */

const App = (() => {
  "use strict";

  // ── State ─────────────────────────────────────────────────────────────────
  let currentView = 'dashboard';

  // ── Router ────────────────────────────────────────────────────────────────

  function navigate(view) {
    currentView = view;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('nav-item--active', el.dataset.view === view);
    });

    // Render view
    const main = document.getElementById('main-content');
    main.style.opacity = '0';
    main.style.transform = 'translateY(8px)';

    setTimeout(() => {
      renderView(view);
      main.style.opacity = '1';
      main.style.transform = 'translateY(0)';
    }, 160);
  }

  function renderView(view) {
    const views = {
      dashboard:    renderDashboard,
      log:          renderLog,
      analytics:    renderAnalytics,
      coach:        renderCoach,
      achievements: renderAchievements,
    };
    (views[view] || renderDashboard)();
  }

  // ── DASHBOARD VIEW ────────────────────────────────────────────────────────

  function renderDashboard() {
    const todayStr    = new Date().toISOString().slice(0, 10);
    const todayKg     = Storage.getDailyTotal(todayStr);
    const rating      = Calculator.getDailyRating(todayKg);
    const goals       = Gamification.getGoalProgress();
    const streakData  = Storage.getStreakData();
    const tips        = AIEngine.getPersonalizedTips(3);
    const breakdown   = Storage.getCategoryBreakdown(7);
    const dailyTotals = Storage.getDailyTotals(7);
    const recentLogs  = Storage.getRecentLogs(1);
    const weeklyKg    = Object.values(breakdown).reduce((s, v) => s + v, 0);

    document.getElementById('main-content').innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Dashboard</h1>
          <p class="view-subtitle">${new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div class="streak-badge" title="Current logging streak">
          🔥 <strong>${streakData.current}</strong> day streak
        </div>
      </div>

      <!-- Score Cards Row -->
      <div class="cards-grid cards-grid--3">
        <div class="stat-card stat-card--primary">
          <div class="stat-card__label">Today's Footprint</div>
          <div class="stat-card__value" id="today-kg">${todayKg.toFixed(2)}</div>
          <div class="stat-card__unit">kg CO₂e</div>
          <div class="stat-card__rating" style="color:${rating.color}">${rating.grade} · ${rating.rating}</div>
          <div class="stat-card__desc">${rating.description}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">This Week</div>
          <div class="stat-card__value" id="week-kg">${weeklyKg.toFixed(1)}</div>
          <div class="stat-card__unit">kg CO₂e</div>
          <div class="stat-card__progress">
            <div class="progress-bar">
              <div class="progress-bar__fill" style="width:${Math.min(100, (weeklyKg / goals.weekly.target) * 100)}%;background:${weeklyKg > goals.weekly.target ? '#ef4444' : '#22c55e'}"></div>
            </div>
            <span class="progress-bar__label">${goals.weekly.target} kg goal</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Badges Earned</div>
          <div class="stat-card__value">${Gamification.getUnlockedCount()}</div>
          <div class="stat-card__unit">of ${Gamification.BADGES.length}</div>
          <button class="btn btn--ghost btn--sm" onclick="App.navigate('achievements')" style="margin-top:8px">View All →</button>
        </div>
      </div>

      <!-- 7-Day Trend Sparkline -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">7-Day Trend</h2>
          <button class="btn btn--ghost btn--sm" onclick="App.navigate('analytics')">Full Analytics →</button>
        </div>
        <div class="chart-container chart-container--sm">
          <canvas id="chart-trend-7d" aria-label="7-day emissions trend chart"></canvas>
        </div>
      </div>

      <!-- AI Insights -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">🤖 AI Eco-Coach Insights</h2>
          <button class="btn btn--ghost btn--sm" onclick="App.navigate('coach')">Chat →</button>
        </div>
        <div id="insights-container">
          ${tips.length > 0
            ? tips.map((t, i) => UI.renderInsightCard(t, i)).join('')
            : `<p class="muted-text">Log activities to receive personalized insights!</p>`}
        </div>
      </div>

      <!-- Category Breakdown (mini donut) -->
      <div class="cards-grid cards-grid--2">
        <div class="card">
          <h2 class="card__title">This Week's Breakdown</h2>
          <div class="chart-container chart-container--md">
            <canvas id="chart-donut-dash" aria-label="Weekly emissions breakdown by category"></canvas>
          </div>
        </div>
        <div class="card">
          <h2 class="card__title">Impact Equivalencies</h2>
          <p class="muted-text" style="font-size:12px;margin-bottom:12px">Your weekly ${weeklyKg.toFixed(1)} kg CO₂e equals…</p>
          <div class="equiv-grid">
            ${UI.renderEquivalencies(weeklyKg)}
          </div>
        </div>
      </div>

      <!-- Recent Logs -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">Today's Activity</h2>
          <button class="btn btn--primary btn--sm" onclick="App.navigate('log')">+ Log Activity</button>
        </div>
        <div id="recent-logs-list" role="list">
          ${recentLogs.length > 0
            ? recentLogs.map(l => UI.renderLogCard(l)).join('')
            : `<div class="empty-state">
                <div class="empty-state__icon">📋</div>
                <p>No activities logged today yet.</p>
                <button class="btn btn--primary btn--sm" onclick="App.navigate('log')">Log Your First Activity</button>
               </div>`}
        </div>
      </div>
    `;

    // Render charts after DOM is ready
    setTimeout(() => {
      Charts.renderTrend('chart-trend-7d', dailyTotals, 'line');
      Charts.renderDonut('chart-donut-dash', breakdown);
      // Animate numbers
      UI.animateCount(document.getElementById('today-kg'), todayKg, 800, 2);
      UI.animateCount(document.getElementById('week-kg'), weeklyKg, 800, 1);
    }, 50);
  }

  // ── LOG ACTIVITY VIEW ─────────────────────────────────────────────────────

  function renderLog() {
    const recentLogs = Storage.getRecentLogs(7).slice().reverse().slice(0, 10);

    document.getElementById('main-content').innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Log Activity</h1>
          <p class="view-subtitle">Track your daily emissions across 4 categories</p>
        </div>
      </div>

      <!-- Category Selector -->
      <div class="category-tabs" role="tablist" aria-label="Activity categories">
        ${['transport','food','energy','shopping'].map(cat => {
          const m = UI.getCategoryMeta(cat);
          return `<button class="category-tab ${cat === 'transport' ? 'category-tab--active' : ''}"
                    data-category="${cat}" role="tab" aria-selected="${cat === 'transport'}"
                    onclick="App.selectCategory('${cat}')" id="tab-${cat}">
                    <span>${m.icon}</span><span>${m.label}</span>
                  </button>`;
        }).join('')}
      </div>

      <!-- Log Form -->
      <div class="card" id="log-form-card">
        <form id="log-form" onsubmit="App.submitLog(event)" novalidate>
          <div id="log-form-fields">
            ${renderLogFormFields('transport')}
          </div>
          <div id="emission-preview" class="emission-preview" aria-live="polite"></div>
          <button type="submit" class="btn btn--primary btn--full" id="log-submit-btn">
            ➕ Log Activity
          </button>
        </form>
      </div>

      <!-- Recent Logs -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">Recent Logs (Last 7 Days)</h2>
          <span class="badge-count">${recentLogs.length} entries</span>
        </div>
        <div id="all-logs-list" role="list">
          ${recentLogs.length > 0
            ? recentLogs.map(l => UI.renderLogCard(l)).join('')
            : `<div class="empty-state"><p>No activities logged yet. Start above!</p></div>`}
        </div>
      </div>
    `;
  }

  function renderLogFormFields(category) {
    const factors = Calculator.EMISSION_FACTORS[category];
    const types = Object.entries(factors);

    const commonNote = `<div class="form-group">
      <label class="form-label" for="log-note">Note (optional)</label>
      <input id="log-note" name="note" type="text" class="form-input" placeholder="e.g. morning commute">
    </div>`;

    let quantityLabel = 'Quantity';
    let quantityPlaceholder = '0';
    let quantityUnit = '';

    if (category === 'transport') { quantityLabel = 'Distance (km)'; quantityPlaceholder = '10'; quantityUnit = 'km'; }
    if (category === 'food')      { quantityLabel = 'Number of meals/servings'; quantityPlaceholder = '1'; quantityUnit = 'meal(s)'; }
    if (category === 'energy')    { quantityLabel = 'Energy used (kWh)'; quantityPlaceholder = '5'; quantityUnit = 'kWh'; }
    if (category === 'shopping')  { quantityLabel = 'Number of items/orders'; quantityPlaceholder = '1'; quantityUnit = 'item(s)'; }

    return `
      <input type="hidden" name="category" value="${category}">
      <div class="form-group">
        <label class="form-label" for="log-type">Type</label>
        <select id="log-type" name="type" class="form-select" onchange="App.updatePreview()" required aria-required="true">
          ${types.map(([key, val]) => `<option value="${key}">${val.icon} ${val.label}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="log-quantity">${quantityLabel}</label>
        <div class="input-with-unit">
          <input id="log-quantity" name="quantity" type="number" class="form-input"
            placeholder="${quantityPlaceholder}" min="0.01" step="0.01"
            oninput="App.updatePreview()" required aria-required="true">
          <span class="input-unit">${quantityUnit}</span>
        </div>
      </div>
      ${commonNote}`;
  }

  let currentCategory = 'transport';

  function selectCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.category-tab').forEach(el => {
      el.classList.toggle('category-tab--active', el.dataset.category === category);
      el.setAttribute('aria-selected', el.dataset.category === category);
    });
    document.getElementById('log-form-fields').innerHTML = renderLogFormFields(category);
    document.getElementById('emission-preview').innerHTML = '';
  }

  function updatePreview() {
    const form = document.getElementById('log-form');
    if (!form) return;
    const type = form.type?.value;
    const qty  = parseFloat(form.quantity?.value);
    const preview = document.getElementById('emission-preview');

    if (!type || !qty || qty <= 0 || isNaN(qty)) { preview.innerHTML = ''; return; }

    try {
      const result = Calculator.calculate(currentCategory, type, qty);
      const rating = Calculator.getDailyRating(result.kgCO2e);
      const eq = Calculator.getEquivalencies(result.kgCO2e);

      preview.innerHTML = `
        <div class="preview-card">
          <div class="preview-main">
            <span class="preview-icon">${result.icon}</span>
            <span class="preview-kg">${result.kgCO2e.toFixed(3)}</span>
            <span class="preview-unit">kg CO₂e</span>
          </div>
          <div class="preview-equiv">
            ≈ 🌳 ${eq.trees} days of tree absorption · 🚗 ${eq.carKm} km driven
          </div>
          <div class="preview-rating" style="color:${rating.color}">${rating.grade} · ${rating.rating}</div>
        </div>`;
    } catch (e) {
      preview.innerHTML = '';
    }
  }

  function submitLog(e) {
    e.preventDefault();
    const form = e.target;
    const type     = form.type.value;
    const quantity = parseFloat(form.quantity.value);
    const note     = form.note?.value || '';

    if (!type || !quantity || quantity <= 0) {
      UI.toast('Please fill in all required fields.', 'warning');
      return;
    }

    try {
      const result = Calculator.calculate(currentCategory, type, quantity);
      Storage.addLog({
        category: currentCategory,
        type,
        quantity,
        kgCO2e: result.kgCO2e,
        label: result.label,
        icon: result.icon,
        unit: result.unit,
        note,
      });

      // Update streak
      Storage.updateStreak();

      // Check achievements
      const newBadges = Gamification.checkAndUnlock();
      newBadges.forEach(b => {
        UI.toast(`🏆 Achievement unlocked: ${b.name}!`, 'achievement', 4500);
      });

      UI.toast(`Logged ${result.kgCO2e.toFixed(2)} kg CO₂e from ${result.label}`, 'success');

      // Refresh the logs list without full re-render
      const logsList = document.getElementById('all-logs-list');
      if (logsList) {
        const updatedLogs = Storage.getRecentLogs(7).slice().reverse().slice(0, 10);
        logsList.innerHTML = updatedLogs.map(l => UI.renderLogCard(l)).join('');
      }

      // Reset form
      form.reset();
      form.type.value = type; // keep type selection
      document.getElementById('emission-preview').innerHTML = '';

    } catch (err) {
      UI.toast('Something went wrong. Please try again.', 'warning');
      console.error(err);
    }
  }

  function deleteLog(id) {
    Storage.deleteLog(id);
    // Remove card from DOM with animation
    const card = document.querySelector(`.log-card[data-id="${id}"]`);
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => card.remove(), 300);
    }
    UI.toast('Entry deleted.', 'info', 2000);
  }

  // ── ANALYTICS VIEW ────────────────────────────────────────────────────────

  function renderAnalytics() {
    const breakdown7  = Storage.getCategoryBreakdown(7);
    const breakdown30 = Storage.getCategoryBreakdown(30);
    const daily30     = Storage.getDailyTotals(30);
    const weeklyKg    = Object.values(breakdown7).reduce((s, v) => s + v, 0);
    const monthlyKg   = Object.values(breakdown30).reduce((s, v) => s + v, 0);
    const annualEst   = weeklyKg * 52;

    const comparisons = Calculator.compareToAverages(annualEst);

    document.getElementById('main-content').innerHTML = `
      <div class="view-header">
        <h1 class="view-title">Analytics</h1>
        <p class="view-subtitle">Understand your carbon patterns over time</p>
      </div>

      <!-- Summary Stats -->
      <div class="cards-grid cards-grid--3">
        <div class="stat-card">
          <div class="stat-card__label">This Week</div>
          <div class="stat-card__value">${weeklyKg.toFixed(1)}</div>
          <div class="stat-card__unit">kg CO₂e</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">This Month</div>
          <div class="stat-card__value">${monthlyKg.toFixed(1)}</div>
          <div class="stat-card__unit">kg CO₂e</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Annual Estimate</div>
          <div class="stat-card__value">${(annualEst / 1000).toFixed(1)}</div>
          <div class="stat-card__unit">tonnes CO₂e</div>
        </div>
      </div>

      <!-- 30-Day Trend -->
      <div class="card">
        <div class="card__header">
          <h2 class="card__title">30-Day Emissions Trend</h2>
          <div class="chart-toggle">
            <button class="btn btn--ghost btn--sm" onclick="App.switchChart('line')" id="chart-btn-line">Line</button>
            <button class="btn btn--ghost btn--sm" onclick="App.switchChart('bar')" id="chart-btn-bar">Bar</button>
          </div>
        </div>
        <div class="chart-container chart-container--lg">
          <canvas id="chart-trend-30d" aria-label="30-day emissions trend"></canvas>
        </div>
      </div>

      <!-- Category Breakdown -->
      <div class="cards-grid cards-grid--2">
        <div class="card">
          <h2 class="card__title">Weekly Breakdown</h2>
          <div class="chart-container chart-container--md">
            <canvas id="chart-donut-weekly" aria-label="Weekly emissions by category"></canvas>
          </div>
        </div>
        <div class="card">
          <h2 class="card__title">Daily Stack (7 Days)</h2>
          <div class="chart-container chart-container--md">
            <canvas id="chart-stack-7d" aria-label="Stacked daily emissions by category"></canvas>
          </div>
        </div>
      </div>

      <!-- Global Comparison -->
      <div class="card">
        <h2 class="card__title">Global Comparison (Annual Estimate)</h2>
        <p class="muted-text" style="margin-bottom:16px">Based on your weekly average projected over a year</p>
        <div class="comparison-grid">
          ${Object.entries(comparisons).map(([region, data]) => {
            const flag = { world: '🌍', india: '🇮🇳', usa: '🇺🇸', eu: '🇪🇺' }[region];
            const pct = parseFloat(data.percentageOfAvg);
            const barW = Math.min(100, (data.userValue / data.average) * 100);
            const barW2 = Math.min(100, (data.average / Math.max(data.userValue, data.average)) * 100);
            const better = data.betterThanAvg;
            return `
              <div class="comparison-item">
                <div class="comparison-item__header">
                  <span>${flag} ${region.charAt(0).toUpperCase() + region.slice(1)} Average</span>
                  <span style="color:${better ? '#22c55e' : '#f97316'}">${better ? '✅' : '⚠️'} ${pct}% of avg</span>
                </div>
                <div class="comparison-bar-wrap">
                  <div class="comparison-bar">
                    <div class="comparison-bar__fill comparison-bar__fill--user" style="width:${barW}%" title="Your footprint"></div>
                  </div>
                  <span class="comparison-bar__label">You: ${(data.userValue/1000).toFixed(1)}t</span>
                </div>
                <div class="comparison-bar-wrap">
                  <div class="comparison-bar">
                    <div class="comparison-bar__fill" style="width:${barW2}%;background:#4b5563" title="Region average"></div>
                  </div>
                  <span class="comparison-bar__label">Avg: ${(data.average/1000).toFixed(1)}t</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>

      <!-- Impact Equivalencies -->
      <div class="card">
        <h2 class="card__title">Monthly Impact — In Real Terms</h2>
        <p class="muted-text" style="margin-bottom:16px">Your ${monthlyKg.toFixed(1)} kg CO₂e this month is equivalent to…</p>
        <div class="equiv-grid equiv-grid--large">
          ${UI.renderEquivalencies(monthlyKg)}
        </div>
      </div>
    `;

    setTimeout(() => {
      Charts.renderTrend('chart-trend-30d', daily30, 'line');
      Charts.renderDonut('chart-donut-weekly', breakdown7);
      Charts.renderCategoryStack('chart-stack-7d', 7);
    }, 50);
  }

  let currentChartType = 'line';
  function switchChart(type) {
    currentChartType = type;
    const daily30 = Storage.getDailyTotals(30);
    Charts.renderTrend('chart-trend-30d', daily30, type);
    document.getElementById('chart-btn-line').classList.toggle('btn--active', type === 'line');
    document.getElementById('chart-btn-bar').classList.toggle('btn--active', type === 'bar');
  }

  // ── AI COACH VIEW ─────────────────────────────────────────────────────────

  function renderCoach() {
    document.getElementById('main-content').innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">🤖 AI Eco-Coach</h1>
          <p class="view-subtitle">Your personal carbon footprint advisor</p>
        </div>
        <div class="ai-status">
          <span class="ai-status__dot"></span> Online
        </div>
      </div>

      <!-- Context Panel -->
      <div class="cards-grid cards-grid--3">
        ${renderContextCards()}
      </div>

      <!-- Personalized Tips -->
      <div class="card">
        <h2 class="card__title">📌 Your Personalized Action Plan</h2>
        <div id="tips-container">
          ${AIEngine.getPersonalizedTips(4).map((t, i) => UI.renderInsightCard(t, i)).join('')
            || `<p class="muted-text">Log some activities to receive personalized tips!</p>`}
        </div>
      </div>

      <!-- Chat Interface -->
      <div class="card chat-card">
        <h2 class="card__title">💬 Ask Your Eco-Coach</h2>
        <div id="chat-messages" class="chat-messages" role="log" aria-live="polite" aria-label="Chat conversation">
          ${UI.renderChatBubble("👋 Hi! I'm your EcoCoach — powered by analysis of your activity data. Ask me anything about reducing your carbon footprint, or type a category like 'food', 'transport', or 'energy' to get specific tips!", 'ai')}
        </div>
        <div class="chat-suggestions">
          ${['How can I reduce my footprint?', 'Compare me to global average', 'Best quick win for today', 'Tips for food emissions'].map(q =>
            `<button class="chip" onclick="App.sendSuggestedQ('${q}')">${q}</button>`
          ).join('')}
        </div>
        <form class="chat-input-form" onsubmit="App.sendChat(event)" aria-label="Chat input">
          <input type="text" id="chat-input" class="chat-input" placeholder="Ask your Eco-Coach..." maxlength="200"
                 autocomplete="off" aria-label="Chat message input">
          <button type="submit" class="btn btn--primary chat-send-btn" aria-label="Send message">
            <span>Send</span> ➤
          </button>
        </form>
      </div>

      <!-- Quick Win -->
      <div class="card quick-win-card" id="quick-win-section">
        ${renderQuickWin()}
      </div>
    `;
  }

  function renderContextCards() {
    const ctx = AIEngine.buildContext();
    const todayKg = Storage.getDailyTotal(new Date().toISOString().slice(0, 10));
    const rating = Calculator.getDailyRating(todayKg);

    const trendIcon = ctx.trend === 'improving' ? '📉' : ctx.trend === 'worsening' ? '📈' : '➡️';
    const trendColor = ctx.trend === 'improving' ? '#22c55e' : ctx.trend === 'worsening' ? '#f97316' : '#9ca3af';

    return `
      <div class="stat-card">
        <div class="stat-card__label">Today's Score</div>
        <div class="stat-card__value" style="color:${rating.color}">${rating.grade}</div>
        <div class="stat-card__unit">${rating.rating}</div>
        <div class="stat-card__desc">${todayKg.toFixed(2)} kg CO₂e</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Weekly Trend</div>
        <div class="stat-card__value" style="color:${trendColor}">${trendIcon}</div>
        <div class="stat-card__unit" style="color:${trendColor}">${ctx.trend.charAt(0).toUpperCase() + ctx.trend.slice(1)}</div>
        <div class="stat-card__desc">${ctx.trendPercent > 0 ? `${ctx.trendPercent}% ${ctx.trend === 'improving' ? 'better' : 'worse'}` : 'No prior data'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__label">Top Category</div>
        <div class="stat-card__value">${UI.getCategoryMeta(ctx.topCategory).icon}</div>
        <div class="stat-card__unit">${UI.getCategoryMeta(ctx.topCategory).label}</div>
        <div class="stat-card__desc">Highest emissions</div>
      </div>`;
  }

  function renderQuickWin() {
    const tip = AIEngine.getQuickWin();
    if (!tip) return `<p class="muted-text">Log activities to get your daily quick win!</p>`;
    return `
      <div class="quick-win__header">⚡ Today's Quick Win</div>
      <div class="quick-win__message">${tip.message}</div>
      <div class="quick-win__action">
        <span class="quick-win__action-label">Do this:</span> ${tip.action}
      </div>
      ${tip.saving ? `<div class="quick-win__saving">💚 Potential saving: ${tip.saving}</div>` : ''}`;
  }

  function sendChat(e) {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;

    const chatEl = document.getElementById('chat-messages');
    chatEl.insertAdjacentHTML('beforeend', UI.renderChatBubble(message, 'user'));
    input.value = '';
    UI.scrollToBottom(chatEl);

    // Typing indicator
    const typingId = 'typing-' + Date.now();
    chatEl.insertAdjacentHTML('beforeend',
      `<div id="${typingId}" class="chat-bubble chat-bubble--ai">
        <div class="chat-bubble__avatar">🤖</div>
        <div class="chat-bubble__content"><div class="typing-dots"><span></span><span></span><span></span></div></div>
       </div>`);
    UI.scrollToBottom(chatEl);

    setTimeout(() => {
      const response = AIEngine.chat(message);
      document.getElementById(typingId)?.remove();
      chatEl.insertAdjacentHTML('beforeend', UI.renderChatBubble(response, 'ai'));
      UI.scrollToBottom(chatEl);
    }, 900 + Math.random() * 400);
  }

  function sendSuggestedQ(question) {
    const input = document.getElementById('chat-input');
    if (input) { input.value = question; }
    sendChat({ preventDefault: () => {} });
  }

  // ── ACHIEVEMENTS VIEW ─────────────────────────────────────────────────────

  function renderAchievements() {
    const badges  = Gamification.getAllBadges();
    const goals   = Gamification.getGoalProgress();
    const streak  = Storage.getStreakData();
    const stats   = Gamification.computeStats();
    const unlocked = badges.filter(b => b.unlocked).length;

    document.getElementById('main-content').innerHTML = `
      <div class="view-header">
        <div>
          <h1 class="view-title">Achievements</h1>
          <p class="view-subtitle">${unlocked} of ${badges.length} badges earned</p>
        </div>
        <div class="streak-badge" title="Current streak">🔥 ${streak.current} days</div>
      </div>

      <!-- Progress Rings -->
      <div class="card">
        <h2 class="card__title">Goal Progress</h2>
        <div class="goals-grid">
          <div class="goal-item">
            ${UI.createProgressRing(goals.daily.percent, 130,
              goals.daily.met ? '#22c55e' : '#f97316',
              `${goals.daily.current}kg`,
              'Today')}
            <p class="goal-item__label">Daily Goal: ${goals.daily.target} kg</p>
            <p class="goal-item__status" style="color:${goals.daily.met ? '#22c55e' : '#f97316'}">
              ${goals.daily.met ? '✅ On Track' : `⚠️ ${(goals.daily.current - goals.daily.target).toFixed(1)}kg over`}
            </p>
          </div>
          <div class="goal-item">
            ${UI.createProgressRing(goals.weekly.percent, 130,
              goals.weekly.met ? '#22c55e' : '#f97316',
              `${goals.weekly.current.toFixed(0)}kg`,
              'This Week')}
            <p class="goal-item__label">Weekly Goal: ${goals.weekly.target} kg</p>
            <p class="goal-item__status" style="color:${goals.weekly.met ? '#22c55e' : '#f97316'}">
              ${goals.weekly.met ? '✅ On Track' : `⚠️ ${(goals.weekly.current - goals.weekly.target).toFixed(1)}kg over`}
            </p>
          </div>
          <div class="goal-item">
            ${UI.createProgressRing(
              Math.min(100, (streak.current / 30) * 100), 130,
              '#f59e0b',
              `${streak.current}d`,
              'Streak'
            )}
            <p class="goal-item__label">Longest: ${streak.longest} days</p>
            <p class="goal-item__status" style="color:#f59e0b">
              🔥 ${streak.current > 0 ? 'Keep it up!' : 'Start logging!'}
            </p>
          </div>
        </div>

        <!-- Set Goals Form -->
        <details class="goals-edit" style="margin-top:20px">
          <summary class="btn btn--ghost btn--sm" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer">
            ⚙️ Edit Goals
          </summary>
          <div style="margin-top:16px;display:flex;gap:16px;flex-wrap:wrap">
            <div class="form-group" style="flex:1;min-width:140px">
              <label class="form-label">Daily Target (kg CO₂e)</label>
              <input id="goal-daily" type="number" class="form-input" value="${goals.daily.target}" min="1" max="50">
            </div>
            <div class="form-group" style="flex:1;min-width:140px">
              <label class="form-label">Weekly Target (kg CO₂e)</label>
              <input id="goal-weekly" type="number" class="form-input" value="${goals.weekly.target}" min="7" max="350">
            </div>
            <div style="display:flex;align-items:flex-end;padding-bottom:8px">
              <button class="btn btn--primary" onclick="App.saveGoals()">Save Goals</button>
            </div>
          </div>
        </details>
      </div>

      <!-- Stats Summary -->
      <div class="cards-grid cards-grid--3">
        <div class="stat-card">
          <div class="stat-card__label">Total Activities Logged</div>
          <div class="stat-card__value">${stats.totalLogs}</div>
          <div class="stat-card__unit">entries</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Plant-Based Meals</div>
          <div class="stat-card__value">${stats.plantBasedMeals}</div>
          <div class="stat-card__unit">meals</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Green Transport Uses</div>
          <div class="stat-card__value">${stats.greenTransportCount}</div>
          <div class="stat-card__unit">trips</div>
        </div>
      </div>

      <!-- Badge Gallery -->
      <div class="card">
        <h2 class="card__title">🏆 Badge Collection</h2>
        <div class="badge-gallery" role="list">
          ${badges.map(b => UI.renderBadge(b)).join('')}
        </div>
      </div>
    `;
  }

  function saveGoals() {
    const daily  = parseFloat(document.getElementById('goal-daily')?.value);
    const weekly = parseFloat(document.getElementById('goal-weekly')?.value);
    if (isNaN(daily) || isNaN(weekly) || daily <= 0 || weekly <= 0) {
      UI.toast('Please enter valid goal values.', 'warning');
      return;
    }
    Storage.saveGoals({ dailyTarget: daily, weeklyTarget: weekly });
    UI.toast('Goals updated! ✅', 'success');
    renderAchievements(); // re-render to reflect new goals
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────

  function init() {
    // Set up nav
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.view));
    });

    // Add sample data if brand new user
    const logs = Storage.getLogs();
    if (logs.length === 0) {
      seedDemoData();
    }

    // Initial render
    navigate('dashboard');

    // Seed profile name if needed
    const profile = Storage.getProfile();
    const nameEl = document.getElementById('user-name');
    if (nameEl) nameEl.textContent = profile.name;
  }

  /** Seed realistic demo data for first-time users */
  function seedDemoData() {
    const today = new Date();
    const entries = [
      // Last 7 days of activity
      { daysAgo: 6, category: 'transport', type: 'car_petrol',  quantity: 22  },
      { daysAgo: 6, category: 'food',      type: 'beef',        quantity: 1   },
      { daysAgo: 6, category: 'energy',    type: 'electricity', quantity: 8   },
      { daysAgo: 5, category: 'transport', type: 'train',       quantity: 15  },
      { daysAgo: 5, category: 'food',      type: 'chicken',     quantity: 2   },
      { daysAgo: 4, category: 'transport', type: 'car_petrol',  quantity: 18  },
      { daysAgo: 4, category: 'food',      type: 'vegetarian',  quantity: 1   },
      { daysAgo: 4, category: 'shopping',  type: 'delivery_local', quantity: 2 },
      { daysAgo: 3, category: 'transport', type: 'bus',         quantity: 12  },
      { daysAgo: 3, category: 'food',      type: 'beef',        quantity: 1   },
      { daysAgo: 3, category: 'energy',    type: 'natural_gas', quantity: 5   },
      { daysAgo: 2, category: 'transport', type: 'car_petrol',  quantity: 25  },
      { daysAgo: 2, category: 'food',      type: 'vegan',       quantity: 2   },
      { daysAgo: 2, category: 'shopping',  type: 'clothing',    quantity: 1   },
      { daysAgo: 1, category: 'transport', type: 'walking',     quantity: 5   },
      { daysAgo: 1, category: 'food',      type: 'fish',        quantity: 1   },
      { daysAgo: 1, category: 'energy',    type: 'electricity', quantity: 6   },
      { daysAgo: 0, category: 'transport', type: 'car_petrol',  quantity: 12  },
      { daysAgo: 0, category: 'food',      type: 'chicken',     quantity: 1   },
    ];

    entries.forEach(e => {
      const d = new Date(today);
      d.setDate(d.getDate() - e.daysAgo);
      const dateStr = d.toISOString().slice(0, 10);
      try {
        const result = Calculator.calculate(e.category, e.type, e.quantity);
        const logs = Storage.getLogs();
        const newEntry = {
          id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: d.toISOString(),
          date: dateStr,
          category: e.category,
          type: e.type,
          quantity: e.quantity,
          kgCO2e: result.kgCO2e,
          label: result.label,
          icon: result.icon,
          unit: result.unit,
          note: 'Demo data',
        };
        logs.push(newEntry);
        localStorage.setItem('ecotrace_logs', JSON.stringify(logs));
      } catch (err) {
        console.warn('Demo seed error:', err);
      }
    });

    // Set up streak
    const streakData = { current: 4, longest: 7, lastLogDate: new Date().toISOString().slice(0, 10) };
    localStorage.setItem('ecotrace_streaks', JSON.stringify(streakData));

    // Unlock first achievement
    Gamification.checkAndUnlock();
  }

  // Public API
  return {
    init,
    navigate,
    selectCategory,
    updatePreview,
    submitLog,
    deleteLog,
    sendChat,
    sendSuggestedQ,
    switchChart,
    saveGoals,
  };
})();

// Bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', App.init);
