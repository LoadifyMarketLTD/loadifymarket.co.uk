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
-- TASK 7: Shipping & Tracking Feature (DHL-like)
-- ============================================================================

-- Add shipping method and cost to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shipping_method" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shipping_cost" DECIMAL(10,2) DEFAULT 0;

-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  courier_name TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned', 'Delivery Failed')),
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
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller ON shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_buyer ON shipments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);

-- Create trigger function for updating shipments.updated_at
CREATE OR REPLACE FUNCTION update_shipment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update shipments.updated_at on UPDATE
CREATE TRIGGER update_shipments_updated_at 
  BEFORE UPDATE ON shipments
  FOR EACH ROW 
  EXECUTE FUNCTION update_shipment_timestamp();

-- Migrate existing data from orders table to shipments
-- For orders where trackingNumber or proofOfDelivery exists, create shipment records
DO $$
DECLARE
  order_record RECORD;
  new_shipment_id UUID;
  shipment_status TEXT;
  pod_url TEXT;
BEGIN
  FOR order_record IN 
    SELECT 
      id, 
      "orderNumber",
      "buyerId", 
      "sellerId", 
      "trackingNumber", 
      "proofOfDelivery",
      status
    FROM orders 
    WHERE "trackingNumber" IS NOT NULL OR "proofOfDelivery" IS NOT NULL
  LOOP
    -- Map order status to shipment status
    CASE order_record.status
      WHEN 'shipped' THEN shipment_status := 'Dispatched';
      WHEN 'delivered' THEN shipment_status := 'Delivered';
      ELSE shipment_status := 'Pending';
    END CASE;
    
    -- Extract proof of delivery URL
    IF order_record."proofOfDelivery" IS NOT NULL THEN
      -- If proofOfDelivery is a JSON object with images array, take the first URL
      IF jsonb_typeof(order_record."proofOfDelivery") = 'object' THEN
        pod_url := order_record."proofOfDelivery"->>'images'->0;
      ELSE
        pod_url := order_record."proofOfDelivery"::TEXT;
      END IF;
    ELSE
      pod_url := NULL;
    END IF;
    
    -- Insert shipment record (using ON CONFLICT to avoid duplicates on reruns)
    INSERT INTO shipments (
      order_id, 
      seller_id, 
      buyer_id, 
      tracking_number, 
      proof_of_delivery_url,
      status
    )
    VALUES (
      order_record.id,
      order_record."sellerId",
      order_record."buyerId",
      order_record."trackingNumber",
      pod_url,
      shipment_status
    )
    ON CONFLICT (order_id) DO NOTHING
    RETURNING id INTO new_shipment_id;
    
    -- Insert initial shipment event if shipment was created
    IF new_shipment_id IS NOT NULL THEN
      INSERT INTO shipment_events (
        shipment_id,
        status,
        message
      )
      VALUES (
        new_shipment_id,
        shipment_status,
        'Migrated from orders table'
      );
    END IF;
  END LOOP;
END $$;

-- Enable RLS for shipments and shipment_events
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Row Level Security (RLS) Policies for Shipments
-- Commented out for maintainers to enable in Supabase when ready
-- ============================================================================

-- Uncomment these policies when ready to enable RLS in production:

/*
-- Policy: Sellers and buyers can view their shipments
CREATE POLICY "Users can view own shipments" ON shipments
  FOR SELECT USING (
    auth.uid() = seller_id OR 
    auth.uid() = buyer_id
  );

-- Policy: Sellers can insert shipments for their orders
CREATE POLICY "Sellers can create shipments" ON shipments
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Policy: Sellers can update their shipments
CREATE POLICY "Sellers can update own shipments" ON shipments
  FOR UPDATE USING (auth.uid() = seller_id);

-- Policy: Admins have full access to shipments
CREATE POLICY "Admins have full access to shipments" ON shipments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Users can view shipment events for their shipments
CREATE POLICY "Users can view shipment events" ON shipment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shipments 
      WHERE shipments.id = shipment_events.shipment_id 
      AND (shipments.seller_id = auth.uid() OR shipments.buyer_id = auth.uid())
    )
  );

-- Policy: Admins can view all shipment events
CREATE POLICY "Admins can view all shipment events" ON shipment_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
*/
