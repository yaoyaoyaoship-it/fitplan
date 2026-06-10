create table if not exists public.daily_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_status_value_valid check (status in ('rest')),
  constraint daily_status_user_date_unique unique (user_id, date)
);

create index if not exists daily_status_user_date_index
  on public.daily_status (user_id, date);

create or replace function public.set_daily_status_updated_at()
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

drop trigger if exists daily_status_set_updated_at on public.daily_status;
create trigger daily_status_set_updated_at
before update on public.daily_status
for each row execute function public.set_daily_status_updated_at();

alter table public.daily_status enable row level security;

drop policy if exists "Users can read own daily status" on public.daily_status;
create policy "Users can read own daily status"
on public.daily_status for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create own daily status" on public.daily_status;
create policy "Users can create own daily status"
on public.daily_status for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily status" on public.daily_status;
create policy "Users can update own daily status"
on public.daily_status for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily status" on public.daily_status;
create policy "Users can delete own daily status"
on public.daily_status for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.daily_status to authenticated;
