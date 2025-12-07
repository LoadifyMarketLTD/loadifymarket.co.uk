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
