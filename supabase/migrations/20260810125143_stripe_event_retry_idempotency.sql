ALTER TABLE public.stripe_events
  DROP CONSTRAINT IF EXISTS stripe_events_event_id_unique;

CREATE UNIQUE INDEX IF NOT EXISTS stripe_events_event_id_processed_unique
  ON public.stripe_events (event_id)
  WHERE status = 'processed';

CREATE INDEX IF NOT EXISTS stripe_events_event_id_lookup
  ON public.stripe_events (event_id);;
