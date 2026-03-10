-- ============================================================
-- 07_admin_moderation.sql
-- Loadify Market — Admin Tools, Moderation, Support & Banners
-- ============================================================
-- Covers: reported_listings, admin_actions, audit_logs,
--         support_tickets, support_ticket_messages, banners,
--         platform_settings (placed here for admin access)
-- ============================================================
-- Depends on: 01_users_profiles.sql, 02_categories_products.sql,
--             03_cart_orders_checkout.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- REPORTED LISTINGS
-- Community moderation: any user can flag a suspicious listing.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reported_listings (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  reported_by     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason          TEXT        NOT NULL
                    CHECK (reason IN (
                      'fake','misleading','prohibited','counterfeit',
                      'wrong_category','spam','other'
                    )),
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  reviewed_by     UUID        REFERENCES users(id) ON DELETE SET NULL,
  review_notes    TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reported_listings_product ON reported_listings (product_id);
CREATE INDEX IF NOT EXISTS idx_reported_listings_status  ON reported_listings (status);
CREATE INDEX IF NOT EXISTS idx_reported_listings_by      ON reported_listings (reported_by);

CREATE TRIGGER trg_reported_listings_updated_at
  BEFORE UPDATE ON reported_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- ADMIN ACTIONS
-- Logs every deliberate action taken by admin/owner users.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_actions (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_type     TEXT        NOT NULL
                    CHECK (action_type IN (
                      'approve_seller','reject_seller','suspend_seller',
                      'approve_product','reject_product','remove_product',
                      'resolve_dispute','resolve_return',
                      'suspend_user','unsuspend_user',
                      'approve_payout','reject_payout',
                      'feature_listing','unfeature_listing',
                      'dismiss_report','resolve_report',
                      'close_ticket','respond_ticket',
                      'update_settings','send_notification',
                      'other'
                    )),
  target_type     TEXT        NOT NULL
                    CHECK (target_type IN (
                      'user','product','order','dispute','return',
                      'rfq','shipment','payout','ticket','setting','other'
                    )),
  target_id       UUID,
  notes           TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin       ON admin_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_action_type ON admin_actions (action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target      ON admin_actions (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created     ON admin_actions (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- AUDIT LOGS
-- Immutable, append-only log of all significant platform events.
-- Should be written only via service-role (bypass RLS).
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT        NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor    ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table    ON audit_logs (table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record   ON audit_logs (record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs (created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- SUPPORT TICKETS
-- Customer support / help desk system.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  guest_email     TEXT,
  guest_name      TEXT,
  -- Categorisation
  subject         TEXT        NOT NULL,
  category        TEXT        NOT NULL DEFAULT 'general'
                    CHECK (category IN (
                      'general','order','payment','returns','dispute',
                      'account','seller','product','delivery','other'
                    )),
  priority        TEXT        NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('low','normal','high','urgent')),
  -- References
  order_id        UUID        REFERENCES orders(id) ON DELETE SET NULL,
  product_id      UUID        REFERENCES products(id) ON DELETE SET NULL,
  -- Status
  status          TEXT        NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','in_progress','waiting_customer','resolved','closed')),
  assigned_to     UUID        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ,
  resolution_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user     ON support_tickets (user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status   ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets (priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created  ON support_tickets (created_at DESC);

CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- SUPPORT TICKET MESSAGES
-- Threaded conversation within each ticket.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id       UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id       UUID        REFERENCES users(id) ON DELETE SET NULL,
  sender_name     TEXT        NOT NULL DEFAULT 'Unknown',
  is_staff        BOOLEAN     NOT NULL DEFAULT FALSE,
  message         TEXT        NOT NULL CHECK (length(trim(message)) > 0),
  attachment_urls TEXT[]      NOT NULL DEFAULT '{}',
  is_internal     BOOLEAN     NOT NULL DEFAULT FALSE,  -- staff-only internal note
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket  ON support_ticket_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender  ON support_ticket_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON support_ticket_messages (created_at ASC);

-- ──────────────────────────────────────────────────────────────
-- BANNERS
-- Homepage / promotional banners managed by admin.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS banners (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT        NOT NULL,
  subtitle    TEXT,
  image_url   TEXT        NOT NULL,
  link_url    TEXT,
  target      TEXT        NOT NULL DEFAULT '_self' CHECK (target IN ('_self','_blank')),
  -- Placement / scheduling
  placement   TEXT        NOT NULL DEFAULT 'homepage'
                CHECK (placement IN ('homepage','catalog','category','sidebar')),
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active    ON banners (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_banners_placement ON banners (placement, is_active);

CREATE TRIGGER trg_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- PLATFORM SETTINGS
-- Key/value store for platform-wide configuration.
-- Managed by owner/admin only.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT        PRIMARY KEY,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with safe defaults
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_rate',         '7.0',          'Default seller commission percentage'),
  ('vat_rate',                '0.20',         'Default UK VAT rate'),
  ('free_listing_limit',      '5',            'Max listings for unverified sellers'),
  ('verified_listing_limit',  'null',         'Max listings for verified sellers (null = unlimited)'),
  ('escrow_release_days',     '7',            'Days after delivery before escrow auto-releases'),
  ('dispute_seller_response', '48',           'Hours seller has to respond to dispute'),
  ('dispute_admin_review',    '120',          'Hours admin has to review dispute (5 days)'),
  ('rfq_expiry_days',         '30',           'Days before an RFQ request expires'),
  ('offer_expiry_hours',      '48',           'Hours before a product offer expires'),
  ('maintenance_mode',        'false',        'When true, site shows maintenance page'),
  ('owner_email',             '"loadifymarket.co.uk@gmail.com"', 'Platform owner email address')
ON CONFLICT (key) DO NOTHING;
