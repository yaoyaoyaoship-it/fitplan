create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  part text not null,
  default_sets integer not null default 4,
  default_reps text not null default '8-10',
  default_weight numeric(7, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_exercises_name_not_blank check (length(trim(name)) between 1 and 40),
  constraint custom_exercises_part_valid check (part in ('胸', '背', '腿', '肩', '手臂', '核心')),
  constraint custom_exercises_sets_valid check (default_sets between 1 and 20),
  constraint custom_exercises_reps_not_blank check (length(trim(default_reps)) between 1 and 20),
  constraint custom_exercises_weight_valid check (default_weight between 0 and 9999)
);

create unique index if not exists custom_exercises_user_name_unique
  on public.custom_exercises (user_id, name);

create index if not exists custom_exercises_user_created_index
  on public.custom_exercises (user_id, created_at);

create or replace function public.set_custom_exercises_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists custom_exercises_set_updated_at on public.custom_exercises;
create trigger custom_exercises_set_updated_at
before update on public.custom_exercises
for each row execute function public.set_custom_exercises_updated_at();

alter table public.custom_exercises enable row level security;

drop policy if exists "Users can read own custom exercises" on public.custom_exercises;
create policy "Users can read own custom exercises"
on public.custom_exercises for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own custom exercises" on public.custom_exercises;
create policy "Users can create own custom exercises"
on public.custom_exercises for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own custom exercises" on public.custom_exercises;
create policy "Users can update own custom exercises"
on public.custom_exercises for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own custom exercises" on public.custom_exercises;
create policy "Users can delete own custom exercises"
on public.custom_exercises for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.custom_exercises to authenticated;
