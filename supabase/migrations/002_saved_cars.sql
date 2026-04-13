-- Migration: Saved Cars table
-- Allows users to bookmark analyses for later comparison

create table if not exists public.saved_cars (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  analysis_id     uuid references public.analyses(id) on delete set null,
  vin             text,
  year            int not null,
  make            text not null,
  model           text not null,
  trim            text,
  mileage         int not null,
  asking_price    int not null,
  deal_score      int not null,
  verdict         text not null,
  price_delta     int not null,
  fair_value_mid  int not null,
  confidence_level text,
  result_json     jsonb,
  created_at      timestamptz default now(),

  -- Prevent duplicate saves of same analysis
  unique(user_id, analysis_id)
);

create index idx_saved_cars_user on public.saved_cars(user_id);
create index idx_saved_cars_vin on public.saved_cars(user_id, vin);

alter table public.saved_cars enable row level security;

create policy "Users see own saved cars"
  on public.saved_cars for select
  using (auth.uid() = user_id);

create policy "Users insert own saved cars"
  on public.saved_cars for insert
  with check (auth.uid() = user_id);

create policy "Users delete own saved cars"
  on public.saved_cars for delete
  using (auth.uid() = user_id);
