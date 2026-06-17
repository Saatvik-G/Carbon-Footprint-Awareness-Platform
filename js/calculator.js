/**
 * @file calculator.js
 * @description Carbon emission calculation engine using EPA/DEFRA emission factors.
 * Formula: Emissions (kg CO2e) = Activity Data × Emission Factor
 */

const Calculator = (() => {
  // ── Emission Factors (kg CO₂e per unit) ──────────────────────────────────
  // Sources: EPA (2023), DEFRA (2023), GHG Protocol

  const EMISSION_FACTORS = {
    transport: {
      car_petrol:    { factor: 0.192, unit: 'km',  label: 'Car (Petrol)',    icon: '🚗' },
      car_diesel:    { factor: 0.171, unit: 'km',  label: 'Car (Diesel)',    icon: '🚗' },
      car_electric:  { factor: 0.053, unit: 'km',  label: 'Car (Electric)',  icon: '⚡' },
      bus:           { factor: 0.089, unit: 'km',  label: 'Bus',             icon: '🚌' },
      train:         { factor: 0.041, unit: 'km',  label: 'Train',           icon: '🚆' },
      plane_short:   { factor: 0.255, unit: 'km',  label: 'Flight (Short)',  icon: '✈️' },
      plane_long:    { factor: 0.195, unit: 'km',  label: 'Flight (Long)',   icon: '🌍' },
      motorbike:     { factor: 0.114, unit: 'km',  label: 'Motorbike',       icon: '🏍️' },
      walking:       { factor: 0.000, unit: 'km',  label: 'Walking/Cycling', icon: '🚴' },
    },
    food: {
      beef:          { factor: 6.61,  unit: 'meal', label: 'Beef Meal',       icon: '🥩' },
      lamb:          { factor: 5.84,  unit: 'meal', label: 'Lamb Meal',       icon: '🍖' },
      pork:          { factor: 1.72,  unit: 'meal', label: 'Pork Meal',       icon: '🥓' },
      chicken:       { factor: 0.69,  unit: 'meal', label: 'Chicken Meal',    icon: '🍗' },
      fish:          { factor: 0.87,  unit: 'meal', label: 'Fish Meal',       icon: '🐟' },
      dairy:         { factor: 1.00,  unit: 'meal', label: 'Dairy Heavy',     icon: '🧀' },
      vegetarian:    { factor: 0.39,  unit: 'meal', label: 'Vegetarian',      icon: '🥗' },
      vegan:         { factor: 0.24,  unit: 'meal', label: 'Vegan',           icon: '🌱' },
    },
    energy: {
      electricity:   { factor: 0.233, unit: 'kWh',  label: 'Grid Electricity', icon: '💡' },
      natural_gas:   { factor: 0.202, unit: 'kWh',  label: 'Natural Gas',      icon: '🔥' },
      renewable:     { factor: 0.012, unit: 'kWh',  label: 'Renewable',        icon: '☀️' },
      heating_oil:   { factor: 0.267, unit: 'kWh',  label: 'Heating Oil',      icon: '🛢️' },
    },
    shopping: {
      clothing:      { factor: 3.0,   unit: 'item', label: 'Clothing Item',    icon: '👕' },
      electronics:   { factor: 12.0,  unit: 'item', label: 'Electronics',      icon: '📱' },
      delivery_local:{ factor: 0.5,   unit: 'item', label: 'Local Delivery',   icon: '📦' },
      delivery_intl: { factor: 2.1,   unit: 'item', label: "Int'l Delivery",   icon: '🌐' },
      furniture:     { factor: 18.0,  unit: 'item', label: 'Furniture',        icon: '🪑' },
      book:          { factor: 1.0,   unit: 'item', label: 'Book/Magazine',    icon: '📚' },
    },
  };

  // ── Global Averages (kg CO₂e per year) ───────────────────────────────────
  const GLOBAL_AVERAGES = {
    world:  4000,   // World average
    india:  1700,   // India average
    usa:    14000,  // USA average
    eu:     7000,   // EU average
  };

  // ── Equivalencies ─────────────────────────────────────────────────────────
  // Used for translating kg CO₂e into relatable comparisons
  const EQUIVALENCIES = {
    trees_per_year:    21.77,    // kg CO₂ absorbed per tree per year
    car_km_per_kg:     5.2,      // km driven in average car per kg CO₂
    smartphone_charges: 0.008225, // kg CO₂ per smartphone charge
    beef_meals:        6.61,     // kg CO₂ per beef meal
    flight_hours:      90,       // kg CO₂ per hour of flight (economy)
  };

  /**
   * Calculate CO₂e emissions for a single activity
   * @param {string} category - 'transport' | 'food' | 'energy' | 'shopping'
   * @param {string} type - specific activity type key
   * @param {number} quantity - amount of activity
   * @returns {{ kgCO2e: number, label: string, icon: string }}
   */
  function calculate(category, type, quantity) {
    const catFactors = EMISSION_FACTORS[category];
    if (!catFactors) throw new Error(`Unknown category: ${category}`);
    const entry = catFactors[type];
    if (!entry) throw new Error(`Unknown type: ${type} in ${category}`);

    const kgCO2e = parseFloat((entry.factor * quantity).toFixed(3));
    return {
      kgCO2e,
      label: entry.label,
      icon: entry.icon,
      unit: entry.unit,
      factor: entry.factor,
    };
  }

  /**
   * Get equivalencies for a given kg CO₂e amount
   * @param {number} kgCO2e
   * @returns {object} human-readable equivalencies
   */
  function getEquivalencies(kgCO2e) {
    return {
      trees: (kgCO2e / EQUIVALENCIES.trees_per_year * 365).toFixed(1),
      carKm: (kgCO2e * EQUIVALENCIES.car_km_per_kg).toFixed(0),
      smartphoneCharges: Math.round(kgCO2e / EQUIVALENCIES.smartphone_charges),
      beefMeals: (kgCO2e / EQUIVALENCIES.beef_meals).toFixed(1),
      flightMinutes: Math.round(kgCO2e / EQUIVALENCIES.flight_hours * 60),
    };
  }

  /**
   * Compare user's annual footprint to global averages
   * @param {number} annualKgCO2e
   * @returns {object}
   */
  function compareToAverages(annualKgCO2e) {
    return Object.entries(GLOBAL_AVERAGES).reduce((acc, [region, avg]) => {
      acc[region] = {
        average: avg,
        userValue: annualKgCO2e,
        percentageOfAvg: ((annualKgCO2e / avg) * 100).toFixed(1),
        betterThanAvg: annualKgCO2e < avg,
      };
      return acc;
    }, {});
  }

  /**
   * Get a rating label based on daily kg CO₂e
   * @param {number} dailyKg
   * @returns {{ rating: string, color: string, description: string }}
   */
  function getDailyRating(dailyKg) {
    if (dailyKg <= 3)   return { rating: 'Excellent', color: '#22c55e', grade: 'A', description: 'Well below average!' };
    if (dailyKg <= 7)   return { rating: 'Good',      color: '#84cc16', grade: 'B', description: 'Below the global average.' };
    if (dailyKg <= 12)  return { rating: 'Average',   color: '#f59e0b', grade: 'C', description: 'Around the global average.' };
    if (dailyKg <= 20)  return { rating: 'High',      color: '#f97316', grade: 'D', description: 'Above average — room to improve.' };
    return               { rating: 'Critical',  color: '#ef4444', grade: 'F', description: 'Significantly above average.' };
  }

  // Public API
  return {
    EMISSION_FACTORS,
    GLOBAL_AVERAGES,
    calculate,
    getEquivalencies,
    compareToAverages,
    getDailyRating,
  };
})();
