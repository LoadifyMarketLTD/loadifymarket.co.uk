-- Migration: Add Initial Client Users
-- Date: January 3, 2026
-- Purpose: Add Angelica Toda and Daniel Preda as initial client users
--
-- IMPORTANT: This script creates user records in the database.
-- You must also create the corresponding auth users in Supabase Auth Dashboard:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User"
-- 3. Add users with the following credentials:
--    - Email: angelicatoda@gmail.com, Password: Johnny2000$$
--    - Email: dannyelbill@gmail.com, Password: Johnny2000$$
--    - Admin email: loadifymarket.co.uk@gmail.com, Password: Johnny2000$$
-- 4. Use the generated UUIDs in this script or update after creation

-- Client 1: Angelica Toda
INSERT INTO users (
  id, 
  email, 
  role, 
  "firstName", 
  "lastName", 
  "isEmailVerified", 
  "createdAt"
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'angelicatoda@gmail.com',
  'buyer',
  'Angelica',
  'Toda',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";

-- Create buyer profile for Angelica Toda
INSERT INTO buyer_profiles (
  "userId", 
  "createdAt"
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Client 2: Daniel Preda
INSERT INTO users (
  id, 
  email, 
  role, 
  "firstName", 
  "lastName", 
  "isEmailVerified", 
  "createdAt"
)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'dannyelbill@gmail.com',
  'buyer',
  'Daniel',
  'Preda',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName";

-- Create buyer profile for Daniel Preda
INSERT INTO buyer_profiles (
  "userId", 
  "createdAt"
)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  NOW()
)
ON CONFLICT ("userId") DO NOTHING;

-- Display confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ User records created for:';
  RAISE NOTICE '   1. Angelica Toda (angelicatoda@gmail.com)';
  RAISE NOTICE '   2. Daniel Preda (dannyelbill@gmail.com)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: You must also create these users in Supabase Auth:';
  RAISE NOTICE '   1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '   2. Create user with email: angelicatoda@gmail.com';
  RAISE NOTICE '      Password: Johnny2000$$';
  RAISE NOTICE '      User UUID: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  RAISE NOTICE '   3. Create user with email: dannyelbill@gmail.com';
  RAISE NOTICE '      Password: Johnny2000$$';
  RAISE NOTICE '      User UUID: dddddddd-dddd-dddd-dddd-dddddddddddd';
  RAISE NOTICE '   4. Update admin password to: Johnny2000$$';
  RAISE NOTICE '      Admin email: loadifymarket.co.uk@gmail.com';
END $$;

-- Verify the users were created
SELECT 
  id,
  email,
  role,
  "firstName",
  "lastName",
  "isEmailVerified",
  "createdAt"
FROM users
WHERE email IN ('angelicatoda@gmail.com', 'dannyelbill@gmail.com')
ORDER BY "createdAt" DESC;
