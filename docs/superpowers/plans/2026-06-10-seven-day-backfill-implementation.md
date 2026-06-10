# FitPlan Seven-Day Backfill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared working date with a seven-day edit window, future training planning, explicit rest days, and read-only historical views.

**Architecture:** Replace mutation-time uses of the fixed `today` constant with a `selectedDate` state and centralized permission helpers. Keep Overview pinned to today, while Today, Training, Diet, and Progress query the selected date. Store explicit rest states in a new RLS-protected table with localStorage fallback.

**Tech Stack:** Static HTML/CSS/JavaScript, Supabase JS v2, PostgreSQL migration, Playwright.

---

### Task 1: Date Permission Regression

**Files:**
- Modify: `tests/fitplan-refresh.spec.cjs`

- [ ] Test that yesterday is editable and its label indicates backfill.
- [ ] Test that a date eight days ago is read-only.
- [ ] Test that tomorrow is future-plan mode.
- [ ] Confirm the existing app fails these checks.

### Task 2: Shared Date Bar and State

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [ ] Add shared previous/input/next/today controls and a state badge.
- [ ] Add local-date parsing, formatting, day-difference, and permission helpers.
- [ ] Keep Overview fixed to today and hide the date bar there.
- [ ] Refresh the active date-aware module after a date change.

### Task 3: Date-Aware Data Access

**Files:**
- Modify: `fitplan.js`

- [ ] Replace selected-date meal queries and mutations.
- [ ] Replace selected-date workout queries and mutations.
- [ ] Replace selected-date body-weight upserts and lookups.
- [ ] Stop creating a workout when a date is merely opened.

### Task 4: Permission-Aware UI

**Files:**
- Modify: `index.html`
- Modify: `fitplan.js`

- [ ] Disable or hide diet mutation controls outside editable dates.
- [ ] Allow future training template selection but disable completion and parameter edits.
- [ ] Render read-only training history without mutation controls.
- [ ] Disable body-weight entry outside editable dates.
- [ ] Update copy from “Today” to the selected date where appropriate.

### Task 5: Explicit Rest Days

**Files:**
- Create: `supabase/migrations/20260610_daily_status.sql`
- Modify: `index.html`
- Modify: `fitplan.js`

- [ ] Add the daily-status table, constraints, unique index, RLS, and owner policies.
- [ ] Add cloud repository with localStorage fallback and merge.
- [ ] Add mark-rest and remove-rest actions for editable non-future dates.
- [ ] Render weekly states as trained, rest, unrecorded, and future.

### Task 6: Verification and Deployment

**Files:**
- Modify as needed for verification fixes.

- [ ] Run syntax and diff checks.
- [ ] Run full local Playwright smoke.
- [ ] Verify no test records remain.
- [ ] Commit and push.
- [ ] Run deployed smoke.
- [ ] Ask the user to execute the daily-status migration.
