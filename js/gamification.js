/**
 * @file gamification.js
 * @description Achievement, badge, and streak system for EcoTrace.
 * Evaluates user actions against badge criteria and emits unlock events.
 */

const Gamification = (() => {
  "use strict";

  // ── Badge Definitions ─────────────────────────────────────────────────────
  const BADGES = [
    // Logging Badges
    {
      id: 'first_log',
      name: 'First Step',
      description: 'Logged your first activity',
      icon: '🌱',
      color: '#22c55e',
      tier: 'bronze',
      condition: (stats) => stats.totalLogs >= 1,
    },
    {
      id: 'log_10',
      name: 'Getting Started',
      description: 'Logged 10 activities',
      icon: '📊',
      color: '#84cc16',
      tier: 'bronze',
      condition: (stats) => stats.totalLogs >= 10,
    },
    {
      id: 'log_50',
      name: 'Data Driven',
      description: 'Logged 50 activities',
      icon: '📈',
      color: '#0ea5e9',
      tier: 'silver',
      condition: (stats) => stats.totalLogs >= 50,
    },
    {
      id: 'log_100',
      name: 'Eco Analyst',
      description: 'Logged 100 activities',
      icon: '🔬',
      color: '#8b5cf6',
      tier: 'gold',
      condition: (stats) => stats.totalLogs >= 100,
    },

    // Streak Badges
    {
      id: 'streak_3',
      name: 'On a Roll',
      description: '3-day logging streak',
      icon: '🔥',
      color: '#f97316',
      tier: 'bronze',
      condition: (stats) => stats.currentStreak >= 3,
    },
    {
      id: 'streak_7',
      name: 'Week Warrior',
      description: '7-day logging streak',
      icon: '⚡',
      color: '#f59e0b',
      tier: 'silver',
      condition: (stats) => stats.currentStreak >= 7,
    },
    {
      id: 'streak_30',
      name: 'Eco Champion',
      description: '30-day logging streak',
      icon: '🏆',
      color: '#fbbf24',
      tier: 'gold',
      condition: (stats) => stats.currentStreak >= 30,
    },

    // Low Emission Badges
    {
      id: 'green_day',
      name: 'Green Day',
      description: 'Logged a day under 3 kg CO₂e',
      icon: '🌿',
      color: '#10b981',
      tier: 'bronze',
      condition: (stats) => stats.bestDayKg !== null && stats.bestDayKg <= 3 && stats.bestDayKg > 0,
    },
    {
      id: 'green_week',
      name: 'Eco Week',
      description: 'A whole week under 21 kg CO₂e (3/day avg)',
      icon: '🌍',
      color: '#059669',
      tier: 'silver',
      condition: (stats) => stats.weeklyTotal > 0 && stats.weeklyTotal <= 21,
    },
    {
      id: 'half_average',
      name: 'Below the Curve',
      description: 'Weekly footprint 50% below world average',
      icon: '📉',
      color: '#0ea5e9',
      tier: 'gold',
      condition: (stats) => stats.weeklyTotal > 0 && stats.weeklyTotal <= 38.5, // 77/2
    },

    // Category Badges
    {
      id: 'plant_power',
      name: 'Plant Power',
      description: 'Logged 5 vegan or vegetarian meals',
      icon: '🥗',
      color: '#22c55e',
      tier: 'bronze',
      condition: (stats) => stats.plantBasedMeals >= 5,
    },
    {
      id: 'green_commuter',
      name: 'Green Commuter',
      description: 'Used public transit or cycling 5 times',
      icon: '🚌',
      color: '#0ea5e9',
      tier: 'silver',
      condition: (stats) => stats.greenTransportCount >= 5,
    },
    {
      id: 'energy_saver',
      name: 'Energy Saver',
      description: 'Logged renewable energy usage',
      icon: '☀️',
      color: '#f59e0b',
      tier: 'bronze',
      condition: (stats) => stats.renewableCount >= 1,
    },
    {
      id: 'no_beef_week',
      name: 'Meatless Month',
      description: 'No beef meals for 7 days',
      icon: '🌿',
      color: '#84cc16',
      tier: 'gold',
      condition: (stats) => stats.daysSinceBeef >= 7,
    },

    // Improvement Badges
    {
      id: 'improving',
      name: 'Getting Greener',
      description: 'Reduced weekly footprint by 10%+',
      icon: '↘️',
      color: '#22c55e',
      tier: 'silver',
      condition: (stats) => stats.weeklyImprovement >= 10,
    },
    {
      id: 'big_improvement',
      name: 'Eco Transformer',
      description: 'Reduced weekly footprint by 25%+',
      icon: '🚀',
      color: '#8b5cf6',
      tier: 'gold',
      condition: (stats) => stats.weeklyImprovement >= 25,
    },
  ];

  /**
   * Compute aggregate stats needed for badge evaluation
   * @returns {object} stats
   */
  function computeStats() {
    const logs = Storage.getLogs();
    const streakData = Storage.getStreakData();
    const dailyTotals = Storage.getDailyTotals(30);
    const weeklyTotal = Storage.getCategoryBreakdown(7);
    const totalWeeklyKg = Object.values(weeklyTotal).reduce((s, v) => s + v, 0);

    // Previous week
    const prevLogs = Storage.getLogsByDateRange(
      (() => { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().slice(0, 10); })(),
      (() => { const d = new Date(); d.setDate(d.getDate() - 8); return d.toISOString().slice(0, 10); })()
    );
    const prevWeekTotal = prevLogs.reduce((s, l) => s + l.kgCO2e, 0);
    const weeklyImprovement = prevWeekTotal > 0
      ? ((prevWeekTotal - totalWeeklyKg) / prevWeekTotal * 100)
      : 0;

    // Best day
    const loggedDays = dailyTotals.filter(d => d.total > 0);
    const bestDayKg = loggedDays.length > 0
      ? Math.min(...loggedDays.map(d => d.total))
      : null;

    // Food stats
    const plantBasedMeals = logs.filter(l => l.type === 'vegan' || l.type === 'vegetarian').length;
    const lastBeefLog = [...logs].reverse().find(l => l.type === 'beef');
    const daysSinceBeef = lastBeefLog
      ? Math.floor((Date.now() - new Date(lastBeefLog.date)) / 86400000)
      : 99;

    // Transport stats
    const greenTypes = ['bus', 'train', 'walking'];
    const greenTransportCount = logs.filter(l => l.category === 'transport' && greenTypes.includes(l.type)).length;

    // Energy stats
    const renewableCount = logs.filter(l => l.category === 'energy' && l.type === 'renewable').length;

    return {
      totalLogs: logs.length,
      currentStreak: streakData.current,
      longestStreak: streakData.longest,
      weeklyTotal: totalWeeklyKg,
      prevWeeklyTotal: prevWeekTotal,
      weeklyImprovement,
      bestDayKg,
      plantBasedMeals,
      daysSinceBeef,
      greenTransportCount,
      renewableCount,
    };
  }

  /**
   * Check all badges and unlock any newly earned ones.
   * @returns {Array} newly unlocked badges
   */
  function checkAndUnlock() {
    const stats = computeStats();
    const newlyUnlocked = [];

    BADGES.forEach(badge => {
      try {
        if (badge.condition(stats)) {
          const isNew = Storage.unlockAchievement(badge.id);
          if (isNew) newlyUnlocked.push(badge);
        }
      } catch (e) {
        // Silently skip badge evaluation errors
      }
    });

    return newlyUnlocked;
  }

  /**
   * Get all badges with their unlock status
   * @returns {Array} badges with .unlocked, .unlockedAt fields
   */
  function getAllBadges() {
    const unlocked = Storage.getAchievements();
    return BADGES.map(badge => ({
      ...badge,
      unlocked: !!unlocked[badge.id],
      unlockedAt: unlocked[badge.id]?.unlockedAt || null,
    }));
  }

  /**
   * Get count of unlocked badges
   */
  function getUnlockedCount() {
    return getAllBadges().filter(b => b.unlocked).length;
  }

  /**
   * Get goal progress for the current week
   * @returns {{ daily, weekly }}
   */
  function getGoalProgress() {
    const goals = Storage.getGoals();
    const todayKg = Storage.getDailyTotal(new Date().toISOString().slice(0, 10));
    const weeklyTotals = Storage.getCategoryBreakdown(7);
    const weeklyKg = Object.values(weeklyTotals).reduce((s, v) => s + v, 0);

    return {
      daily: {
        current: parseFloat(todayKg.toFixed(2)),
        target: goals.dailyTarget,
        percent: Math.min(100, Math.round((todayKg / goals.dailyTarget) * 100)),
        met: todayKg <= goals.dailyTarget,
      },
      weekly: {
        current: parseFloat(weeklyKg.toFixed(2)),
        target: goals.weeklyTarget,
        percent: Math.min(100, Math.round((weeklyKg / goals.weeklyTarget) * 100)),
        met: weeklyKg <= goals.weeklyTarget,
      },
    };
  }

  // Public API
  return {
    BADGES,
    computeStats,
    checkAndUnlock,
    getAllBadges,
    getUnlockedCount,
    getGoalProgress,
  };
})();
