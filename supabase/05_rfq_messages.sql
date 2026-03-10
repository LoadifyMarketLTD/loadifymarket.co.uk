-- ================================================================
-- 05_rfq_messages.sql
-- Loadify Market — Seller/Buyer Engagement
-- (wishlists, saved searches, notifications, product Q&A, offers)
-- ================================================================
-- Naming convention: camelCase quoted identifiers.
-- Depends on: 01, 02, 03
-- ================================================================

-- ── WISHLISTS (denormalized array — matches useWishlist.ts) ──────
CREATE TABLE IF NOT EXISTS wishlists (
  "userId"     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "productIds" UUID[]      NOT NULL DEFAULT '{}',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_wishlists_updatedAt BEFORE UPDATE ON wishlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SAVED SEARCHES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"                UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "searchQuery"           TEXT        NOT NULL,
  filters                 JSONB,
  "emailNotifications"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "notificationFrequency" TEXT        NOT NULL DEFAULT 'daily'
                            CHECK ("notificationFrequency" IN ('instant','daily','weekly')),
  "lastNotifiedAt"        TIMESTAMPTZ,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches ("userId");
CREATE TRIGGER trg_saved_searches_updatedAt BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── NOTIFICATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL
                CHECK (type IN (
                  'order','payment','shipment','return','dispute','message','review',
                  'product_question','rfq','delivery','promotion','system','general',
                  'seller_approved','seller_rejected','product_approved','product_rejected',
                  'question_answered','offer_received','offer_accepted','offer_rejected',
                  'support_ticket'
                )),
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  link        TEXT,
  "isRead"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "readAt"    TIMESTAMPTZ,
  metadata    JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications ("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON notifications ("userId", "isRead") WHERE "isRead" = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications ("createdAt" DESC);

-- ── NOTIFICATION SETTINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_settings (
  "userId"               UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "orderConfirmation"    BOOLEAN     NOT NULL DEFAULT TRUE,
  "shippingUpdates"      BOOLEAN     NOT NULL DEFAULT TRUE,
  "deliveryConfirmation" BOOLEAN     NOT NULL DEFAULT TRUE,
  "promotionalEmails"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_notification_settings_updatedAt BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
