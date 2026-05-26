create table if not exists public.fitbudget_snapshots (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null default 'default',
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.fitbudget_snapshots enable row level security;

drop policy if exists "Users can read their own FitBudget snapshot" on public.fitbudget_snapshots;
create policy "Users can read their own FitBudget snapshot"
on public.fitbudget_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own FitBudget snapshot" on public.fitbudget_snapshots;
create policy "Users can create their own FitBudget snapshot"
on public.fitbudget_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own FitBudget snapshot" on public.fitbudget_snapshots;
create policy "Users can update their own FitBudget snapshot"
on public.fitbudget_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own FitBudget snapshot" on public.fitbudget_snapshots;
create policy "Users can delete their own FitBudget snapshot"
on public.fitbudget_snapshots
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_fitbudget_snapshot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fitbudget_snapshots_set_updated_at on public.fitbudget_snapshots;
create trigger fitbudget_snapshots_set_updated_at
before update on public.fitbudget_snapshots
for each row execute function public.set_fitbudget_snapshot_updated_at();
