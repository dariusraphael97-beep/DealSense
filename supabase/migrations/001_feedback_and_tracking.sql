-- Migration: feedback table + analyses table updates
-- Created: 2026-04-11

-- 1. Create feedback table
create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete set null,
  analysis_id   uuid references public.analyses(id) on delete cascade,
  vin           text,
  deal_score    int,
  verdict       text,
  confidence_level text,
  helpful       boolean not null,
  comment       text,
  created_at    timestamptz default now()
);

alter table public.feedback enable row level security;

create policy "Users can insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- 2. Update analyses verdict constraint to include new verdicts
alter table public.analyses drop constraint if exists analyses_verdict_check;
alter table public.analyses add constraint analyses_verdict_check
  check (verdict in ('Buy', 'Fair Deal', 'Negotiate', 'Needs Option Review', 'Possibly Overpriced', 'Walk Away'));

-- 3. Add new columns to analyses if not present
alter table public.analyses add column if not exists price_source text;
alter table public.analyses add column if not exists result_json jsonb;
alter table public.analyses add column if not exists confidence_level text;
alter table public.analyses add column if not exists vehicle_category text;
