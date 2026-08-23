-- Phase 1.5: Add marketplace roles and payment behaviour fields
-- Migration for user roles and payment reliability indicator

-- Add marketplace_role to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "marketplaceRole" TEXT CHECK ("marketplaceRole" IN ('carrier', 'broker', 'seller'));

-- Add marketplace_role and payment_behaviour to seller_profiles table
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "marketplaceRole" TEXT CHECK ("marketplaceRole" IN ('carrier', 'broker', 'seller'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "paymentBehaviour" TEXT CHECK ("paymentBehaviour" IN ('pays_on_time', 'sometimes_late', 'repeated_delays'));

-- Create indexes for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_seller_profiles_marketplace_role ON seller_profiles("marketplaceRole");
CREATE INDEX IF NOT EXISTS idx_seller_profiles_payment_behaviour ON seller_profiles("paymentBehaviour");

-- Comment on columns to document their purpose
COMMENT ON COLUMN seller_profiles."marketplaceRole" IS 'Marketplace role: carrier, broker, or seller';
COMMENT ON COLUMN seller_profiles."paymentBehaviour" IS 'Payment reliability indicator (informational only, not a guarantee): pays_on_time, sometimes_late, or repeated_delays';
