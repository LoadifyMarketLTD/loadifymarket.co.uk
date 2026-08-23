-- ================================================================
-- 04_sellers_reviews_ratings.sql
-- Loadify Market — Reviews, Q&A, Returns, Disputes & Messaging
-- ================================================================
-- Naming convention: camelCase quoted identifiers.
-- Depends on: 01, 02, 03
-- ================================================================

-- ── REVIEWS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"          UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId"             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "orderId"            UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rating               INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  "sellerRating"       INTEGER      CHECK ("sellerRating" BETWEEN 1 AND 5),
  title                TEXT,
  comment              TEXT,
  images               TEXT[]       NOT NULL DEFAULT '{}',
  "videoUrl"           TEXT,
  "isVerifiedPurchase" BOOLEAN      NOT NULL DEFAULT FALSE,
  "sellerResponse"     JSONB,
  "sellerRespondedAt"  TIMESTAMPTZ,
  status               TEXT         NOT NULL DEFAULT 'published'
                         CHECK (status IN ('published','hidden','removed','flagged')),
  "isAbusive"          BOOLEAN      NOT NULL DEFAULT FALSE,
  "adminNote"          TEXT,
  "helpfulCount"       INTEGER      NOT NULL DEFAULT 0,
  "helpfulVoters"      UUID[]       NOT NULL DEFAULT '{}',
  "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("orderId", "userId")
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews ("productId");
CREATE INDEX IF NOT EXISTS idx_reviews_user    ON reviews ("userId");
CREATE INDEX IF NOT EXISTS idx_reviews_status  ON reviews (status);
CREATE TRIGGER trg_reviews_updatedAt BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-refresh product rating on review change
CREATE OR REPLACE FUNCTION refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW."productId", OLD."productId");
  UPDATE products SET
    rating        = (SELECT COALESCE(AVG(rating), 0) FROM reviews
                     WHERE "productId" = v_pid AND status = 'published'),
    "reviewCount" = (SELECT COUNT(*) FROM reviews
                     WHERE "productId" = v_pid AND status = 'published'),
    "updatedAt"   = NOW()
  WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION refresh_product_rating();

-- ── PRODUCT QUESTIONS (Q&A) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_questions (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "userId"         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userName"       TEXT        NOT NULL,
  question         TEXT        NOT NULL CHECK (length(trim(question)) > 0),
  answer           TEXT        CHECK (answer IS NULL OR length(trim(answer)) > 0),
  "answerUserId"   UUID        REFERENCES users(id) ON DELETE SET NULL,
  "answerUserName" TEXT,
  upvotes          INTEGER     NOT NULL DEFAULT 0,
  "isAnswered"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "answeredAt"     TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_questions_product ON product_questions ("productId");
CREATE TRIGGER trg_product_questions_updatedAt BEFORE UPDATE ON product_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── PRODUCT OFFERS (make-an-offer) ───────────────────────────────
CREATE TABLE IF NOT EXISTS product_offers (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "buyerId"        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId"       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "offerPrice"     DECIMAL(12,2) NOT NULL,
  quantity         INTEGER      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  message          TEXT,
  status           TEXT         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','accepted','rejected','countered','expired','withdrawn')),
  "counterPrice"   DECIMAL(12,2),
  "counterMessage" TEXT,
  "expiresAt"      TIMESTAMPTZ  NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_offers_product ON product_offers ("productId");
CREATE INDEX IF NOT EXISTS idx_product_offers_buyer   ON product_offers ("buyerId");
CREATE INDEX IF NOT EXISTS idx_product_offers_seller  ON product_offers ("sellerId");
CREATE TRIGGER trg_product_offers_updatedAt BEFORE UPDATE ON product_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RETURNS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS returns (
  id                     UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"              UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "buyerId"              UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId"             UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason                 TEXT         NOT NULL
                           CHECK (reason IN ('damaged','wrong_item','not_as_described','changed_mind','other')),
  description            TEXT         NOT NULL,
  images                 TEXT[]       NOT NULL DEFAULT '{}',
  status                 TEXT         NOT NULL DEFAULT 'requested'
                           CHECK (status IN ('requested','approved','rejected','completed','cancelled')),
  "refundAmount"         DECIMAL(12,2),
  "buyerTrackingNumber"  TEXT,
  "sellerTrackingNumber" TEXT,
  "resolvedBy"           UUID         REFERENCES users(id) ON DELETE SET NULL,
  "resolvedAt"           TIMESTAMPTZ,
  "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_returns_order  ON returns ("orderId");
CREATE INDEX IF NOT EXISTS idx_returns_buyer  ON returns ("buyerId");
CREATE INDEX IF NOT EXISTS idx_returns_seller ON returns ("sellerId");
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns (status);
CREATE TRIGGER trg_returns_updatedAt BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── DISPUTES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id                       UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId"                UUID         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  "buyerId"                UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "sellerId"               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject                  TEXT         NOT NULL,
  description              TEXT         NOT NULL,
  "protectionReason"       TEXT
                             CHECK ("protectionReason" IN (
                               'item_not_received','not_as_described','item_damaged',
                               'defective_product','seller_not_responding','other'
                             )),
  images                   TEXT[]       NOT NULL DEFAULT '{}',
  status                   TEXT         NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','in_review','resolved','closed')),
  resolution               TEXT,
  "resolutionType"         TEXT
                             CHECK ("resolutionType" IN (
                               'full_refund','partial_refund','replacement','rejected','withdrawn'
                             )),
  "refundAmount"           DECIMAL(12,2),
  "resolvedBy"             UUID         REFERENCES users(id) ON DELETE SET NULL,
  "sellerResponseDeadline" TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '48 hours'),
  "adminReviewDeadline"    TIMESTAMPTZ  DEFAULT (NOW() + INTERVAL '5 days'),
  "escrowStatus"           TEXT         NOT NULL DEFAULT 'held'
                             CHECK ("escrowStatus" IN ('held','released','refunded','partial_refund')),
  "buyerAbuseFlagged"      BOOLEAN      NOT NULL DEFAULT FALSE,
  "createdAt"              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_disputes_order  ON disputes ("orderId");
CREATE INDEX IF NOT EXISTS idx_disputes_buyer  ON disputes ("buyerId");
CREATE INDEX IF NOT EXISTS idx_disputes_seller ON disputes ("sellerId");
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE TRIGGER trg_disputes_updatedAt BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── DISPUTE MESSAGES ─────────────────────────────────────────────
-- Referenced in DisputesPage.tsx — was missing from all previous schemas
CREATE TABLE IF NOT EXISTS dispute_messages (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "disputeId" UUID        NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  "userId"    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "userRole"  TEXT        CHECK ("userRole" IN ('buyer','seller','admin','owner')),
  message     TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute ON dispute_messages ("disputeId");
CREATE INDEX IF NOT EXISTS idx_dispute_messages_user    ON dispute_messages ("userId");
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created ON dispute_messages ("createdAt" ASC);

-- ── CONVERSATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user1Id"       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "user2Id"       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId"     UUID        REFERENCES products(id) ON DELETE SET NULL,
  "orderId"       UUID        REFERENCES orders(id) ON DELETE SET NULL,
  subject         TEXT,
  "lastMessageAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "isArchived"    BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE ("user1Id", "user2Id", "productId")
);
CREATE INDEX IF NOT EXISTS idx_conversations_user1    ON conversations ("user1Id");
CREATE INDEX IF NOT EXISTS idx_conversations_user2    ON conversations ("user2Id");
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations ("lastMessageAt" DESC);

-- ── MESSAGES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "conversationId" UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  "senderId"       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "receiverId"     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "productId"      UUID        REFERENCES products(id) ON DELETE SET NULL,
  "orderId"        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  message          TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  "attachmentUrls" TEXT[]      NOT NULL DEFAULT '{}',
  "isRead"         BOOLEAN     NOT NULL DEFAULT FALSE,
  "readAt"         TIMESTAMPTZ,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages ("conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_sender       ON messages ("senderId");
CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON messages ("receiverId");
CREATE INDEX IF NOT EXISTS idx_messages_unread       ON messages ("receiverId", "isRead") WHERE "isRead" = FALSE;
CREATE TRIGGER trg_messages_updatedAt BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET "lastMessageAt" = NEW."createdAt" WHERE id = NEW."conversationId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
