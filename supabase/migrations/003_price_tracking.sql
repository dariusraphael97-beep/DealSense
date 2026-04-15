-- 003_price_tracking.sql
-- Adds fair-value tracking and buy timing insights to saved cars.
--
-- What we track:
--   The FAIR VALUE ESTIMATE for a saved car (not the live listing price,
--   which we cannot fetch automatically). When users refresh, we pull
--   fresh market data and compare the new fair value to the original.
--   This tells users whether the market moved in their favor or against them.

-- ── Extend saved_cars ─────────────────────────────────────────────────────────
ALTER TABLE public.saved_cars
  ADD COLUMN IF NOT EXISTS zip_code              text,
  ADD COLUMN IF NOT EXISTS vehicle_category      text,
  ADD COLUMN IF NOT EXISTS is_tracking           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS latest_fair_value_low  integer,
  ADD COLUMN IF NOT EXISTS latest_fair_value_mid  integer,
  ADD COLUMN IF NOT EXISTS latest_fair_value_high integer,
  ADD COLUMN IF NOT EXISTS latest_deal_score      integer,
  ADD COLUMN IF NOT EXISTS last_checked_at        timestamptz,
  ADD COLUMN IF NOT EXISTS last_price_change_at   timestamptz,
  ADD COLUMN IF NOT EXISTS fair_value_change_amount  integer  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fair_value_change_percent numeric(7,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buy_timing_status      text DEFAULT 'no_change',
  ADD COLUMN IF NOT EXISTS buy_timing_summary     text,
  ADD COLUMN IF NOT EXISTS market_data_available  boolean DEFAULT false;

-- Back-fill latest values from original saved data
UPDATE public.saved_cars
  SET
    latest_fair_value_mid  = fair_value_mid,
    latest_deal_score      = deal_score
  WHERE latest_fair_value_mid IS NULL AND fair_value_mid IS NOT NULL;

-- Add UPDATE policy (required for refresh endpoint)
DROP POLICY IF EXISTS "Users can update their own saved cars" ON public.saved_cars;
CREATE POLICY "Users can update their own saved cars"
  ON public.saved_cars FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── tracked_vehicle_events ────────────────────────────────────────────────────
-- Audit trail of every meaningful market check.
-- event_type describes what kind of change occurred (or didn't).
CREATE TABLE IF NOT EXISTS public.tracked_vehicle_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_car_id        uuid        NOT NULL REFERENCES public.saved_cars(id) ON DELETE CASCADE,
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type          text        NOT NULL CHECK (event_type IN (
    'first_check',       -- initial market check after saving
    'no_change',         -- fair value essentially unchanged (<1%)
    'fair_value_up',     -- fair value increased (market strengthened)
    'fair_value_down',   -- fair value decreased (market softened)
    'high_opportunity',  -- asking price now well below fair value
    'watch_only'         -- meaningful change but confidence too low for action
  )),
  old_fair_value_mid  integer,    -- previous midpoint (null on first_check)
  new_fair_value_mid  integer,    -- latest midpoint
  asking_price        integer,    -- user's original asking price (unchanged)
  delta_amount        integer,    -- new_fv_mid - old_fv_mid
  delta_percent       numeric(7,3),
  deal_score          integer,
  confidence_level    text,
  buy_timing_status   text,
  insight_summary     text,
  created_at          timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.tracked_vehicle_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tracking events"
  ON public.tracked_vehicle_events;
CREATE POLICY "Users can view their own tracking events"
  ON public.tracked_vehicle_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tracking events"
  ON public.tracked_vehicle_events;
CREATE POLICY "Users can insert their own tracking events"
  ON public.tracked_vehicle_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS tracked_vehicle_events_car_idx
  ON public.tracked_vehicle_events (saved_car_id, created_at DESC);

CREATE INDEX IF NOT EXISTS tracked_vehicle_events_user_idx
  ON public.tracked_vehicle_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_cars_last_checked_idx
  ON public.saved_cars (user_id, last_checked_at ASC NULLS FIRST);
