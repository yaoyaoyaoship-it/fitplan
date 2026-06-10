# FitPlan Seven-Day Backfill Design

## Goal

Allow users to recover from missed days without turning all historical data into indefinitely editable records.

## Date Rules

- Today and the previous seven calendar days are editable.
- Dates older than seven days are read-only.
- Future dates allow training-plan selection only.
- Overview always represents today.
- Today, Training, Diet, and Progress use the selected working date.

The editable window includes eight dates: today plus seven previous dates.

## Date Navigation

A shared date bar appears above Today, Training, Diet, and Progress:

- Previous-day button
- Native date input
- Next-day button
- “Today” shortcut
- State badge: Today, Backfillable, Read-only history, or Future plan

Changing the date refreshes the active module without changing the selected bottom tab.

## Training

- Opening a date never creates a workout automatically.
- Editable dates can choose/reset templates, edit exercise values, mark exercises complete, and finish a workout.
- Future dates can choose or replace a template but cannot mark exercises complete.
- Read-only dates show recorded data without mutation controls.
- Editable past dates can be explicitly marked as rest.
- Marking rest removes an empty/planned workout for that date after confirmation.
- A trained date cannot be marked rest until its completed workout data is reset.

## Diet

- Editable dates support all current meal recording and deletion actions.
- Read-only dates show meal groups and totals without add, delete, or clear controls.
- Future dates show no diet-entry controls and explain that diet is recorded after the date arrives.

## Body Weight

- Editable dates can upsert weight for the selected date.
- Read-only and future dates can view history but cannot record weight.
- Today timeline uses the weight entry for the selected date, not the newest global entry.

## Rest and Weekly Status

A new `daily_status` table stores explicit rest days:

- `user_id`
- `date`
- `status`, initially only `rest`
- timestamps

The weekly record distinguishes:

- Trained: at least one completed exercise
- Rest: explicit daily status
- Unrecorded: past or current date with neither state
- Future: date after today

No record is interpreted as rest.

## Persistence and Fallback

The repository includes an idempotent Supabase migration with RLS.

Until the migration is run, explicit rest status uses a per-user localStorage fallback and the UI notes that cloud synchronization is pending. Once the table exists, local statuses merge into Supabase.

## Verification

- Select yesterday and add then remove a diet test record.
- Select a date eight days ago and verify mutation controls are disabled.
- Select tomorrow and verify a training template can be planned but completion cannot be toggled.
- Mark an editable past date as rest and verify the weekly record state.
- Verify opening an empty date does not create a workout row.

