/**
 * @file storage.js
 * @description Abstraction layer over localStorage for safe, typed data access.
 * All data is namespaced under 'ecotrace_' to avoid conflicts.
 */

const Storage = (() => {
  "use strict";

  const KEYS = {
    LOGS:         'ecotrace_logs',
    PROFILE:      'ecotrace_profile',
    GOALS:        'ecotrace_goals',
    ACHIEVEMENTS: 'ecotrace_achievements',
    STREAKS:      'ecotrace_streaks',
    SETTINGS:     'ecotrace_settings',
  };

  /** Safe JSON read from localStorage */
  function get(key) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : null;
    } catch (e) {
      console.warn(`[Storage] Failed to read key "${key}":`, e);
      return null;
    }
  }

  /** Safe JSON write to localStorage */
  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to write key "${key}":`, e);
      return false;
    }
  }

  /** Remove a key */
  function remove(key) {
    localStorage.removeItem(key);
  }

  // ── Activity Logs ─────────────────────────────────────────────────────────

  /** Get all activity logs */
  function getLogs() {
    return get(KEYS.LOGS) || [];
  }

  /**
   * Add a new activity log entry
   * @param {{ category, type, quantity, kgCO2e, label, icon, note }} entry
   */
  function addLog(entry) {
    const logs = getLogs();
    const newEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
      ...entry,
    };
    logs.push(newEntry);
    set(KEYS.LOGS, logs);
    return newEntry;
  }

  /** Delete a log entry by id */
  function deleteLog(id) {
    const logs = getLogs().filter(l => l.id !== id);
    set(KEYS.LOGS, logs);
  }

  /** Get logs filtered by date range (ISO date strings) */
  function getLogsByDateRange(startDate, endDate) {
    return getLogs().filter(l => l.date >= startDate && l.date <= endDate);
  }

  /** Get logs for the last N days */
  function getRecentLogs(days = 7) {
    const start = new Date();
    start.setDate(start.getDate() - days + 1);
    const startDate = start.toISOString().slice(0, 10);
    const endDate = new Date().toISOString().slice(0, 10);
    return getLogsByDateRange(startDate, endDate);
  }

  /** Get total CO₂e for a given date (YYYY-MM-DD) */
  function getDailyTotal(date) {
    return getLogs()
      .filter(l => l.date === date)
      .reduce((sum, l) => sum + l.kgCO2e, 0);
  }

  /** Get aggregated daily totals for the last N days */
  function getDailyTotals(days = 30) {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({
        date: dateStr,
        label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        total: parseFloat(getDailyTotal(dateStr).toFixed(2)),
      });
    }
    return result;
  }

  /** Get category breakdown for a date range */
  function getCategoryBreakdown(days = 7) {
    const logs = getRecentLogs(days);
    const breakdown = {};
    logs.forEach(l => {
      breakdown[l.category] = (breakdown[l.category] || 0) + l.kgCO2e;
    });
    return breakdown;
  }

  // ── User Profile ──────────────────────────────────────────────────────────

  function getProfile() {
    return get(KEYS.PROFILE) || {
      name: 'Eco Warrior',
      joinDate: new Date().toISOString().slice(0, 10),
      region: 'world',
    };
  }

  function saveProfile(profile) {
    set(KEYS.PROFILE, { ...getProfile(), ...profile });
  }

  // ── Goals ─────────────────────────────────────────────────────────────────

  function getGoals() {
    return get(KEYS.GOALS) || {
      dailyTarget: 10,    // kg CO₂e per day
      weeklyTarget: 60,   // kg CO₂e per week
    };
  }

  function saveGoals(goals) {
    set(KEYS.GOALS, { ...getGoals(), ...goals });
  }

  // ── Achievements ──────────────────────────────────────────────────────────

  function getAchievements() {
    return get(KEYS.ACHIEVEMENTS) || {};
  }

  function unlockAchievement(id) {
    const ach = getAchievements();
    if (!ach[id]) {
      ach[id] = { unlockedAt: new Date().toISOString() };
      set(KEYS.ACHIEVEMENTS, ach);
      return true; // newly unlocked
    }
    return false;
  }

  // ── Streaks ───────────────────────────────────────────────────────────────

  function getStreakData() {
    return get(KEYS.STREAKS) || { current: 0, longest: 0, lastLogDate: null };
  }

  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const streak = getStreakData();

    if (streak.lastLogDate === today) return streak; // already logged today

    if (streak.lastLogDate === yesterdayStr) {
      streak.current += 1;
    } else if (streak.lastLogDate !== today) {
      streak.current = 1; // reset streak
    }

    streak.longest = Math.max(streak.longest, streak.current);
    streak.lastLogDate = today;
    set(KEYS.STREAKS, streak);
    return streak;
  }

  // ── Settings ──────────────────────────────────────────────────────────────

  function getSettings() {
    return get(KEYS.SETTINGS) || {
      theme: 'dark',
      showTips: true,
      seenTipIds: [],
    };
  }

  function markTipSeen(tipId) {
    const settings = getSettings();
    if (!settings.seenTipIds.includes(tipId)) {
      settings.seenTipIds.push(tipId);
      set(KEYS.SETTINGS, settings);
    }
  }

  /** Clear all EcoTrace data (for testing/reset) */
  function clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  }

  // Public API
  return {
    KEYS,
    getLogs, addLog, deleteLog, getLogsByDateRange, getRecentLogs,
    getDailyTotal, getDailyTotals, getCategoryBreakdown,
    getProfile, saveProfile,
    getGoals, saveGoals,
    getAchievements, unlockAchievement,
    getStreakData, updateStreak,
    getSettings, markTipSeen,
    clearAll,
  };
})();
