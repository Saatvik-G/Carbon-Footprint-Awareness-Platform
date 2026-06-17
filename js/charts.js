/**
 * @file charts.js
 * @description Chart.js wrappers for EcoTrace visualizations.
 * All charts use the EcoTrace dark green design system.
 */

const Charts = (() => {
  "use strict";

  // ── Chart Registry ────────────────────────────────────────────────────────
  const instances = {};

  const CATEGORY_COLORS = {
    transport: { bg: 'rgba(14, 165, 233, 0.8)',  border: '#0ea5e9' },
    food:      { bg: 'rgba(34, 197, 94, 0.8)',   border: '#22c55e' },
    energy:    { bg: 'rgba(245, 158, 11, 0.8)',  border: '#f59e0b' },
    shopping:  { bg: 'rgba(139, 92, 246, 0.8)',  border: '#8b5cf6' },
  };

  const CATEGORY_ICONS = {
    transport: '🚗', food: '🍽️', energy: '⚡', shopping: '🛍️',
  };

  const BASE_FONT = { family: "'Plus Jakarta Sans', system-ui", color: '#9ca3af' };

  const GRID_COLOR = 'rgba(255,255,255,0.06)';

  /** Destroy an existing chart instance before re-creating */
  function destroy(id) {
    if (instances[id]) {
      instances[id].destroy();
      delete instances[id];
    }
  }

  /**
   * Render the donut breakdown chart (by category)
   * @param {string} canvasId
   * @param {object} breakdown - { transport: 12.3, food: 8.1, ... }
   */
  function renderDonut(canvasId, breakdown) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
    if (entries.length === 0) {
      renderEmptyState(canvas, 'No data yet — log your first activity!');
      return;
    }

    const labels = entries.map(([k]) => `${CATEGORY_ICONS[k] || ''} ${k.charAt(0).toUpperCase() + k.slice(1)}`);
    const data   = entries.map(([, v]) => parseFloat(v.toFixed(2)));
    const bgColors = entries.map(([k]) => CATEGORY_COLORS[k]?.bg || 'rgba(100,100,100,0.8)');
    const borderColors = entries.map(([k]) => CATEGORY_COLORS[k]?.border || '#666');

    instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: bgColors, borderColor: borderColors, borderWidth: 2, hoverOffset: 8 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { ...BASE_FONT, padding: 16, boxWidth: 12, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(2)} kg CO₂e`,
            },
          },
        },
        animation: { animateRotate: true, duration: 700 },
      },
    });
  }

  /**
   * Render the line/bar trend chart (daily totals)
   * @param {string} canvasId
   * @param {Array} dailyTotals - [{ date, label, total }]
   * @param {'line'|'bar'} type
   */
  function renderTrend(canvasId, dailyTotals, type = 'line') {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const labels = dailyTotals.map(d => d.label);
    const data   = dailyTotals.map(d => d.total);

    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.35)');
    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.00)');

    instances[canvasId] = new Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label: 'kg CO₂e',
          data,
          backgroundColor: type === 'line' ? gradient : 'rgba(34, 197, 94, 0.6)',
          borderColor: '#22c55e',
          borderWidth: 2.5,
          pointBackgroundColor: '#22c55e',
          pointRadius: 4,
          pointHoverRadius: 7,
          fill: type === 'line',
          tension: 0.4,
          borderRadius: type === 'bar' ? 6 : 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toFixed(2)} kg CO₂e`,
            },
          },
        },
        scales: {
          x: {
            ticks: { ...BASE_FONT, maxTicksLimit: 8, maxRotation: 0 },
            grid: { color: GRID_COLOR },
          },
          y: {
            ticks: { ...BASE_FONT, callback: (v) => `${v} kg` },
            grid: { color: GRID_COLOR },
            beginAtZero: true,
          },
        },
        animation: { duration: 600 },
      },
    });
  }

  /**
   * Render stacked bar chart by category over time
   * @param {string} canvasId
   * @param {number} days
   */
  function renderCategoryStack(canvasId, days = 7) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const allLogs = Storage.getRecentLogs(days);
    const dateRange = Storage.getDailyTotals(days);
    const categories = ['transport', 'food', 'energy', 'shopping'];

    const datasets = categories.map(cat => {
      const data = dateRange.map(d => {
        const dayLogs = allLogs.filter(l => l.date === d.date && l.category === cat);
        return parseFloat(dayLogs.reduce((s, l) => s + l.kgCO2e, 0).toFixed(2));
      });
      return {
        label: `${CATEGORY_ICONS[cat]} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        data,
        backgroundColor: CATEGORY_COLORS[cat].bg,
        borderColor: CATEGORY_COLORS[cat].border,
        borderWidth: 1,
        borderRadius: 4,
        stack: 'daily',
      };
    });

    instances[canvasId] = new Chart(canvas, {
      type: 'bar',
      data: { labels: dateRange.map(d => d.label), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { ...BASE_FONT, padding: 12, boxWidth: 12, usePointStyle: true },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)} kg CO₂e`,
            },
          },
        },
        scales: {
          x: { ticks: { ...BASE_FONT }, grid: { color: GRID_COLOR }, stacked: true },
          y: { ticks: { ...BASE_FONT, callback: (v) => `${v}kg` }, grid: { color: GRID_COLOR }, beginAtZero: true, stacked: true },
        },
        animation: { duration: 600 },
      },
    });
  }

  /**
   * Render a small sparkline (mini trend line, no axes)
   * @param {string} canvasId
   * @param {Array<number>} values
   */
  function renderSparkline(canvasId, values) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const improving = values[values.length - 1] < values[0];

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: values.map((_, i) => i),
        datasets: [{
          data: values,
          borderColor: improving ? '#22c55e' : '#f97316',
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false, beginAtZero: false },
        },
        animation: { duration: 400 },
      },
    });
  }

  /** Show empty state message on canvas */
  function renderEmptyState(canvas, message) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#6b7280';
    ctx.font = "14px 'Plus Jakarta Sans', system-ui";
    ctx.textAlign = 'center';
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  return { renderDonut, renderTrend, renderCategoryStack, renderSparkline, destroy };
})();
