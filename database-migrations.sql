-- Migration for Medium/Low Priority Features
-- Run this after the base schema to add new columns and tables

-- A1: Add shipping amount to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shippingAmount" DECIMAL(10,2) DEFAULT 0;

-- A2: Extend seller profiles with additional business information
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "companyRegistrationNumber" TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "businessAddress" JSONB;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "payoutDetails" JSONB;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "profileCompleteness" INTEGER DEFAULT 0;

-- C1: Add tracking fields to returns table
ALTER TABLE returns ADD COLUMN IF NOT EXISTS "buyerTrackingNumber" TEXT;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS "sellerTrackingNumber" TEXT;

-- D3: Create notification settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  "userId" UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  "orderConfirmation" BOOLEAN DEFAULT TRUE,
  "shippingUpdates" BOOLEAN DEFAULT TRUE,
  "deliveryConfirmation" BOOLEAN DEFAULT TRUE,
  "promotionalEmails" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notification settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for notification settings
CREATE POLICY "Users can manage own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = "userId");

-- Trigger for notification_settings updated_at
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create index for notification settings
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings("userId");

-- ============================================================================
-- TASK 7: DHL-like Shipping & Tracking Feature
-- ============================================================================

-- Add shipping method and cost to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shipping_method" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shipping_cost" DECIMAL(10,2) DEFAULT 0;

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  courier_name TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Dispatched','In Transit','Out for Delivery','Delivered','Returned','Delivery Failed')),
  proof_of_delivery_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shipment_events table for tracking history
CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller_id ON shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer_id ON shipments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id ON shipment_events(shipment_id);

-- Trigger to update shipments.updated_at on update
CREATE OR REPLACE FUNCTION update_shipments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shipments_updated_at_trigger
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_shipments_updated_at();

-- Migrate existing data from orders.trackingNumber and orders.proofOfDelivery
-- This creates shipment records for orders that have tracking information
INSERT INTO shipments (order_id, seller_id, buyer_id, tracking_number, proof_of_delivery_url, status, created_at, updated_at)
SELECT 
  o.id,
  o."sellerId",
  o."buyerId",
  o."trackingNumber",
  CASE 
    WHEN jsonb_typeof(o."proofOfDelivery") = 'string' THEN o."proofOfDelivery"::text
    WHEN jsonb_typeof(o."proofOfDelivery") = 'object' AND o."proofOfDelivery"->>'images' IS NOT NULL 
      THEN (o."proofOfDelivery"->'images'->>0)
    ELSE NULL
  END,
  CASE 
    WHEN o.status = 'delivered' THEN 'Delivered'
    WHEN o.status = 'shipped' THEN 'In Transit'
    ELSE 'Pending'
  END,
  o."createdAt",
  o."updatedAt"
FROM orders o
WHERE o."trackingNumber" IS NOT NULL OR o."proofOfDelivery" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert initial shipment_events for migrated shipments
INSERT INTO shipment_events (shipment_id, status, message, created_at)
SELECT 
  s.id,
  s.status,
  'Migrated from orders table',
  s.created_at
FROM shipments s
WHERE NOT EXISTS (
  SELECT 1 FROM shipment_events se WHERE se.shipment_id = s.id
);

-- ============================================================================
-- Row Level Security (RLS) Policies for Shipments
-- Note: Apply these when enabling RLS on deployment
-- ============================================================================

-- Enable RLS on shipments table
-- ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Buyers can view their shipments
-- CREATE POLICY "Buyers can view their shipments" ON shipments
--   FOR SELECT USING (auth.uid() = buyer_id);

-- Sellers can view and manage their shipments
-- CREATE POLICY "Sellers can view their shipments" ON shipments
--   FOR SELECT USING (auth.uid() = seller_id);

-- CREATE POLICY "Sellers can insert their shipments" ON shipments
--   FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- CREATE POLICY "Sellers can update their shipments" ON shipments
--   FOR UPDATE USING (auth.uid() = seller_id);

-- Admins have full access
-- CREATE POLICY "Admins have full access to shipments" ON shipments
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
--   );

-- Enable RLS on shipment_events table
-- ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can view events for their shipments
-- CREATE POLICY "Users can view shipment events" ON shipment_events
--   FOR SELECT USING (
--     EXISTS (
--       SELECT 1 FROM shipments s 
--       WHERE s.id = shipment_id 
--       AND (s.buyer_id = auth.uid() OR s.seller_id = auth.uid())
--     )
--   );

-- Sellers can insert events for their shipments
-- CREATE POLICY "Sellers can insert shipment events" ON shipment_events
--   FOR INSERT WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM shipments s 
--       WHERE s.id = shipment_id 
--       AND s.seller_id = auth.uid()
--     )
--   );

-- Admins have full access to shipment events
-- CREATE POLICY "Admins have full access to shipment events" ON shipment_events
--   FOR ALL USING (
--     EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
--   );
