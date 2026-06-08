# FitPlan Refresh Design

## Context

FitPlan is a public mobile-first fitness app for young users who want to manage training, diet, and body progress together. The redesign should feel fresh and energetic without becoming flashy, neon, or game-like.

## Design Direction

Use a clean mint-health visual system:

- Light background with soft green-tinted surfaces.
- Deep green app shell and bottom navigation.
- Mint accent for selected state, progress, and positive feedback.
- Coral only for training-period or high-attention status accents.
- Rounded mobile cards, but keep the radius moderate and controls mature.

The interface should feel like a reliable daily health companion, not a gym advertisement.

## Navigation Model

Use five bottom navigation modules:

1. Overview
2. Today
3. Training
4. Diet
5. Progress

User settings do not take a bottom navigation slot. They are opened through the avatar in the top-right corner.

## Overview Page

Purpose: answer "How am I doing overall?"

Content:

- Today completion score.
- Training progress.
- Calorie and macro summary.
- Current weight and short trend.
- Short "Today tasks" preview linking conceptually to the Today page.
- Weekly trend summary.

The Overview page is cross-module and high level. It should not become a long feed.

## Today Page

Purpose: answer "What should I do next today?"

Content:

- Week date strip.
- Timeline of today's body, diet, training, and summary tasks.
- Completed states for already-recorded items.
- Clear primary actions for starting training and recording meals.

The Today page is execution-focused. It organizes the same underlying data by time and action.

## Training Page

Purpose: complete today's workout.

Content:

- Today's training title and current period.
- Workout progress, such as 0/6 actions.
- Estimated duration or calorie burn.
- Ordered exercise list with weight, sets/reps, and completion checkbox.
- Template selector or template management remains available, but should not dominate the page.
- Main action: finish today's training.

The page should feel sequential and focused, reducing scattered controls.

## Diet Page

Purpose: quickly record food and understand remaining targets.

Content:

- Daily calorie target and remaining calories.
- Macro summary for protein, carbs, and fat.
- User-customizable frequent foods.
- A management entry for frequent foods, where users can add, edit, and delete saved foods with calories and macros.
- Today's meal records.
- Main action: record a meal.

Frequent foods should include both default suggestions and user-defined items. The main page should stay clean; detailed editing belongs in a management panel or modal.

## Progress Page

Purpose: interpret progress over time.

Content:

- Current weight and 30-day weight trend.
- Total/recent training count.
- Weekly training record, not a generic consecutive-record streak.
- The weekly training record distinguishes training days, rest days, and upcoming days.
- Show weekly training count, planned count, total sets, and estimated burn where possible.
- Strength trend card for selected exercises.

Avoid framing ordinary app visits as progress. Progress should reflect training, body, and nutrition data.

## User Settings

Opened from the top-right avatar.

Sections:

- Profile header with email.
- Body data: sex, age, height, current weight, body fat.
- Goals and activity: goal period, weekly training frequency, daily activity level.
- Calculation results: BMR, TDEE, suggested calorie intake, protein, carbs, and fat.
- Account actions, including logout.

Typography hierarchy:

- Page title: 17px, strong weight.
- Section title: 16px.
- Field label: 14px.
- Supporting copy: 11px.
- Value boxes: 14px with about 40px height.

This prevents settings from looking like a cramped table.

## Interaction Notes

- Keep existing Supabase data model where possible.
- Do not remove current training, diet, progress, auth, or settings functionality.
- Adding Overview and Today may require new page containers and navigation state.
- User-custom frequent foods may need a new Supabase table or profile-backed JSON field. Prefer the smallest reliable data model that matches existing Supabase patterns.
- Body weight entered in Today should sync with Progress and Settings current weight.
- Settings changes should recalculate BMR, TDEE, calories, and macros immediately after save.

## Accessibility Baseline

This redesign is not a full accessibility project, but it must not regress:

- Preserve readable contrast.
- Preserve visible focus states.
- Keep tap targets comfortable.
- Respect reduced motion for new transitions.

## Implementation Principles

1. Preserve working auth and data behavior.
2. Introduce the five-module navigation first.
3. Implement Overview and Today without breaking the existing three core pages.
4. Restyle shared components through CSS variables and reusable class patterns.
5. Add frequent-food management after the Diet page structure is stable.
6. Verify with browser tests for login, logout, all five modules, diet recording, training completion, body data settings, and progress display.
