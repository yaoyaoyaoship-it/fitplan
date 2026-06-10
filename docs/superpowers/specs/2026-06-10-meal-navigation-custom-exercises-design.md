# FitPlan Meal Navigation and Custom Exercises Design

## Goal

Improve daily flow by making Today meal checkpoints actionable, and let each user expand the exercise library with exercises that can be reused in training templates.

## Meal Checkpoint Navigation

- Every breakfast, lunch, dinner, and snack checkpoint on Today is clickable.
- Clicking a checkpoint switches to Diet.
- Diet selects the clicked meal type without replacing it with the automatic time suggestion.
- The page scrolls to the frequent-food section because it is the fastest recording path.
- Recorded and empty checkpoints use the same behavior so users can continue adding food.
- A short “去记录” or “继续添加” action label communicates that the card is interactive.

## Custom Exercise Library

Custom exercise management lives inside Training Template Management, next to the existing exercise library.

Each custom exercise contains:

- Exercise name
- Body part: chest, back, legs, shoulders, arms, or core
- Default sets
- Default reps
- Default weight in kilograms

Custom exercises:

- Appear in the same body-part groups as preset exercises.
- Can be selected when creating or editing a training template.
- Can be edited and deleted by their owner.
- Do not alter or delete preset exercises.
- Keep their copied values inside existing templates if the library entry is later edited or deleted.

## Persistence

A new Supabase table named `custom_exercises` stores user-owned exercises. Row Level Security limits select, insert, update, and delete operations to `auth.uid() = user_id`.

The repository includes an idempotent SQL migration. The public frontend cannot execute DDL with its anonymous key.

Until the migration is deployed:

- Custom exercises are stored in localStorage.
- The UI displays a compact message that cloud sync is not yet enabled.
- The feature remains usable instead of failing silently.

When the table becomes available, the UI loads and writes Supabase records. Local records are merged into Supabase once, then the local fallback is cleared.

## Error Handling

- Duplicate names are rejected against preset and custom exercises.
- Empty names, invalid body parts, sets below 1, blank reps, and negative weights are rejected with inline feedback.
- Failed Supabase writes keep the local copy and show that sync is pending.
- Deleting a custom exercise asks for confirmation.

## Verification

- Browser regression for clicking Dinner on Today and arriving at Diet with Dinner selected.
- Browser regression for opening custom exercise management, adding an exercise, and seeing it in the template exercise library.
- Browser regression for editing and deleting the exercise without affecting preset exercises.
- Static validation of the SQL migration policies and constraints.

