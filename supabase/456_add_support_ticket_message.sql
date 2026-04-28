-- ================================================================
-- 456_add_support_ticket_message.sql
-- Loadify Market — Add message body column to support_tickets
-- ================================================================
-- The contact form captures a free-text message from the submitter.
-- Previously this text was only forwarded via email and would be
-- permanently lost if email delivery failed.  This migration adds a
-- nullable TEXT column so the message body is always persisted in the
-- database alongside the ticket metadata.
-- ================================================================

ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS message TEXT;
