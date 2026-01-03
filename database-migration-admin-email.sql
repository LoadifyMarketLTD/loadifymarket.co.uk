-- Migration: Update Admin Email to Official Company Email
-- Date: January 3, 2026
-- Purpose: Update admin email to loadifymarket.co.uk@gmail.com

-- Update the admin user email if it exists
UPDATE users 
SET email = 'loadifymarket.co.uk@gmail.com'
WHERE role = 'admin' 
AND (email = 'admin@loadifymarket.co.uk' OR id = '99999999-9999-9999-9999-999999999999');

-- Display confirmation
DO $$
BEGIN
  RAISE NOTICE 'Admin email updated to: loadifymarket.co.uk@gmail.com';
  RAISE NOTICE 'Please update the email in Supabase Auth dashboard as well:';
  RAISE NOTICE '1. Go to Supabase Dashboard > Authentication > Users';
  RAISE NOTICE '2. Find the admin user';
  RAISE NOTICE '3. Update email to: loadifymarket.co.uk@gmail.com';
  RAISE NOTICE '4. Verify email if needed';
END $$;

-- Verify the update
SELECT 
  id,
  email,
  role,
  "firstName",
  "lastName",
  "isEmailVerified",
  "createdAt"
FROM users
WHERE role = 'admin'
ORDER BY "createdAt" DESC;
