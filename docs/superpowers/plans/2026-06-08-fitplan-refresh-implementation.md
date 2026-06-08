# FitPlan Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the confirmed mint-health FitPlan refresh with five modules, Overview and Today pages, frequent foods, and improved user settings.

**Architecture:** Keep the static `index.html` plus `fitplan.js` architecture. Add DOM containers for Overview and Today, restyle shared components through CSS variables, and extend the existing Supabase-backed JS state with minimal new helpers while preserving current tables where possible.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase JS v2, Playwright-based local browser regression script.

---

### Task 1: Browser Regression Harness

**Files:**
- Create: `tests/fitplan-refresh.spec.cjs`
- Modify: `package.json`

- [x] Add a Playwright smoke test that starts a local HTTP server, logs in with `user@fitplan.com`, and asserts the five module tabs exist.
- [x] Run the test and verify it fails on the current three-tab app.
- [x] Keep this test as the main acceptance harness for later tasks.

### Task 2: Five-Module Shell

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`
- Test: `tests/fitplan-refresh.spec.cjs`

- [x] Add Overview and Today page containers.
- [x] Replace the three-tab top nav with five bottom module buttons: overview, today, training, diet, progress.
- [x] Update `switchTab()` and `showMainApp()` to default to Overview and preserve visible page state.
- [x] Run the browser test and verify five modules pass.

### Task 3: Mint Visual System

**Files:**
- Modify: `index.html`

- [x] Replace dark theme variables with the confirmed mint-health palette.
- [x] Add reusable shell, card, metric, timeline, settings, and bottom-nav CSS classes.
- [x] Preserve basic focus and reduced-motion rules.
- [x] Verify login and main app still render.

### Task 4: Overview and Today Rendering

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`
- Test: `tests/fitplan-refresh.spec.cjs`

- [x] Implement `renderOverview()` with completion score, training progress, calorie summary, current weight, today tasks, and weekly summary.
- [x] Implement `renderToday()` with date strip and timeline entries for body, diet, training, and summary.
- [x] Update `updateAllStats()` or page render routing so Overview and Today refresh after diet, training, weight, and settings changes.
- [x] Extend the browser test to assert Overview and Today content.

### Task 5: Diet Frequent Foods

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`
- Test: `tests/fitplan-refresh.spec.cjs`

- [x] Add frequent-food management UI to the Diet page.
- [x] Store frequent foods in `DATA.frequentFoods` and persist locally with defaults available when no saved list exists.
- [x] Add, delete, and one-click add behavior.
- [x] Extend the browser test to add a custom frequent food and confirm it appears.

### Task 6: User Settings

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`
- Test: `tests/fitplan-refresh.spec.cjs`

- [x] Replace the old settings modal with the confirmed profile/settings layout.
- [x] Include sex, age, height, weight, body fat, goal period, weekly training frequency, activity level, BMR, TDEE, and macro results.
- [x] Save values through existing profile save flow and refresh calculations immediately.
- [x] Extend the browser test to open settings and confirm BMR/TDEE content remains visible.

### Task 7: Progress Weekly Training Record

**Files:**
- Modify: `fitplan.js`
- Test: `tests/fitplan-refresh.spec.cjs`

- [x] Replace generic consecutive record display with weekly training record display.
- [x] Distinguish trained, rest, and future/unrecorded days.
- [x] Include weekly training count, planned count, total sets, and estimated burn.
- [x] Extend the browser test to assert the weekly training record section exists.

### Task 8: Final Verification and Deployment

**Files:**
- Modify as needed only for fixes found during verification.

- [x] Run `node --check fitplan.js`.
- [x] Run `npm test` or the direct test command.
- [x] Run a final local browser flow for login, all five modules, settings, frequent food, and template manager.
- [ ] Commit and push to `main`.
- [ ] Wait for GitHub Pages deployment and run the same flow online.
