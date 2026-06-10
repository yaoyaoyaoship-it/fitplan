# FitPlan Today Meal Timeline Design

## Goal

Make the Today page reflect actual diet records instead of showing one fixed lunch summary, and remove the literal `\u2715` text from diet record actions.

## Confirmed Experience

- Diet additions default to a meal type based on the current local time.
- The user can override the suggested meal type before adding food.
- Supported meal types are breakfast, lunch, dinner, and snack.
- The Today page shows one section for each meal type.
- Recorded meals show food names, item count, and calories.
- Empty meals show a restrained pending state instead of a misleading zero-calorie record.
- Existing records without a supported meal type remain visible and are treated as lunch.

## Time Rules

- Breakfast: before 10:30
- Lunch: 10:30 through 15:29
- Dinner: 15:30 through 21:29
- Snack: 21:30 onward

The automatic choice is only a default. The user can select another meal type before adding an item.

## Diet Page Changes

- Add a compact meal-type selector above the frequent-food and food-addition controls.
- Use the selected meal type for frequent foods, cafeteria foods, search results, and free-form additions.
- Keep the current calorie and macro summary across all meal types.
- Render the Today Records list grouped by meal type so the source of each item is clear.
- Replace the broken escaped delete label with a real multiplication sign and an accessible label.

## Today Page Changes

- Keep weight and training as separate daily checkpoints.
- Replace the single fixed `12:30 · 饮食` checkpoint with four meal checkpoints:
  - `09:00 · 早餐`
  - `12:30 · 午餐`
  - `18:30 · 晚餐`
  - `21:30 · 加餐`
- A recorded checkpoint displays a concise food-name summary and total calories.
- An empty checkpoint says it has not been recorded yet and directs the user to the Diet page.
- Add a compact day summary above the timeline for total calories, recorded meal count, and training progress.

## Data Model

The existing `meals` table continues to store one row per user, date, and meal type. Food objects remain unchanged.

New additions use these `meal_type` values:

- `早餐`
- `午餐`
- `晚餐`
- `加餐`

Legacy values such as `正餐` are normalized to lunch for rendering and remain readable.

## Refresh Behavior

After adding, removing, or clearing diet records:

- Refresh the Diet page.
- Refresh Overview.
- Refresh Today.

This keeps the Today timeline synchronized without requiring a reload.

## Error Handling

- If a meal query returns no row, create one for the selected meal type.
- If a meal type is unknown, render it as lunch for compatibility.
- Empty or invalid food input continues to be ignored by the existing validation.

## Verification

- Add a browser regression that records food under a selected meal type and confirms it appears in the matching Today checkpoint.
- Assert the Diet record delete button displays `×`, never the literal `\u2715`.
- Verify legacy records still contribute to lunch and daily totals.
- Run JavaScript syntax, browser smoke, and online deployment checks.
