# FitPlan Today Meal Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable meal types to diet recording, show breakfast/lunch/dinner/snack records on Today, and fix the broken delete label.

**Architecture:** Keep the existing static `index.html` and `fitplan.js` structure. Use the existing `meals.meal_type` column as the grouping key, add small normalization and rendering helpers, and refresh Diet, Overview, and Today after every diet mutation.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase JS v2, Playwright browser smoke test.

---

### Task 1: Meal Timeline Regression

**Files:**
- Modify: `tests/fitplan-refresh.spec.cjs`

- [x] Add a browser flow that selects dinner, records a uniquely named food, opens Today, and asserts the dinner checkpoint contains the food and calories.
- [x] Assert the Diet record delete control contains `×` and does not contain the literal `\u2715`.
- [x] Run the smoke test and confirm it fails because the meal selector and four meal checkpoints do not exist.

### Task 2: Diet Meal Selection

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [x] Add a compact `#meal-type-select` control with breakfast, lunch, dinner, and snack options.
- [x] Add `suggestMealType()` to default the selector from local time without overriding the user's later choice.
- [x] Update `addFoodToToday(food, mealType)` to read the selected type and query or create the matching meal row.
- [x] Route frequent, cafeteria, search, and custom food additions through the selected meal type.

### Task 3: Grouped Diet Records and Delete Fix

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [x] Add `normalizeMealType()` and group fetched meal rows by the four supported meal types.
- [x] Render Today Records with meal headings, food names, calories, and a real `×` delete button.
- [x] Change removal to target a meal row and food index directly instead of relying on one flattened index.
- [x] Refresh Diet, Overview, and Today after remove and clear actions.

### Task 4: Rich Today Page

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [x] Add a compact summary strip for total calories, recorded meal count, and training completion.
- [x] Render `09:00` breakfast, `12:30` lunch, `18:30` dinner, and `21:30` snack checkpoints.
- [x] Show food names and calories for recorded meals, and a clear pending state for empty meals.
- [x] Preserve weight, training, and bedtime summary checkpoints.

### Task 5: Verification and Deployment

**Files:**
- Modify as needed only for verification fixes.

- [x] Run the Playwright smoke test and confirm the new regression passes.
- [x] Run `node --check fitplan.js` and `git diff --check`.
- [x] Commit and push to `main`.
- [x] Wait for GitHub Pages to publish the new markers.
- [x] Run the meal flow against the deployed site and remove the test record.
