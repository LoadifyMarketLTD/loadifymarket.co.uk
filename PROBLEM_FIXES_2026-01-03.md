# Problem Fixes - January 3, 2026

## Issues Resolved

### 1. Netlify AI Telemetry 400 Error

**Problem:** 
```
400 POST /.netlify/ai//api/event_logging/batch
```

**Root Cause:**
Netlify AI telemetry was trying to send analytics data but the endpoint was not configured properly, causing 400 errors in the browser console.

**Solution:**
Added a redirect rule in `netlify.toml` to block Netlify AI telemetry requests:

```toml
# Disable Netlify AI telemetry to prevent 400 errors
[[redirects]]
  from = "/.netlify/ai/*"
  to = "/404"
  status = 404
```

**Impact:**
- Eliminates 400 errors in browser console
- No functional impact as AI telemetry was not being used
- Cleaner browser console for debugging

---

### 2. Admin Email Update

**Problem:**
Admin email needed to be updated to the official company email address.

**Old Email:** `admin@loadifymarket.co.uk`  
**New Email:** `loadifymarket.co.uk@gmail.com`

**Files Modified:**

1. **database-seed-testdata.sql**
   - Updated admin user email in INSERT statement
   - Changed ON CONFLICT behavior to DO UPDATE to ensure email is updated
   - Updated documentation comment

2. **database-migration-admin-email.sql** (NEW)
   - Migration script to update existing admin records
   - Includes verification query
   - Instructions for Supabase Auth update

**How to Apply:**

#### For New Installations:
```bash
# Just run the seed data - it will use the new email
psql -h your-host -U your-user -d your-db -f database-seed-testdata.sql
```

#### For Existing Installations:
```bash
# Run the migration to update existing admin email
psql -h your-host -U your-user -d your-db -f database-migration-admin-email.sql
```

#### Update Supabase Auth:
**IMPORTANT:** You must also update the email in Supabase Auth dashboard:

1. Go to Supabase Dashboard
2. Navigate to Authentication > Users
3. Find the admin user (search for old or new email)
4. Click to edit user
5. Update email to: `loadifymarket.co.uk@gmail.com`
6. Save changes
7. Verify email if required

**Why Both Updates Are Needed:**
- Database `users` table stores the email for application logic
- Supabase Auth stores the email for authentication
- Both must match for admin to log in successfully

---

## Testing Checklist

### Netlify AI Fix
- [ ] Deploy to Netlify
- [ ] Open browser console
- [ ] Navigate through the site
- [ ] Verify no 400 errors for `/.netlify/ai/*`
- [ ] Confirm site functions normally

### Admin Email Update
- [ ] Run migration script on database
- [ ] Update email in Supabase Auth dashboard
- [ ] Try logging in with new email
- [ ] Verify admin access to `/admin` routes
- [ ] Check that admin role is preserved
- [ ] Test admin functions (user management, approvals, etc.)

---

## Rollback Procedures

### If Netlify AI Redirect Causes Issues:
```toml
# Remove these lines from netlify.toml
[[redirects]]
  from = "/.netlify/ai/*"
  to = "/404"
  status = 404
```

### If Admin Email Update Causes Issues:
```sql
-- Revert to old email
UPDATE users 
SET email = 'admin@loadifymarket.co.uk'
WHERE id = '99999999-9999-9999-9999-999999999999';
```

Also revert in Supabase Auth dashboard.

---

## Additional Notes

### Admin Login Credentials
After applying these fixes, admin can log in with:
- **Email:** loadifymarket.co.uk@gmail.com
- **Password:** (Set in Supabase Auth)

### Future Admin Users
When creating additional admin users:
1. Create user in Supabase Auth with role 'admin'
2. Ensure user record is created in `users` table
3. Email must match between Auth and database
4. Set `isEmailVerified` to `true` for admin users

---

## Files Changed

1. `netlify.toml` - Added AI telemetry redirect
2. `database-seed-testdata.sql` - Updated admin email
3. `database-migration-admin-email.sql` - New migration file
4. `PROBLEM_FIXES_2026-01-03.md` - This documentation

---

**Status:** ✅ RESOLVED  
**Date:** January 3, 2026  
**Verified:** Build successful, no breaking changes
