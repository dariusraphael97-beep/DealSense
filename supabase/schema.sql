-- CarDeal MVP Schema
-- Run this in Supabase SQL editor (or via supabase db push)

-- Users are managed by Supabase Auth; this extends the profile.
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  created_at timestamptz default now()
);

-- Every analysis run is stored here (user_id is nullable for anonymous analyses).
create table if not exists public.analyses (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles(id) on delete set null,
  vin                 text,
  year                int not null,
  make                text not null,
  model               text not null,
  trim                text,
  mileage             int not null,
  asking_price        int not null,
  zip_code            text not null,
  estimated_value_low int not null,
  estimated_value_high int not null,
  price_delta         int not null,
  deal_score          int not null check (deal_score between 0 and 100),
  verdict             text not null check (verdict in ('Buy', 'Negotiate', 'Walk Away')),
  ai_summary          text,
  negotiation_script  text,
  created_at          timestamptz default now()
);

-- Cache pricing API responses to avoid redundant calls.
create table if not exists public.pricing_cache (
  id             uuid primary key default gen_random_uuid(),
  make           text not null,
  model          text not null,
  year           int not null,
  trim           text,
  zip_code       text,
  source         text not null, -- e.g. 'marketcheck', 'heuristic'
  market_value   int not null,
  raw_response   jsonb,
  updated_at     timestamptz default now()
);

create index if not exists pricing_cache_lookup
  on public.pricing_cache (make, model, year, trim, zip_code);

-- Plans (for future Stripe integration)
create table if not exists public.plans (
  id               uuid primary key default gen_random_uuid(),
  stripe_price_id  text unique,
  name             text not null,
  analysis_limit   int, -- null = unlimited
  created_at       timestamptz default now()
);

-- Seed default plans
insert into public.plans (name, analysis_limit)
values ('Free', 3), ('Pro', null)
on conflict do nothing;

-- Row-level security
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.pricing_cache enable row level security;

-- Policies: users can only see their own data
create policy "Users see own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users see own analyses"
  on public.analyses for select
  using (auth.uid() = user_id or user_id is null);

create policy "Service role can insert analyses"
  on public.analyses for insert
  with check (true); -- restricted by service role key in API

create policy "Public read pricing cache"
  on public.pricing_cache for select using (true);
