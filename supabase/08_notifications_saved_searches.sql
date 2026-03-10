-- ============================================================
-- 08_notifications_saved_searches.sql
-- Loadify Market — Notifications, Wishlists & Saved Searches
-- ============================================================
-- Covers: notifications, notification_settings,
--         wishlists, wishlist_items, saved_searches
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- In-app notification feed per user.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL
                CHECK (type IN (
                  'order','payment','shipment','return','dispute',
                  'message','review','product_question','rfq',
                  'delivery','promotion','system','general',
                  'seller_approved','seller_rejected',
                  'product_approved','product_rejected',
                  'question_answered','offer_received','offer_accepted',
                  'offer_rejected','support_ticket'
                )),
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  link        TEXT,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread   ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type     ON notifications (type);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON notifications (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: mark notification as read with timestamp
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_notification_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notifications_mark_read
  BEFORE UPDATE OF is_read ON notifications
  FOR EACH ROW EXECUTE FUNCTION mark_notification_read();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: send notification (helper called from other triggers)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type    TEXT,
  p_title   TEXT,
  p_message TEXT,
  p_link    TEXT    DEFAULT NULL,
  p_meta    JSONB   DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_meta)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- NOTIFICATION SETTINGS
-- Per-user opt-in/opt-out preferences.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id                     UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  -- Email channel
  email_order_confirmation    BOOLEAN     NOT NULL DEFAULT TRUE,
  email_shipping_updates      BOOLEAN     NOT NULL DEFAULT TRUE,
  email_delivery_confirmation BOOLEAN     NOT NULL DEFAULT TRUE,
  email_returns_updates       BOOLEAN     NOT NULL DEFAULT TRUE,
  email_messages              BOOLEAN     NOT NULL DEFAULT TRUE,
  email_reviews               BOOLEAN     NOT NULL DEFAULT TRUE,
  email_rfq                   BOOLEAN     NOT NULL DEFAULT TRUE,
  email_promotions            BOOLEAN     NOT NULL DEFAULT FALSE,
  email_newsletter            BOOLEAN     NOT NULL DEFAULT FALSE,
  -- In-app channel
  inapp_orders                BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_messages              BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_reviews               BOOLEAN     NOT NULL DEFAULT TRUE,
  inapp_promotions            BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- WISHLISTS
-- One wishlist per user; normalised into wishlist_items.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL DEFAULT 'My Wishlist',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON wishlists (user_id);

CREATE TRIGGER trg_wishlists_updated_at
  BEFORE UPDATE ON wishlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- WISHLIST ITEMS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  wishlist_id UUID        NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
  product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (wishlist_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_items_wishlist ON wishlist_items (wishlist_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_product  ON wishlist_items (product_id);

-- ──────────────────────────────────────────────────────────────
-- SAVED SEARCHES
-- Lets users save search queries and get new-match alerts.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_searches (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  search_query            TEXT        NOT NULL,
  filters                 JSONB,      -- {category, priceMin, priceMax, condition, type, etc.}
  email_notifications     BOOLEAN     NOT NULL DEFAULT TRUE,
  notification_frequency  TEXT        NOT NULL DEFAULT 'daily'
                            CHECK (notification_frequency IN ('instant','daily','weekly')),
  last_notified_at        TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_freq ON saved_searches (notification_frequency);

CREATE TRIGGER trg_saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- NOTIFICATION TRIGGERS
-- Automatically fire in-app notifications for key events.
-- ──────────────────────────────────────────────────────────────

-- Notify seller when a new product question is asked
CREATE OR REPLACE FUNCTION notify_seller_new_question()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM send_notification(
    (SELECT seller_id FROM products WHERE id = NEW.product_id),
    'product_question',
    'New Product Question',
    'Someone asked: "' || LEFT(NEW.question, 80) || '..."',
    '/product/' || NEW.product_id::TEXT
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_seller_question
  AFTER INSERT ON product_questions
  FOR EACH ROW EXECUTE FUNCTION notify_seller_new_question();

-- Notify question asker when seller answers
CREATE OR REPLACE FUNCTION notify_user_question_answered()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.answer IS NOT NULL AND (OLD.answer IS NULL OR OLD.answer = '') THEN
    PERFORM send_notification(
      NEW.user_id,
      'question_answered',
      'Your Question Was Answered',
      'A seller replied to: "' || LEFT(NEW.question, 80) || '..."',
      '/product/' || NEW.product_id::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_answer
  AFTER UPDATE ON product_questions
  FOR EACH ROW EXECUTE FUNCTION notify_user_question_answered();

-- Notify buyer on order status change
CREATE OR REPLACE FUNCTION notify_buyer_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM send_notification(
      NEW.buyer_id,
      'order',
      'Order Update',
      'Your order ' || NEW.order_number || ' status: ' || NEW.status,
      '/orders/' || NEW.id::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_order_status
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_buyer_order_status();
