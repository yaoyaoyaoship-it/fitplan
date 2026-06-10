# Meal Navigation and Custom Exercises Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Today meal checkpoints jump into the correct Diet recording context and add a user-managed exercise library with Supabase synchronization and local fallback.

**Architecture:** Add one navigation helper for meal checkpoints and one custom-exercise repository layer that prefers Supabase but falls back to localStorage when the table is unavailable. Merge preset and custom exercises only when rendering template-builder choices, leaving the existing preset object immutable.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase JS v2, PostgreSQL migration, Playwright smoke test.

---

### Task 1: Interaction Regressions

**Files:**
- Modify: `tests/fitplan-refresh.spec.cjs`

- [x] Add a test that clicks the Dinner checkpoint, verifies Diet is active, Dinner is selected, and the frequent-food section is available as the scroll target.
- [x] Add a test that opens custom exercise management and creates a uniquely named exercise.
- [x] Verify the exercise appears under the selected body part in the template builder.
- [x] Edit and delete the test exercise and verify the changes.
- [x] Run the test and confirm it fails on missing navigation and management controls.

### Task 2: Meal Checkpoint Navigation

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [x] Add interactive styling and action labels to meal checkpoint cards.
- [x] Add `openDietForMeal(mealType)` to switch tabs, mark the selector as user-selected, and scroll to `#frequent-food-card`.
- [x] Add keyboard activation through real buttons instead of click-only divs.
- [x] Run the interaction regression.

### Task 3: Database Migration

**Files:**
- Create: `supabase/migrations/20260610_custom_exercises.sql`

- [x] Create `custom_exercises` with owner, name, part, sets, reps, weight, timestamps, and a per-user unique name.
- [x] Add validation constraints for body part, sets, reps, and weight.
- [x] Enable RLS.
- [x] Add owner-only select, insert, update, and delete policies.

### Task 4: Custom Exercise Repository

**Files:**
- Modify: `fitplan.js`

- [x] Add normalization and validation helpers.
- [x] Add Supabase list/create/update/delete functions.
- [x] Detect missing-table errors and use localStorage fallback.
- [x] Merge local fallback records into Supabase when the table becomes available.
- [x] Keep the current source state available to the UI for sync messaging.

### Task 5: Custom Exercise Management UI

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [x] Add an inline custom-exercise manager inside the template modal.
- [x] Add fields for name, body part, sets, reps, and weight.
- [x] Add edit, delete, inline validation, and sync-status feedback.
- [x] Merge custom exercises into the template builder’s body-part groups.
- [x] Run the full browser regression.

### Task 6: Final Verification and Deployment

**Files:**
- Modify as needed only for verification fixes.

- [x] Run `node --check fitplan.js`.
- [x] Run `git diff --check`.
- [x] Run local Playwright smoke.
- [ ] Commit and push to `main`.
- [ ] Wait for GitHub Pages and run online meal-navigation smoke.
- [ ] Report the one-time SQL migration requirement if the remote table is still unavailable.
