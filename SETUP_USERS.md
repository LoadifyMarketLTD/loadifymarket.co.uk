# User Setup Instructions

This document provides instructions for setting up the initial client users in the Loadify Market system.

## Initial Client Users

The following users have been configured in the system:

### Client 1: Angelica Toda
- **Email**: angelicatoda@gmail.com
- **Password**: Johnny2000$$
- **Role**: Seller (can both buy and sell)
- **User ID**: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa

### Client 2: Daniel Preda
- **Email**: dannyelbill@gmail.com
- **Password**: Johnny2000$$
- **Role**: Seller (can both buy and sell)
- **User ID**: dddddddd-dddd-dddd-dddd-dddddddddddd

### Admin User
- **Email**: loadifymarket.co.uk@gmail.com
- **Password**: Johnny2000$$
- **Role**: Admin
- **User ID**: 99999999-9999-9999-9999-999999999999

**Note**: Both Angelica Toda and Daniel Preda are configured as sellers, which allows them to both buy products and sell their own products on the platform.

## Database Setup

### Step 1: Run the SQL Migration

Execute the SQL migration file to create the user records in the database:

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f database-add-initial-clients.sql
```

Or use the Supabase SQL Editor:
1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database-add-initial-clients.sql`
4. Run the query

### Step 2: Create Auth Users in Supabase

**IMPORTANT**: The database migration only creates the user profile records. You must also create the corresponding authentication users in Supabase Auth:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Users**
3. Click **"Add User"**
4. Create each user with the following details:

#### For Angelica Toda:
- Email: angelicatoda@gmail.com
- Password: Johnny2000$$
- User ID (UUID): aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
- Confirm Email: Yes

#### For Daniel Preda:
- Email: dannyelbill@gmail.com
- Password: Johnny2000$$
- User ID (UUID): dddddddd-dddd-dddd-dddd-dddddddddddd
- Confirm Email: Yes

#### For Admin:
- Email: loadifymarket.co.uk@gmail.com
- Password: Johnny2000$$
- User ID (UUID): 99999999-9999-9999-9999-999999999999
- Confirm Email: Yes

### Step 3: Verify the Setup

Test the login functionality:

1. Navigate to the login page: `/login`
2. Try logging in with each user:
   - angelicatoda@gmail.com / Johnny2000$$
   - dannyelbill@gmail.com / Johnny2000$$
   - loadifymarket.co.uk@gmail.com / Johnny2000$$

## Development Mode (Mock Client)

When running in development mode without Supabase credentials, the mock client automatically supports these users:

- The mock client validates the password: **Johnny2000$$**
- Invalid passwords will be rejected with an error message
- All three users (Angelica, Daniel, and Admin) are available in the mock client

## Security Notes

⚠️ **Important Security Considerations**:

1. These are initial development/testing credentials
2. In production, users should:
   - Change their passwords immediately after first login
   - Use strong, unique passwords
   - Enable two-factor authentication if available
3. Never commit passwords to version control
4. Store credentials securely using environment variables or secret management systems

## Troubleshooting

### User cannot log in
- Verify the user exists in Supabase Auth (Authentication > Users)
- Ensure email is verified in Supabase
- Check that the password matches exactly: `Johnny2000$$`
- Verify the user record exists in the `users` table

### User logs in but has no data
- Check that the user profile exists in either `buyer_profiles`, `seller_profiles`, or has admin role
- Verify the user ID matches between Supabase Auth and the database tables

### Mock client issues
- Ensure you're using the exact password: `Johnny2000$$`
- Check browser console for mock client logs
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set in `.env` to use mock client
