alter table public.food_library_items
  add column if not exists source text,
  add column if not exists external_id text,
  add column if not exists source_url text,
  add column if not exists data_quality text,
  add column if not exists raw_external_data jsonb,
  add column if not exists verified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_library_items_source_check'
  ) then
    alter table public.food_library_items
      add constraint food_library_items_source_check
      check (source is null or source in ('manual', 'usda', 'open_food_facts'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_library_items_data_quality_check'
  ) then
    alter table public.food_library_items
      add constraint food_library_items_data_quality_check
      check (data_quality is null or data_quality in ('complete', 'partial', 'limited'));
  end if;
end $$;

create unique index if not exists food_library_items_user_source_external_id_unique
on public.food_library_items(user_id, source, external_id)
where source is not null and external_id is not null;
