-- ================================================================
-- 07_admin_moderation.sql
-- Loadify Market — Admin, Moderation & Support
-- ================================================================
-- Naming convention: camelCase quoted identifiers.
-- Depends on: 01, 02, 03
-- ================================================================

-- ── REPORTED LISTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reported_listings (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "reportedBy"  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT        NOT NULL
                  CHECK (reason IN ('fake','misleading','prohibited','counterfeit','wrong_category','spam','other')),
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  "reviewedBy"  UUID        REFERENCES users(id) ON DELETE SET NULL,
  "reviewNotes" TEXT,
  "resolvedAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reported_listings_product ON reported_listings ("productId");
CREATE INDEX IF NOT EXISTS idx_reported_listings_status  ON reported_listings (status);
CREATE TRIGGER trg_reported_listings_updatedAt BEFORE UPDATE ON reported_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── ADMIN ACTIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "adminId"    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  "actionType" TEXT        NOT NULL
                 CHECK ("actionType" IN (
                   'approve_seller','reject_seller','suspend_seller',
                   'approve_product','reject_product','remove_product',
                   'resolve_dispute','resolve_return',
                   'suspend_user','unsuspend_user',
                   'approve_payout','reject_payout',
                   'feature_listing','unfeature_listing',
                   'dismiss_report','resolve_report',
                   'close_ticket','respond_ticket',
                   'update_settings','send_notification','other'
                 )),
  "targetType" TEXT        NOT NULL
                 CHECK ("targetType" IN (
                   'user','product','order','dispute','return',
                   'rfq','shipment','payout','ticket','setting','other'
                 )),
  "targetId"   UUID,
  notes        TEXT,
  metadata     JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin   ON admin_actions ("adminId");
CREATE INDEX IF NOT EXISTS idx_admin_actions_type    ON admin_actions ("actionType");
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions ("createdAt" DESC);

-- ── AUDIT LOGS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actorId"    UUID        REFERENCES users(id) ON DELETE SET NULL,
  "actorEmail" TEXT,
  action       TEXT        NOT NULL,
  "tableName"  TEXT,
  "recordId"   UUID,
  "oldData"    JSONB,
  "newData"    JSONB,
  "ipAddress"  INET,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor   ON audit_logs ("actorId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_table   ON audit_logs ("tableName");
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs ("createdAt" DESC);

-- ── SUPPORT TICKETS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"         UUID        REFERENCES users(id) ON DELETE SET NULL,
  "guestEmail"     TEXT,
  "guestName"      TEXT,
  subject          TEXT        NOT NULL,
  category         TEXT        NOT NULL DEFAULT 'general'
                     CHECK (category IN (
                       'general','order','payment','returns','dispute',
                       'account','seller','product','delivery','other'
                     )),
  priority         TEXT        NOT NULL DEFAULT 'normal'
                     CHECK (priority IN ('low','normal','high','urgent')),
  "orderId"        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  "productId"      UUID        REFERENCES products(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  "assignedTo"     UUID        REFERENCES users(id) ON DELETE SET NULL,
  "resolvedAt"     TIMESTAMPTZ,
  "resolutionNote" TEXT,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user    ON support_tickets ("userId");
CREATE INDEX IF NOT EXISTS idx_support_tickets_status  ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets ("createdAt" DESC);
CREATE TRIGGER trg_support_tickets_updatedAt BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── SUPPORT TICKET MESSAGES ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "ticketId"       UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  "senderId"       UUID        REFERENCES users(id) ON DELETE SET NULL,
  "senderName"     TEXT        NOT NULL DEFAULT 'Unknown',
  "isStaff"        BOOLEAN     NOT NULL DEFAULT FALSE,
  message          TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  "attachmentUrls" TEXT[]      NOT NULL DEFAULT '{}',
  "isInternal"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket  ON support_ticket_messages ("ticketId");
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON support_ticket_messages ("createdAt" ASC);

-- ── PLATFORM SETTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  "updatedBy" UUID        REFERENCES users(id) ON DELETE SET NULL,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate',         '7.0',                               'Default seller commission percentage'),
  ('vat_rate',                '0.20',                              'Default UK VAT rate'),
  ('free_listing_limit',      '5',                                 'Max listings for unverified sellers'),
  ('verified_listing_limit',  'null',                              'Max listings for verified sellers (null = unlimited)'),
  ('escrow_release_days',     '7',                                 'Days after delivery before escrow auto-releases'),
  ('dispute_seller_response', '48',                                'Hours seller has to respond to dispute'),
  ('dispute_admin_review',    '120',                               'Hours admin has to review dispute'),
  ('rfq_expiry_days',         '30',                                'Days before RFQ request expires'),
  ('offer_expiry_hours',      '48',                                'Hours before a product offer expires'),
  ('maintenance_mode',        'false',                             'Maintenance mode toggle'),
  ('owner_email',             '"loadifymarket.co.uk@gmail.com"',   'Platform owner email')
ON CONFLICT (key) DO NOTHING;

-- ── PROMOTED LISTINGS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promoted_listings (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  "productId"      UUID         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  "sellerId"       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "promotionType"  TEXT         NOT NULL DEFAULT 'standard'
                     CHECK ("promotionType" IN ('standard','premium','spotlight','category_top')),
  placement        TEXT         NOT NULL DEFAULT 'catalog'
                     CHECK (placement IN ('catalog','homepage','category','search','sidebar')),
  "dailyBudget"    DECIMAL(10,2),
  "totalSpend"     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "costPerClick"   DECIMAL(8,4),
  "startsAt"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "endsAt"         TIMESTAMPTZ,
  status           TEXT         NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','paused','completed','cancelled','rejected')),
  impressions      INTEGER      NOT NULL DEFAULT 0,
  clicks           INTEGER      NOT NULL DEFAULT 0,
  conversions      INTEGER      NOT NULL DEFAULT 0,
  "approvedBy"     UUID         REFERENCES users(id) ON DELETE SET NULL,
  "approvedAt"     TIMESTAMPTZ,
  "rejectionReason" TEXT,
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_promoted_listings_seller ON promoted_listings ("sellerId");
CREATE INDEX IF NOT EXISTS idx_promoted_listings_status ON promoted_listings (status);
CREATE TRIGGER trg_promoted_listings_updatedAt BEFORE UPDATE ON promoted_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
