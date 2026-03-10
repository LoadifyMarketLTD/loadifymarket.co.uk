-- ============================================================
-- 05_rfq_messages.sql
-- Loadify Market — RFQ System & Messaging
-- ============================================================
-- Covers: rfq_requests, rfq_responses,
--         conversations, messages
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- RFQ REQUESTS
-- B2B "Request for Quote" submitted by buyers.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfq_requests (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Submitter (optional if submitted as guest by email only)
  buyer_id            UUID        REFERENCES users(id) ON DELETE SET NULL,
  buyer_email         TEXT        NOT NULL,
  -- Product / sourcing details
  product_name        TEXT        NOT NULL,
  quantity            TEXT        NOT NULL,
  unit                TEXT,                 -- e.g. 'pallets', 'units', 'kg'
  destination_country TEXT        NOT NULL,
  estimated_budget    TEXT        NOT NULL,
  currency            TEXT        NOT NULL DEFAULT 'GBP',
  message             TEXT,
  -- Category targeting (optional)
  category_id         UUID        REFERENCES categories(id) ON DELETE SET NULL,
  -- Attachments (product spec sheets etc.)
  attachment_urls     TEXT[]      NOT NULL DEFAULT '{}',
  -- Status
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','replied','closed','expired')),
  -- Validity
  expires_at          TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfq_requests_buyer   ON rfq_requests (buyer_id);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_status  ON rfq_requests (status);
CREATE INDEX IF NOT EXISTS idx_rfq_requests_created ON rfq_requests (created_at DESC);

CREATE TRIGGER trg_rfq_requests_updated_at
  BEFORE UPDATE ON rfq_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- RFQ RESPONSES
-- Sellers respond to open RFQ requests with their quotes.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfq_responses (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfq_id          UUID        NOT NULL REFERENCES rfq_requests(id) ON DELETE CASCADE,
  seller_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quoted_price    DECIMAL(12,2) NOT NULL,
  currency        TEXT        NOT NULL DEFAULT 'GBP',
  lead_time_days  INTEGER,
  message         TEXT        NOT NULL,
  attachment_urls TEXT[]      NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted','accepted','rejected','withdrawn')),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Each seller can respond once per RFQ
  UNIQUE (rfq_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_rfq_responses_rfq    ON rfq_responses (rfq_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_seller ON rfq_responses (seller_id);
CREATE INDEX IF NOT EXISTS idx_rfq_responses_status ON rfq_responses (status);

CREATE TRIGGER trg_rfq_responses_updated_at
  BEFORE UPDATE ON rfq_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- A thread between any two users, optionally linked to a
-- product or order.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id      UUID        REFERENCES products(id) ON DELETE SET NULL,
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  subject         TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user1_id, user2_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_conversations_user1    ON conversations (user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2    ON conversations (user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_product  ON conversations (product_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations (last_message_at DESC);

-- ──────────────────────────────────────────────────────────────
-- MESSAGES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id        UUID        REFERENCES products(id) ON DELETE SET NULL,
  order_id          UUID        REFERENCES orders(id) ON DELETE SET NULL,
  message           TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  attachment_urls   TEXT[]      NOT NULL DEFAULT '{}',
  is_read           BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender      ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver    ON messages (receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread      ON messages (receiver_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_created     ON messages (created_at DESC);

CREATE TRIGGER trg_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: update conversation.last_message_at on new message
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ──────────────────────────────────────────────────────────────
-- FUNCTION: mark message as read with timestamp
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_message_read()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_mark_read
  BEFORE UPDATE OF is_read ON messages
  FOR EACH ROW EXECUTE FUNCTION mark_message_read();
