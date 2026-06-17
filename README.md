# 🌿 EcoTrace — Personal Carbon Footprint Intelligence Platform

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-22c55e?style=for-the-badge&logo=github)](https://Saatvik-G.github.io/ecotrace)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> **A smart, AI-powered web app that helps individuals understand, track, and meaningfully reduce their carbon footprint — one action at a time.**

---

## 🎯 Chosen Vertical

**Environmental Sustainability / Personal Climate Action**

The app targets one of the most critical challenges of our era: translating awareness of climate change into concrete, measurable individual action. While many people *want* to reduce their environmental impact, they lack the tools to understand *where* their emissions come from and *what* to do about it.

---

## 🚀 Live Demo

👉 **[ecotrace.example.com](https://YOUR_USERNAME.github.io/ecotrace)**

On first load, the app seeds realistic demo data so you can immediately explore all features.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **AI Eco-Coach** | Rule-based recommendation engine with 20+ pattern-aware tips + chat interface |
| 📊 **Live Dashboard** | Real-time carbon score, 7-day trend, category breakdown |
| 📝 **Activity Logger** | Log transport, food, energy & shopping with instant CO₂ preview |
| 📈 **Analytics** | 30-day trends, stacked charts, global average comparison |
| 🏆 **Achievements** | 16 badges, streak tracking, weekly/daily goal rings |
| 💡 **Impact Equivalencies** | Translate kg CO₂e into trees, car km, flights, phone charges |
| 📱 **Fully Responsive** | Desktop sidebar + mobile bottom navigation |
| ♿ **Accessible** | WCAG AA, ARIA labels, keyboard navigation, skip link |

---

## 🧠 Approach & Logic

### Emission Calculation Engine

The core formula follows the **GHG Protocol standard**:

```
Emissions (kg CO₂e) = Activity Data × Emission Factor
```

Emission factors are sourced from **EPA (2023)** and **DEFRA (2023)**:

| Category | Examples | Data Unit |
|---|---|---|
| Transport | Car (petrol: 0.192), Train (0.041), Bus (0.089) | kg CO₂e per km |
| Food | Beef (6.61), Vegan meal (0.24), Chicken (0.69) | kg CO₂e per meal |
| Energy | Grid electricity (0.233), Natural gas (0.202) | kg CO₂e per kWh |
| Shopping | Electronics (12.0), Clothing (3.0), Delivery (0.5) | kg CO₂e per item |

### AI Engine (Rule-Based)

The AI engine uses a **priority-weighted scoring system** — no external API required:

```
1. Build Context  → aggregate last 7 days of user logs
2. Pattern Match  → run each tip's condition() against context
3. Score & Rank   → HIGH (3pts), MEDIUM (2pts), LOW (1pt)
4. Deduplicate    → deprioritize recently seen tips
5. Output         → top 3 personalized, actionable insights
```

**Example decision rules:**
- If `transport > 2× food emissions` → push transit/cycling alternatives
- If `beef meals ≥ 4/week` → suggest plant-based swaps with exact savings
- If `trend = worsening (+20%)` → show improvement-focused tips
- If `streak ≥ 5 days` → encourage with gamification messaging

### Chat Interface

The chat system parses natural language with keyword matching and maps queries to context-aware response templates that reference the user's actual data.

---

## 🏗️ How It Works

```
User logs activity
       ↓
calculator.js  — applies emission factor → kg CO₂e
       ↓
storage.js     — persists to localStorage with date/category tagging
       ↓
ai-engine.js   — re-evaluates all tips against updated context
       ↓
gamification.js — checks badge conditions, updates streaks
       ↓
UI re-renders  — charts, scores, tips refresh in real time
```

### Data Flow Diagram

```
[User Input] ──► [Calculator] ──► [Storage (localStorage)]
                                         │
                    ┌────────────────────┤
                    ▼                    ▼
              [AI Engine]          [Gamification]
                    │                    │
                    ▼                    ▼
              [Insights/Tips]      [Badges/Goals]
                    │                    │
                    └────────┬───────────┘
                             ▼
                      [UI / Charts]
```

---

## 📁 Project Structure

```
ecotrace/
├── index.html          # SPA shell: layout, navigation, accessibility
├── css/
│   └── style.css       # Design system: tokens, components, animations
├── js/
│   ├── calculator.js   # Emission factors & CO₂ calculation engine
│   ├── storage.js      # localStorage abstraction (type-safe read/write)
│   ├── ai-engine.js    # Rule-based AI: pattern detection, tip ranking, chat
│   ├── gamification.js # Badges (16), streaks, goal progress
│   ├── charts.js       # Chart.js wrappers (donut, line, bar, sparkline)
│   ├── ui.js           # DOM helpers, toast notifications, animations
│   └── app.js          # View routing, all 5 page renderers, bootstrap
├── tests/
│   └── test.js         # Unit tests for calculator, storage, AI engine
└── README.md
```

---

## 🛠️ Tech Stack

| Technology | Purpose | Why |
|---|---|---|
| **Vanilla HTML/CSS/JS** | Core | Zero dependencies = maximum readability & instant load |
| **Chart.js 4.4** (CDN) | Data visualization | Industry-standard, lightweight, beautiful charts |
| **localStorage** | Data persistence | No backend = no security risk, works offline |
| **Google Fonts** | Typography | Plus Jakarta Sans for modern, premium feel |

**No build tools. No npm. Open `index.html` directly.**

---

## 📋 Assumptions Made

1. **Emission factors** use global averages from EPA/DEFRA 2023. Location-specific factors (e.g., regional electricity grids) are a future enhancement.

2. **Food quantities** are measured in "meals/servings" rather than exact grams, to minimize user friction and keep logging fast.

3. **Energy data** requires the user to know their approximate kWh usage. A future version could integrate with smart meter APIs.

4. **No user authentication** — data lives in the browser. This is intentional: zero security surface area, no data privacy concerns.

5. **AI insights** are deterministic and rule-based. They do not call any external API, ensuring the app works fully offline and poses no key exposure risk.

6. **Demo data** is seeded on first load so evaluators can immediately see all features without manual data entry.

---

## 🧪 Testing

Open `tests/test.js` in a browser console or run with Node.js:

```bash
node tests/test.js
```

Tests cover:
- ✅ Emission factor calculations (all 4 categories)
- ✅ CO₂e equivalency conversions
- ✅ Daily rating classification
- ✅ Storage read/write/delete operations
- ✅ AI engine tip matching logic
- ✅ Goal progress calculations
- ✅ Streak update logic

---

## ♿ Accessibility

- **WCAG 2.1 AA** color contrast ratios throughout
- **ARIA labels** on all interactive elements, charts, and live regions
- **Keyboard navigation** — full tab order, Enter/Space triggers
- **Skip link** for screen reader users
- **`aria-live="polite"`** on main content area for dynamic updates
- **Focus-visible** outlines on all focusable elements
- **`role` attributes** — `main`, `navigation`, `list`, `listitem`, `log`, `img`, `article`
- **Semantic HTML** — `<header>`, `<main>`, `<nav>`, `<h1>`–`<h2>`, `<form>`, `<button>`

---

## 🔒 Security

- No external API calls (no API keys)
- No `eval()` or dynamic `Function()` usage
- All user data stays on the user's device (localStorage)
- Input sanitization via `textContent` (not `innerHTML`) for user data
- `novalidate` + JS validation to prevent native browser form exploits
- CSP-compatible (no inline event attributes except framework-level onclick)

---

## 🚀 Getting Started

**Option 1: Direct browser** (simplest)
```
1. Download or clone this repository
2. Open index.html in any modern browser
3. That's it — no server needed!
```

**Option 2: Local server** (avoids CORS for font loading)
```bash
# Python
python -m http.server 8080

# Node.js
npx serve .

# Then visit http://localhost:8080
```

**Option 3: GitHub Pages** (live deployment)
```
1. Push to GitHub
2. Settings → Pages → Source: main branch / root
3. Visit https://YOUR_USERNAME.github.io/REPO_NAME
```

---

## 🌍 Impact Potential

If EcoTrace achieved 1 million active users who each reduced their footprint by just **5%**:

- Average footprint: ~4 tonnes CO₂e/year
- 5% reduction: 200 kg CO₂e/user/year
- **Total: 200,000 tonnes CO₂e avoided per year**
- Equivalent to taking ~43,000 cars off the road

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built for the Prompt War Hackathon 2024 — Vertical: Environmental Sustainability*
