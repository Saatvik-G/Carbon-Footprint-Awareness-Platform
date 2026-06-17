/**
 * @file ai-engine.js
 * @description Rule-based AI recommendation engine.
 * Analyzes user activity patterns and generates personalized, actionable insights.
 *
 * Decision Logic:
 * 1. Category Scorer — ranks emission categories by contribution
 * 2. Trend Detector  — compares recent vs. previous period
 * 3. Pattern Matcher — identifies specific high-frequency behaviors
 * 4. Tip Selector    — returns priority-ranked, non-repetitive tips
 */

const AIEngine = (() => {
  "use strict";

  // ── Tip Library ───────────────────────────────────────────────────────────
  // Each tip has: id, category, impact ('high'|'medium'|'low'), condition fn, message, action
  const TIPS = [
    // TRANSPORT
    {
      id: 'tp_01', category: 'transport', impact: 'high',
      condition: (data) => data.categoryTotals.transport > data.categoryTotals.food * 2,
      message: '🚗 Transport is your biggest source of emissions — it\'s over twice your food footprint.',
      action: 'Try carpooling or switching 1 day per week to public transit.',
      saving: '~3.5 kg CO₂e per day',
    },
    {
      id: 'tp_02', category: 'transport', impact: 'high',
      condition: (data) => data.topTransportType === 'car_petrol' && data.avgDailyTransport > 40,
      message: '⛽ You\'re driving over 40 km/day on petrol — that\'s a significant daily cost.',
      action: 'Consider a hybrid/EV for your next car, or explore remote work options.',
      saving: '~5.2 kg CO₂e per day',
    },
    {
      id: 'tp_03', category: 'transport', impact: 'medium',
      condition: (data) => data.hasFlights && data.recentFlightKm > 2000,
      message: '✈️ You\'ve logged a long flight recently. Aviation is carbon-intensive.',
      action: 'Offset your flight or choose trains for journeys under 500 km.',
      saving: '~50 kg CO₂e per flight',
    },
    {
      id: 'tp_04', category: 'transport', impact: 'medium',
      condition: (data) => data.dailyLogs.some(l => l.category === 'transport' && l.type === 'bus'),
      message: '🚌 Great job taking the bus! That\'s 2× lower emissions than driving solo.',
      action: 'Make it a habit — use the bus 3 days a week to cut your transport footprint by 40%.',
      saving: '~2.0 kg CO₂e per day',
    },
    {
      id: 'tp_05', category: 'transport', impact: 'low',
      condition: (data) => data.shortTripsCount > 2,
      message: '🚴 You have multiple short trips logged — these are perfect cycling candidates!',
      action: 'Trips under 3 km by bike produce zero emissions and improve your health.',
      saving: '~0.5 kg CO₂e per trip',
    },

    // FOOD
    {
      id: 'fd_01', category: 'food', impact: 'high',
      condition: (data) => data.beefMealsPerWeek >= 4,
      message: '🥩 You\'re eating beef 4+ times this week. Beef is the most carbon-intensive food.',
      action: 'Swapping 2 beef meals for chicken or legumes saves ~13 kg CO₂e per week.',
      saving: '~13 kg CO₂e per week',
    },
    {
      id: 'fd_02', category: 'food', impact: 'high',
      condition: (data) => data.categoryTotals.food > 15 && data.veganMealsCount === 0,
      message: '🌱 Your food footprint is high and you haven\'t logged any plant-based meals.',
      action: 'Try "Meatless Monday" — one plant-based day saves ~1.5 kg CO₂e.',
      saving: '~1.5 kg CO₂e per day',
    },
    {
      id: 'fd_03', category: 'food', impact: 'medium',
      condition: (data) => data.beefMealsPerWeek >= 2 && data.beefMealsPerWeek < 4,
      message: '🍖 Beef and lamb meals are your top food emissions — even small swaps help.',
      action: 'Replace 1 beef meal with fish or chicken. That\'s 6 kg CO₂e saved per swap.',
      saving: '~6 kg CO₂e per swap',
    },
    {
      id: 'fd_04', category: 'food', impact: 'medium',
      condition: (data) => data.veganMealsCount >= 3,
      message: '🌱 You\'re eating plant-based meals regularly — great for the planet!',
      action: 'Keep it up! Try replacing dairy with oat milk to further cut your footprint.',
      saving: '~0.3 kg CO₂e per day',
    },
    {
      id: 'fd_05', category: 'food', impact: 'low',
      condition: (data) => data.categoryTotals.food > 5,
      message: '🥗 Seasonal, local produce has up to 10× lower food miles than imported items.',
      action: 'Visit a local farmers\' market — it\'s the easiest way to cut food transport emissions.',
      saving: '~0.5 kg CO₂e per week',
    },

    // ENERGY
    {
      id: 'en_01', category: 'energy', impact: 'high',
      condition: (data) => data.categoryTotals.energy > 20,
      message: '💡 Energy is a significant chunk of your footprint this week.',
      action: 'Switch to LED bulbs and unplug devices on standby — saves 10-20% of home electricity.',
      saving: '~2 kg CO₂e per week',
    },
    {
      id: 'en_02', category: 'energy', impact: 'high',
      condition: (data) => data.topEnergyType === 'heating_oil' || data.topEnergyType === 'natural_gas',
      message: '🔥 Fossil fuel heating is your top energy source. It\'s the most carbon-intensive option.',
      action: 'Consider a smart thermostat — reducing heating by 1°C saves 3% on energy bills and emissions.',
      saving: '~5 kg CO₂e per month',
    },
    {
      id: 'en_03', category: 'energy', impact: 'medium',
      condition: (data) => data.hasRenewable === false && data.categoryTotals.energy > 5,
      message: '☀️ Switching to a green energy tariff can reduce your electricity footprint by 95%.',
      action: 'Contact your energy provider about renewable electricity options — often same price.',
      saving: '~15 kg CO₂e per month',
    },
    {
      id: 'en_04', category: 'energy', impact: 'low',
      condition: (data) => data.hasRenewable === true,
      message: '☀️ You\'re using renewable energy — you\'re already making a huge difference!',
      action: 'Consider solar panels if you own your home. They pay back in 7-10 years.',
      saving: 'Up to 1.5 tonnes CO₂e per year',
    },

    // SHOPPING
    {
      id: 'sh_01', category: 'shopping', impact: 'high',
      condition: (data) => data.categoryTotals.shopping > 30,
      message: '🛍️ Shopping is a major emissions source this week — especially electronics and furniture.',
      action: 'Buy second-hand or refurbished where possible — saves up to 90% of production emissions.',
      saving: '~10 kg CO₂e per item',
    },
    {
      id: 'sh_02', category: 'shopping', impact: 'medium',
      condition: (data) => data.deliveryCount > 3,
      message: '📦 You have multiple deliveries this week. Consolidating orders reduces emissions.',
      action: 'Batch your online orders instead of ordering daily — 1 trip vs. 5 saves ~70% in delivery emissions.',
      saving: '~1.5 kg CO₂e per week',
    },
    {
      id: 'sh_03', category: 'shopping', impact: 'medium',
      condition: (data) => data.clothingCount >= 2,
      message: '👕 Fashion has a hidden carbon cost. Each new clothing item = ~3 kg CO₂e.',
      action: 'Try swapping, thrifting, or renting for occasional-wear items.',
      saving: '~3 kg CO₂e per item avoided',
    },
    {
      id: 'sh_04', category: 'shopping', impact: 'low',
      condition: (data) => data.deliveryCount > 0,
      message: '🏪 Shopping locally instead of ordering online cuts delivery emissions to near zero.',
      action: 'Walk or cycle to local shops when possible — zero delivery, zero packaging.',
      saving: '~0.5 kg CO₂e per order',
    },

    // GENERAL / TREND-BASED
    {
      id: 'gn_01', category: 'general', impact: 'high',
      condition: (data) => data.trend === 'worsening' && data.trendPercent > 20,
      message: `📈 Your footprint has increased by ${0}% compared to last week — let's turn that around!`,
      action: 'Focus on your top category and try one small change this week.',
      saving: 'Varies by action',
      dynamicMessage: (data) => `📈 Your footprint has increased by ${data.trendPercent}% compared to last week — let's turn that around!`,
    },
    {
      id: 'gn_02', category: 'general', impact: 'medium',
      condition: (data) => data.trend === 'improving' && data.trendPercent > 10,
      message: '🎉 You\'re improving! Your footprint is down compared to last week.',
      action: 'Keep the momentum — what eco-habit can you add this week?',
      saving: '',
      dynamicMessage: (data) => `🎉 Your footprint is down ${data.trendPercent}% from last week — you're making a real difference!`,
    },
    {
      id: 'gn_03', category: 'general', impact: 'low',
      condition: (data) => data.totalLogs === 0,
      message: '📊 Start logging your daily activities to get personalized insights!',
      action: 'Log your first activity — it only takes 10 seconds.',
      saving: '',
    },
    {
      id: 'gn_04', category: 'general', impact: 'medium',
      condition: (data) => data.streak >= 5,
      message: `🔥 ${0}-day logging streak! Consistency is the key to meaningful change.`,
      action: 'You\'re building great habits. Try setting a weekly CO₂ reduction goal.',
      saving: '',
      dynamicMessage: (data) => `🔥 ${data.streak}-day logging streak! Consistency is the key to meaningful change.`,
    },
    {
      id: 'gn_05', category: 'general', impact: 'low',
      condition: (data) => data.daysSinceLastLog >= 2,
      message: '⏰ You haven\'t logged in a couple of days — small gaps add up!',
      action: 'Log today\'s activities to keep your footprint picture accurate.',
      saving: '',
    },
  ];

  // ── Chat Response Templates ────────────────────────────────────────────────
  const CHAT_RESPONSES = {
    greet: [
      "👋 Hi! I'm your EcoCoach. Ask me anything about your carbon footprint, or I can analyze your recent activity!",
      "🌱 Hello! Ready to help you live a little greener. What would you like to know?",
    ],
    reduce: [
      (data) => `Based on your data, your biggest opportunity is **${data.topCategory}**. ${getTipForCategory(data.topCategory, data)}`,
    ],
    transport: [
      (data) => data.avgDailyTransport > 20
        ? `🚗 You're averaging ${data.avgDailyTransport.toFixed(0)} km/day in transport emissions. Switching even 2 days/week to public transit could save **~${(data.avgDailyTransport * 0.4 * 0.15).toFixed(1)} kg CO₂e/week**.`
        : `🚌 Your transport footprint looks reasonable! Keep using low-carbon options when possible.`,
    ],
    food: [
      (data) => data.beefMealsPerWeek >= 2
        ? `🥩 You've had ${data.beefMealsPerWeek} beef meals this week. Replacing half with chicken or veg saves **${(data.beefMealsPerWeek * 0.5 * 5.92).toFixed(1)} kg CO₂e**.`
        : `🥗 Your food choices are looking fairly green! Aim for 3+ plant-based meals per week.`,
    ],
    energy: [
      (data) => data.categoryTotals.energy > 10
        ? `⚡ Home energy is costing you ~${data.categoryTotals.energy.toFixed(1)} kg CO₂e this week. Smart thermostat + LED bulbs could cut that by 15-20%.`
        : `💡 Your energy usage is looking good! Consider checking if your provider offers a green tariff.`,
    ],
    compare: [
      (data) => `🌍 Your weekly footprint is **${data.weeklyTotal.toFixed(1)} kg CO₂e**. The global average is ~77 kg/week. You're ${data.weeklyTotal < 77 ? 'below' : 'above'} average!`,
    ],
    default: [
      "💡 Try asking me: 'How can I reduce my transport emissions?' or 'Compare my footprint to average'",
      "🌿 I can help you with tips on food, transport, energy, or shopping. What area interests you?",
      "📊 Ask me to analyze your recent activity or suggest your biggest quick win!",
    ],
  };

  function getTipForCategory(category, data) {
    const tips = {
      transport: 'Consider switching 1-2 days per week to public transit or cycling.',
      food: 'Try replacing 2 beef meals per week with plant-based alternatives.',
      energy: 'A smart thermostat and LED bulbs can cut home energy emissions by 15%.',
      shopping: 'Buy second-hand where possible — it saves up to 90% of production emissions.',
    };
    return tips[category] || 'Small consistent changes add up to big impact over time.';
  }

  // ── Data Aggregator ───────────────────────────────────────────────────────

  /**
   * Build context object from storage data for the AI engine
   */
  function buildContext() {
    const recentLogs = Storage.getRecentLogs(7);
    const prevLogs = Storage.getLogsByDateRange(
      (() => { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().slice(0, 10); })(),
      (() => { const d = new Date(); d.setDate(d.getDate() - 8); return d.toISOString().slice(0, 10); })()
    );

    const categoryTotals = Storage.getCategoryBreakdown(7);
    const prevCategoryTotals = (() => {
      const breakdown = {};
      prevLogs.forEach(l => { breakdown[l.category] = (breakdown[l.category] || 0) + l.kgCO2e; });
      return breakdown;
    })();

    const weeklyTotal = Object.values(categoryTotals).reduce((s, v) => s + v, 0);
    const prevWeeklyTotal = Object.values(prevCategoryTotals).reduce((s, v) => s + v, 0);

    // Trend calculation
    let trend = 'stable', trendPercent = 0;
    if (prevWeeklyTotal > 0) {
      trendPercent = Math.abs(((weeklyTotal - prevWeeklyTotal) / prevWeeklyTotal) * 100).toFixed(0);
      if (weeklyTotal > prevWeeklyTotal * 1.05) trend = 'worsening';
      else if (weeklyTotal < prevWeeklyTotal * 0.95) trend = 'improving';
    }

    // Top category
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'transport';

    // Transport specifics
    const transportLogs = recentLogs.filter(l => l.category === 'transport');
    const topTransportType = transportLogs.sort((a, b) => b.kgCO2e - a.kgCO2e)[0]?.type || null;
    const avgDailyTransport = categoryTotals.transport ? categoryTotals.transport / 7 * (1 / 0.192) : 0;

    // Food specifics
    const foodLogs = recentLogs.filter(l => l.category === 'food');
    const beefMealsPerWeek = foodLogs.filter(l => l.type === 'beef').reduce((s, l) => s + l.quantity, 0);
    const veganMealsCount = foodLogs.filter(l => l.type === 'vegan' || l.type === 'vegetarian').length;
    const hasFlights = transportLogs.some(l => l.type === 'plane_short' || l.type === 'plane_long');
    const recentFlightKm = transportLogs.filter(l => l.type === 'plane_short' || l.type === 'plane_long').reduce((s, l) => s + l.quantity, 0);
    const shortTripsCount = transportLogs.filter(l => l.quantity < 3 && l.type.startsWith('car')).length;

    // Energy specifics
    const energyLogs = recentLogs.filter(l => l.category === 'energy');
    const topEnergyType = energyLogs.sort((a, b) => b.kgCO2e - a.kgCO2e)[0]?.type || null;
    const hasRenewable = energyLogs.some(l => l.type === 'renewable');

    // Shopping specifics
    const shoppingLogs = recentLogs.filter(l => l.category === 'shopping');
    const deliveryCount = shoppingLogs.filter(l => l.type.includes('delivery')).length;
    const clothingCount = shoppingLogs.filter(l => l.type === 'clothing').length;

    // Streak
    const streakData = Storage.getStreakData();
    const lastLogDate = Storage.getLogs().slice(-1)[0]?.date || null;
    const daysSinceLastLog = lastLogDate
      ? Math.floor((Date.now() - new Date(lastLogDate).getTime()) / 86400000)
      : 99;

    return {
      dailyLogs: recentLogs,
      totalLogs: recentLogs.length,
      categoryTotals,
      weeklyTotal,
      prevWeeklyTotal,
      trend,
      trendPercent: parseInt(trendPercent),
      topCategory,
      topTransportType,
      avgDailyTransport,
      beefMealsPerWeek,
      veganMealsCount,
      hasFlights,
      recentFlightKm,
      shortTripsCount,
      topEnergyType,
      hasRenewable,
      deliveryCount,
      clothingCount,
      streak: streakData.current,
      daysSinceLastLog,
    };
  }

  /**
   * Get top N personalized tips for the user
   * @param {number} count - number of tips to return
   * @returns {Array} filtered, priority-ranked tips
   */
  function getPersonalizedTips(count = 3) {
    const context = buildContext();
    const seenIds = Storage.getSettings().seenTipIds || [];

    const matchingTips = TIPS
      .filter(tip => {
        try { return tip.condition(context); } catch { return false; }
      })
      .map(tip => ({
        ...tip,
        message: tip.dynamicMessage ? tip.dynamicMessage(context) : tip.message,
        priorityScore: (tip.impact === 'high' ? 3 : tip.impact === 'medium' ? 2 : 1)
          + (seenIds.includes(tip.id) ? -2 : 0), // deprioritize seen tips
      }))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, count);

    // If we got fewer than asked, fill with general tips
    if (matchingTips.length < count) {
      const general = TIPS.find(t => t.id === 'gn_03' && !matchingTips.some(m => m.id === t.id));
      if (general) matchingTips.push({ ...general, priorityScore: 0 });
    }

    return matchingTips;
  }

  /**
   * Get the single best "quick win" action for today
   * @returns {object} tip
   */
  function getQuickWin() {
    const tips = getPersonalizedTips(5);
    return tips.find(t => t.impact === 'high') || tips[0] || null;
  }

  /**
   * Process a chat message and return a relevant response
   * @param {string} message - user's chat message
   * @returns {string} AI response
   */
  function chat(message) {
    const msg = message.toLowerCase().trim();
    const context = buildContext();

    const pick = (arr) => {
      const item = arr[Math.floor(Math.random() * arr.length)];
      return typeof item === 'function' ? item(context) : item;
    };

    if (/^(hi|hello|hey|hiya|howdy)/i.test(msg)) return pick(CHAT_RESPONSES.greet);
    if (/reduce|improve|lower|cut|decrease|help/i.test(msg)) return pick(CHAT_RESPONSES.reduce);
    if (/transport|car|drive|bus|train|commut|travel/i.test(msg)) return pick(CHAT_RESPONSES.transport);
    if (/food|eat|meal|diet|beef|vegan|vegetar/i.test(msg)) return pick(CHAT_RESPONSES.food);
    if (/energy|electric|power|heat|gas|home/i.test(msg)) return pick(CHAT_RESPONSES.energy);
    if (/compar|average|global|world|india|usa/i.test(msg)) return pick(CHAT_RESPONSES.compare);

    // Tip-based responses
    const tips = getPersonalizedTips(1);
    if (tips.length > 0 && msg.length > 5) {
      return `💡 Based on your activity: ${tips[0].message}\n\n**Action:** ${tips[0].action}`;
    }

    return pick(CHAT_RESPONSES.default);
  }

  /**
   * Get a summary insight for the dashboard
   * @returns {{ title, body, icon, color }}
   */
  function getDashboardInsight() {
    const context = buildContext();
    const tips = getPersonalizedTips(1);
    const todayKg = Storage.getDailyTotal(new Date().toISOString().slice(0, 10));
    const rating = Calculator.getDailyRating(todayKg);

    if (tips.length > 0) {
      return {
        title: 'AI Insight',
        body: tips[0].message,
        action: tips[0].action,
        saving: tips[0].saving,
        icon: '🤖',
        color: '#22c55e',
        trend: context.trend,
        trendPercent: context.trendPercent,
      };
    }

    return {
      title: 'Welcome!',
      body: 'Start logging activities to get personalized insights from your AI Eco-Coach.',
      action: 'Log your first activity to get started.',
      icon: '🌱',
      color: '#22c55e',
      trend: 'stable',
      trendPercent: 0,
    };
  }

  // Public API
  return {
    buildContext,
    getPersonalizedTips,
    getQuickWin,
    chat,
    getDashboardInsight,
    TIPS,
  };
})();
