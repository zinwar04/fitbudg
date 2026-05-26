create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (btrim(name) <> ''),
  age integer not null check (age > 0),
  sex text not null check (sex in ('male', 'female', 'other')),
  height numeric not null check (height > 0),
  weight numeric not null check (weight > 0),
  "goalWeight" numeric not null check ("goalWeight" > 0),
  "activityLevel" text not null check ("activityLevel" in ('sedentary', 'light', 'moderate', 'active', 'veryActive')),
  "fitnessGoal" text not null check ("fitnessGoal" in ('lose', 'maintain', 'gain', 'recomp')),
  "weeklyWeightDelta" numeric not null check ("weeklyWeightDelta" >= 0 and "weeklyWeightDelta" <= 1.5),
  "unitSystem" text not null check ("unitSystem" in ('metric', 'imperial')),
  "bodyFatPercent" numeric check ("bodyFatPercent" is null or ("bodyFatPercent" >= 0 and "bodyFatPercent" <= 100)),
  "targetProteinOverride" numeric check ("targetProteinOverride" is null or "targetProteinOverride" >= 0),
  "onboardingComplete" boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.app_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null default '1' check (id = '1'),
  theme text not null check (theme in ('light', 'dark', 'system')),
  "accentColor" text not null check ("accentColor" in ('emerald', 'blue', 'violet', 'amber', 'rose')),
  "unitSystem" text not null check ("unitSystem" in ('metric', 'imperial')),
  currency text not null check (btrim(currency) <> ''),
  "firstDayOfWeek" integer not null check ("firstDayOfWeek" in (0, 1)),
  "showDecimalCalories" boolean not null default false,
  "calorieDisplayRounding" text not null check ("calorieDisplayRounding" in ('none', '5', '10')),
  "dashboardWidgetOrder" jsonb not null default '[]'::jsonb check (jsonb_typeof("dashboardWidgetOrder") = 'array'),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.budget_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null default '1' check (id = '1'),
  "monthlyIncome" numeric not null default 0 check ("monthlyIncome" >= 0),
  "monthlyBudget" numeric not null default 0 check ("monthlyBudget" >= 0),
  "monthStartDay" integer not null default 1 check ("monthStartDay" >= 1 and "monthStartDay" <= 31),
  currency text not null default 'IQD' check (btrim(currency) <> ''),
  "currencySymbol" text not null default 'IQD' check (btrim("currencySymbol") <> ''),
  "categoryBudgets" jsonb not null default '[]'::jsonb check (jsonb_typeof("categoryBudgets") = 'array'),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.budget_profiles
  add column if not exists "monthStartDay" integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'budget_profiles_month_start_day_check'
  ) then
    alter table public.budget_profiles
      add constraint budget_profiles_month_start_day_check
      check ("monthStartDay" >= 1 and "monthStartDay" <= 31);
  end if;
end $$;

create table if not exists public.daily_calorie_logs (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date date not null,
  "calorieGoalOverride" numeric check ("calorieGoalOverride" is null or "calorieGoalOverride" >= 0),
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id),
  constraint daily_calorie_logs_user_date_key unique (user_id, date)
);

create table if not exists public.food_library_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (btrim(name) <> ''),
  brand text,
  "caloriesPerServing" numeric not null check ("caloriesPerServing" > 0),
  "servingSize" numeric not null check ("servingSize" > 0),
  "servingUnit" text not null check (btrim("servingUnit") <> ''),
  protein numeric check (protein is null or protein >= 0),
  carbs numeric check (carbs is null or carbs >= 0),
  fat numeric check (fat is null or fat >= 0),
  fiber numeric check (fiber is null or fiber >= 0),
  category text not null check (category in ('protein', 'carbs', 'vegetables', 'fruits', 'dairy', 'fats', 'drinks', 'snacks', 'meals', 'other')),
  "isFavorite" boolean not null default false,
  "useCount" integer not null default 0 check ("useCount" >= 0),
  "lastUsedAt" timestamptz,
  notes text,
  source text,
  external_id text,
  source_url text,
  data_quality text,
  raw_external_data jsonb,
  verified_at timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id),
  constraint food_library_items_source_check check (source is null or source in ('manual', 'usda', 'open_food_facts')),
  constraint food_library_items_data_quality_check check (data_quality is null or data_quality in ('complete', 'partial', 'limited'))
);

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

create table if not exists public.meal_templates (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (btrim(name) <> ''),
  description text,
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  "totalCalories" numeric not null default 0 check ("totalCalories" >= 0),
  "totalProtein" numeric not null default 0 check ("totalProtein" >= 0),
  "totalCarbs" numeric not null default 0 check ("totalCarbs" >= 0),
  "totalFat" numeric not null default 0 check ("totalFat" >= 0),
  "isFavorite" boolean not null default false,
  "useCount" integer not null default 0 check ("useCount" >= 0),
  "lastUsedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.food_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date date not null,
  "logId" text not null,
  "foodLibraryId" text,
  "mealTemplateId" text,
  name text not null check (btrim(name) <> ''),
  calories numeric not null check (calories >= 0),
  "servingSize" numeric not null check ("servingSize" > 0),
  "servingUnit" text not null check (btrim("servingUnit") <> ''),
  quantity numeric not null check (quantity > 0),
  protein numeric check (protein is null or protein >= 0),
  carbs numeric check (carbs is null or carbs >= 0),
  fat numeric check (fat is null or fat >= 0),
  fiber numeric check (fiber is null or fiber >= 0),
  "mealType" text not null check ("mealType" in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  notes text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id),
  constraint food_entries_daily_log_fk
    foreign key (user_id, "logId")
    references public.daily_calorie_logs (user_id, id)
    on delete cascade,
  constraint food_entries_food_library_fk
    foreign key (user_id, "foodLibraryId")
    references public.food_library_items (user_id, id)
    on delete set null ("foodLibraryId"),
  constraint food_entries_meal_template_fk
    foreign key (user_id, "mealTemplateId")
    references public.meal_templates (user_id, id)
    on delete set null ("mealTemplateId")
);

create table if not exists public.weight_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date date not null,
  weight numeric not null check (weight > 0),
  "bodyFatPercent" numeric check ("bodyFatPercent" is null or ("bodyFatPercent" >= 0 and "bodyFatPercent" <= 100)),
  notes text,
  "createdAt" timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  type text not null check (type in ('expense', 'income')),
  amount numeric not null check (amount >= 0),
  currency text not null check (btrim(currency) <> ''),
  category text not null check (category in ('food', 'transport', 'rent', 'bills', 'internet', 'shopping', 'health', 'education', 'entertainment', 'family', 'savings', 'income', 'other')),
  "paymentMethod" text not null check ("paymentMethod" in ('cash', 'card', 'bank', 'other')),
  date date not null,
  title text not null check (btrim(title) <> ''),
  notes text,
  "isRecurring" boolean not null default false,
  "recurringId" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id),
  constraint transactions_recurring_consistency check (not "isRecurring" or "recurringId" is not null)
);

create table if not exists public.habits (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (btrim(name) <> ''),
  icon text not null check (btrim(icon) <> ''),
  type text not null check (type in ('boolean', 'quantitative')),
  "targetValue" numeric check ("targetValue" is null or "targetValue" > 0),
  unit text,
  category text not null check (category in ('fitness', 'nutrition', 'finance', 'lifestyle')),
  color text not null check (btrim(color) <> ''),
  "isActive" boolean not null default true,
  streak integer not null default 0 check (streak >= 0),
  "createdAt" timestamptz not null default now(),
  primary key (user_id, id)
);

create table if not exists public.habit_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  date date not null,
  "habitId" text not null,
  completed boolean not null default false,
  value numeric check (value is null or value >= 0),
  notes text,
  "createdAt" timestamptz not null default now(),
  primary key (user_id, id),
  constraint habit_entries_user_habit_date_key unique (user_id, "habitId", date),
  constraint habit_entries_habit_fk
    foreign key (user_id, "habitId")
    references public.habits (user_id, id)
    on delete cascade
);

create table if not exists public.assistant_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  title text not null check (btrim(title) <> ''),
  messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages) = 'array'),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists user_profiles_user_updated_idx on public.user_profiles (user_id, "updatedAt" desc);
create index if not exists daily_calorie_logs_user_date_idx on public.daily_calorie_logs (user_id, date desc);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, date desc);
create index if not exists food_entries_user_log_idx on public.food_entries (user_id, "logId");
create index if not exists food_entries_user_food_library_idx on public.food_entries (user_id, "foodLibraryId");
create index if not exists food_entries_user_meal_template_idx on public.food_entries (user_id, "mealTemplateId");
create index if not exists food_library_items_user_name_idx on public.food_library_items (user_id, lower(name));
create unique index if not exists food_library_items_user_source_external_id_unique
on public.food_library_items(user_id, source, external_id)
where source is not null and external_id is not null;
create index if not exists meal_templates_user_name_idx on public.meal_templates (user_id, lower(name));
create index if not exists weight_entries_user_date_idx on public.weight_entries (user_id, date desc);
create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_category_date_idx on public.transactions (user_id, category, date desc);
create index if not exists habit_entries_user_date_idx on public.habit_entries (user_id, date desc);
create index if not exists assistant_sessions_user_updated_idx on public.assistant_sessions (user_id, "updatedAt" desc);

create or replace function public.fitbudget_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_profiles',
    'app_settings',
    'budget_profiles',
    'daily_calorie_logs',
    'food_library_items',
    'meal_templates',
    'food_entries',
    'transactions',
    'assistant_sessions'
  ]
  loop
    execute format('drop trigger if exists fitbudget_set_updated_at on public.%I', table_name);
    execute format(
      'create trigger fitbudget_set_updated_at before update on public.%I for each row execute function public.fitbudget_set_updated_at()',
      table_name
    );
  end loop;
end $$;

alter table public.user_profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.budget_profiles enable row level security;
alter table public.daily_calorie_logs enable row level security;
alter table public.food_library_items enable row level security;
alter table public.meal_templates enable row level security;
alter table public.food_entries enable row level security;
alter table public.weight_entries enable row level security;
alter table public.transactions enable row level security;
alter table public.habits enable row level security;
alter table public.habit_entries enable row level security;
alter table public.assistant_sessions enable row level security;

create or replace function public.fitbudget_owns_row(row_user_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = row_user_id;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'user_profiles',
    'app_settings',
    'budget_profiles',
    'daily_calorie_logs',
    'food_library_items',
    'meal_templates',
    'food_entries',
    'weight_entries',
    'transactions',
    'habits',
    'habit_entries',
    'assistant_sessions'
  ]
  loop
    execute format('drop policy if exists "FitBudget rows are private select" on public.%I', table_name);
    execute format('drop policy if exists "FitBudget rows are private insert" on public.%I', table_name);
    execute format('drop policy if exists "FitBudget rows are private update" on public.%I', table_name);
    execute format('drop policy if exists "FitBudget rows are private delete" on public.%I', table_name);

    execute format('create policy "FitBudget rows are private select" on public.%I for select to authenticated using (public.fitbudget_owns_row(user_id))', table_name);
    execute format('create policy "FitBudget rows are private insert" on public.%I for insert to authenticated with check (public.fitbudget_owns_row(user_id))', table_name);
    execute format('create policy "FitBudget rows are private update" on public.%I for update to authenticated using (public.fitbudget_owns_row(user_id)) with check (public.fitbudget_owns_row(user_id))', table_name);
    execute format('create policy "FitBudget rows are private delete" on public.%I for delete to authenticated using (public.fitbudget_owns_row(user_id))', table_name);
  end loop;
end $$;
