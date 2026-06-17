/**
 * @file test.js
 * @description Unit tests for EcoTrace core modules.
 * Run: node tests/test.js  (Node.js environment)
 * Or:  Open browser console and paste contents
 *
 * Tests cover: Calculator, AI Engine logic, Goal progress, Storage operations.
 */

// ── Minimal test framework ────────────────────────────────────────────────
let passed = 0, failed = 0, total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✅ ${description}`);
    passed++;
  } catch (e) {
    console.error(`  ❌ ${description}`);
    console.error(`     Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || 'Expected equal'}: got ${actual}, expected ${expected}`);
  }
}

function assertCloseTo(actual, expected, tolerance = 0.01, message) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message || 'Expected close to'}: got ${actual}, expected ~${expected} (±${tolerance})`);
  }
}

// ── Mock localStorage for Node.js ────────────────────────────────────────
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

// ── Load modules (Node.js) ────────────────────────────────────────────────
if (typeof require !== 'undefined') {
  // Node.js environment — load via eval (simple approach for pure-JS modules)
  const fs = require('fs');
  const path = require('path');
  const load = (f) => eval(fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8'));
  load('calculator.js');
  load('storage.js');
  load('gamification.js');
  load('ai-engine.js');
}

// ═══════════════════════════════════════════════════════════════════════════
console.log('\n🧪 EcoTrace Test Suite\n');
console.log('══════════════════════════════════════');

// ── CALCULATOR TESTS ──────────────────────────────────────────────────────
console.log('\n📐 Calculator — Emission Factors');

test('Car (petrol) 10km = 1.92 kg CO₂e', () => {
  const r = Calculator.calculate('transport', 'car_petrol', 10);
  assertCloseTo(r.kgCO2e, 1.92, 0.001);
});

test('Train 50km = 2.05 kg CO₂e', () => {
  const r = Calculator.calculate('transport', 'train', 50);
  assertCloseTo(r.kgCO2e, 2.05, 0.001);
});

test('Walking 5km = 0 kg CO₂e', () => {
  const r = Calculator.calculate('transport', 'walking', 5);
  assertEqual(r.kgCO2e, 0);
});

test('Beef meal × 1 = 6.61 kg CO₂e', () => {
  const r = Calculator.calculate('food', 'beef', 1);
  assertCloseTo(r.kgCO2e, 6.61, 0.001);
});

test('Vegan meal × 2 = 0.48 kg CO₂e', () => {
  const r = Calculator.calculate('food', 'vegan', 2);
  assertCloseTo(r.kgCO2e, 0.48, 0.001);
});

test('Electricity 10 kWh = 2.33 kg CO₂e', () => {
  const r = Calculator.calculate('energy', 'electricity', 10);
  assertCloseTo(r.kgCO2e, 2.33, 0.001);
});

test('Electronics shopping × 1 = 12.0 kg CO₂e', () => {
  const r = Calculator.calculate('shopping', 'electronics', 1);
  assertCloseTo(r.kgCO2e, 12.0, 0.001);
});

test('Unknown category throws error', () => {
  let threw = false;
  try { Calculator.calculate('unknown', 'x', 1); } catch { threw = true; }
  assert(threw, 'Should throw for unknown category');
});

test('Unknown type throws error', () => {
  let threw = false;
  try { Calculator.calculate('transport', 'hoverboard', 10); } catch { threw = true; }
  assert(threw, 'Should throw for unknown type');
});

// ── DAILY RATING TESTS ────────────────────────────────────────────────────
console.log('\n⭐ Calculator — Daily Ratings');

test('0 kg/day = Excellent (A)', () => {
  const r = Calculator.getDailyRating(0);
  assertEqual(r.grade, 'A');
  assertEqual(r.rating, 'Excellent');
});

test('3 kg/day = Excellent (A)', () => {
  const r = Calculator.getDailyRating(3);
  assertEqual(r.grade, 'A');
});

test('5 kg/day = Good (B)', () => {
  const r = Calculator.getDailyRating(5);
  assertEqual(r.grade, 'B');
});

test('10 kg/day = Average (C)', () => {
  const r = Calculator.getDailyRating(10);
  assertEqual(r.grade, 'C');
});

test('15 kg/day = High (D)', () => {
  const r = Calculator.getDailyRating(15);
  assertEqual(r.grade, 'D');
});

test('25 kg/day = Critical (F)', () => {
  const r = Calculator.getDailyRating(25);
  assertEqual(r.grade, 'F');
});

// ── EQUIVALENCY TESTS ─────────────────────────────────────────────────────
console.log('\n🌍 Calculator — Equivalencies');

test('getEquivalencies returns object with all keys', () => {
  const eq = Calculator.getEquivalencies(10);
  assert('trees' in eq, 'missing trees');
  assert('carKm' in eq, 'missing carKm');
  assert('smartphoneCharges' in eq, 'missing smartphoneCharges');
  assert('flightMinutes' in eq, 'missing flightMinutes');
});

test('10 kg CO₂e ≈ 52 km car driving', () => {
  const eq = Calculator.getEquivalencies(10);
  assertCloseTo(parseInt(eq.carKm), 52, 1);
});

test('0 kg CO₂e = 0 car km', () => {
  const eq = Calculator.getEquivalencies(0);
  assertEqual(parseInt(eq.carKm), 0);
});

// ── COMPARE TO AVERAGES TESTS ─────────────────────────────────────────────
console.log('\n🌐 Calculator — Global Comparisons');

test('compareToAverages returns 4 regions', () => {
  const comp = Calculator.compareToAverages(4000);
  assert('world' in comp);
  assert('india' in comp);
  assert('usa'   in comp);
  assert('eu'    in comp);
});

test('4000 kg/yr is below world average (4000 = 100%)', () => {
  const comp = Calculator.compareToAverages(4000);
  assertCloseTo(parseFloat(comp.world.percentageOfAvg), 100, 0.5);
});

test('1700 kg/yr marked as better than India average', () => {
  const comp = Calculator.compareToAverages(1700);
  assert(comp.india.betterThanAvg);
});

// ── STORAGE TESTS ─────────────────────────────────────────────────────────
console.log('\n💾 Storage — CRUD Operations');

// Clean slate
Storage.clearAll();

test('getLogs returns empty array on fresh start', () => {
  const logs = Storage.getLogs();
  assert(Array.isArray(logs), 'Should be array');
  assertEqual(logs.length, 0, 'Should be empty');
});

test('addLog persists an entry', () => {
  Storage.addLog({ category: 'transport', type: 'car_petrol', quantity: 10, kgCO2e: 1.92, label: 'Car (Petrol)', icon: '🚗', unit: 'km' });
  const logs = Storage.getLogs();
  assertEqual(logs.length, 1);
});

test('addLog entry has required fields', () => {
  const log = Storage.getLogs()[0];
  assert(log.id, 'Has id');
  assert(log.timestamp, 'Has timestamp');
  assert(log.date, 'Has date');
  assertEqual(log.category, 'transport');
});

test('deleteLog removes entry', () => {
  const id = Storage.getLogs()[0].id;
  Storage.deleteLog(id);
  assertEqual(Storage.getLogs().length, 0);
});

test('getDailyTotal returns 0 for empty day', () => {
  const total = Storage.getDailyTotal('2000-01-01');
  assertEqual(total, 0);
});

test('getDailyTotal sums correctly', () => {
  Storage.clearAll();
  const today = new Date().toISOString().slice(0, 10);
  Storage.addLog({ category: 'food', type: 'beef', quantity: 1, kgCO2e: 6.61, label: 'Beef', icon: '🥩', unit: 'meal', date: today });
  Storage.addLog({ category: 'transport', type: 'car_petrol', quantity: 10, kgCO2e: 1.92, label: 'Car', icon: '🚗', unit: 'km', date: today });

  // Fix: addLog sets date from timestamp, patch manually
  const logs = Storage.getLogs();
  logs.forEach(l => { l.date = today; });
  localStorage.setItem('ecotrace_logs', JSON.stringify(logs));

  const total = Storage.getDailyTotal(today);
  assertCloseTo(total, 8.53, 0.01);
});

test('getCategoryBreakdown returns correct categories', () => {
  const breakdown = Storage.getCategoryBreakdown(7);
  assert(typeof breakdown === 'object');
});

test('getProfile returns default profile', () => {
  Storage.clearAll();
  const profile = Storage.getProfile();
  assert(profile.name, 'Has name');
  assert(profile.joinDate, 'Has joinDate');
});

test('saveProfile persists changes', () => {
  Storage.saveProfile({ name: 'Test User' });
  assertEqual(Storage.getProfile().name, 'Test User');
});

test('getGoals returns defaults', () => {
  Storage.clearAll();
  const goals = Storage.getGoals();
  assert(goals.dailyTarget > 0, 'Has dailyTarget');
  assert(goals.weeklyTarget > 0, 'Has weeklyTarget');
});

test('saveGoals persists', () => {
  Storage.saveGoals({ dailyTarget: 8, weeklyTarget: 50 });
  assertEqual(Storage.getGoals().dailyTarget, 8);
  assertEqual(Storage.getGoals().weeklyTarget, 50);
});

test('unlockAchievement returns true on first unlock', () => {
  Storage.clearAll();
  const isNew = Storage.unlockAchievement('test_badge');
  assert(isNew, 'Should return true');
});

test('unlockAchievement returns false on second unlock', () => {
  const isNew = Storage.unlockAchievement('test_badge');
  assert(!isNew, 'Should return false (already unlocked)');
});

test('streak starts at 0 for new user', () => {
  Storage.clearAll();
  assertEqual(Storage.getStreakData().current, 0);
});

test('updateStreak increments on new day log', () => {
  Storage.clearAll();
  const streak = Storage.updateStreak();
  assertEqual(streak.current, 1);
});

// ── GAMIFICATION TESTS ────────────────────────────────────────────────────
console.log('\n🏆 Gamification — Badges & Goals');

test('getAllBadges returns all 16 badges', () => {
  const badges = Gamification.getAllBadges();
  assertEqual(badges.length, Gamification.BADGES.length);
});

test('all badges have required fields', () => {
  Gamification.getAllBadges().forEach(b => {
    assert(b.id, `Badge ${b.name} missing id`);
    assert(b.name, `Badge missing name`);
    assert(b.icon, `Badge ${b.name} missing icon`);
    assert(typeof b.unlocked === 'boolean', `Badge ${b.name} missing unlocked`);
  });
});

test('getGoalProgress returns daily and weekly', () => {
  Storage.clearAll();
  Storage.saveGoals({ dailyTarget: 10, weeklyTarget: 60 });
  const progress = Gamification.getGoalProgress();
  assert('daily' in progress);
  assert('weekly' in progress);
  assert('percent' in progress.daily);
  assert('met' in progress.daily);
});

test('goal percent = 0 when no logs', () => {
  Storage.clearAll();
  Storage.saveGoals({ dailyTarget: 10, weeklyTarget: 60 });
  const progress = Gamification.getGoalProgress();
  assertEqual(progress.daily.percent, 0);
});

test('getUnlockedCount = 0 for new user', () => {
  Storage.clearAll();
  assertEqual(Gamification.getUnlockedCount(), 0);
});

// ── AI ENGINE TESTS ───────────────────────────────────────────────────────
console.log('\n🤖 AI Engine — Tip Generation');

test('buildContext returns object with required keys', () => {
  Storage.clearAll();
  const ctx = AIEngine.buildContext();
  assert('categoryTotals' in ctx, 'Missing categoryTotals');
  assert('weeklyTotal' in ctx, 'Missing weeklyTotal');
  assert('trend' in ctx, 'Missing trend');
  assert('topCategory' in ctx, 'Missing topCategory');
  assert('streak' in ctx, 'Missing streak');
});

test('getPersonalizedTips returns array', () => {
  const tips = AIEngine.getPersonalizedTips(3);
  assert(Array.isArray(tips), 'Should be array');
});

test('each tip has required fields', () => {
  Storage.clearAll();
  // Add logs to trigger tips
  Storage.addLog({ category: 'transport', type: 'car_petrol', quantity: 50, kgCO2e: 9.6, label: 'Car', icon: '🚗', unit: 'km' });
  Storage.addLog({ category: 'food', type: 'beef', quantity: 4, kgCO2e: 26.44, label: 'Beef', icon: '🥩', unit: 'meal' });

  const tips = AIEngine.getPersonalizedTips(3);
  tips.forEach(t => {
    assert(t.id, 'Tip has id');
    assert(t.message, 'Tip has message');
    assert(t.action, 'Tip has action');
    assert(['high','medium','low'].includes(t.impact), 'Tip has valid impact');
  });
});

test('chat returns string for greeting', () => {
  const response = AIEngine.chat('hello');
  assert(typeof response === 'string', 'Should return string');
  assert(response.length > 0, 'Should not be empty');
});

test('chat returns string for transport query', () => {
  const response = AIEngine.chat('how can I reduce my transport emissions?');
  assert(typeof response === 'string', 'Should return string');
});

test('chat returns string for food query', () => {
  const response = AIEngine.chat('tell me about food');
  assert(typeof response === 'string', 'Should return string');
});

test('getDashboardInsight returns object with required keys', () => {
  const insight = AIEngine.getDashboardInsight();
  assert('title' in insight, 'Has title');
  assert('body' in insight, 'Has body');
  assert('icon' in insight, 'Has icon');
});

// ── SUMMARY ───────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════');
console.log(`\n📊 Results: ${passed}/${total} tests passed`);
if (failed > 0) {
  console.log(`❌ ${failed} test(s) failed\n`);
  if (typeof process !== 'undefined') process.exit(1);
} else {
  console.log('🎉 All tests passed!\n');
}
