-- Add archive support for user notifications.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_archived
  ON public.notifications ("userId", "isArchived");
