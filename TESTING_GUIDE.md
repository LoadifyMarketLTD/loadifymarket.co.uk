# Testing Guide for Initial Client Users

This guide helps you test the newly added client users in the development environment.

## Prerequisites

The application is configured to use a mock Supabase client when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set in the `.env` file. This allows testing without connecting to a real Supabase instance.

## Testing in Development Mode

### 1. Start the Development Server

```bash
npm run dev
```

The application will start at `http://localhost:5173` (or the next available port).

### 2. Test Login with Client Users

Navigate to the login page and try logging in with the following credentials:

#### Client 1: Angelica Toda
- **Email**: angelicatoda@gmail.com
- **Password**: Johnny2000$$
- **Expected Result**: Successfully logs in as a seller (can both buy and sell)

#### Client 2: Daniel Preda
- **Email**: dannyelbill@gmail.com
- **Password**: Johnny2000$$
- **Expected Result**: Successfully logs in as a seller (can both buy and sell)

#### Admin User
- **Email**: loadifymarket.co.uk@gmail.com
- **Password**: Johnny2000$$
- **Expected Result**: Successfully logs in as an admin

### 3. Test Invalid Credentials

Try logging in with an incorrect password to verify validation:

- **Email**: angelicatoda@gmail.com
- **Password**: WrongPassword
- **Expected Result**: Error message "Invalid login credentials"

### 4. Verify in Browser Console

Open the browser's developer console (F12) to see mock client logs:

```
[MOCK] Signing in with: angelicatoda@gmail.com
```

This confirms the mock client is being used.

## Mock Client Features

The mock Supabase client includes:

1. **Password Validation**: Only accepts "Johnny2000$$" as the password
2. **User-Specific Data**: Returns the correct user object for each email
3. **Role Assignment**: 
   - Angelica Toda: seller (can both buy and sell)
   - Daniel Preda: seller (can both buy and sell)
   - Admin: admin
4. **User Storage**: All users are stored in the mock storage and can be queried

## Production Setup

For production deployment with real Supabase:

1. Follow the instructions in `SETUP_USERS.md`
2. Run the SQL migration: `database-add-initial-clients.sql`
3. Create the auth users in Supabase Dashboard
4. Set the environment variables in `.env`

## Troubleshooting

### Mock client not working
- Check that `.env` file doesn't exist or doesn't contain Supabase credentials
- Look for the warning in console: "⚠️ Supabase credentials not found - using MOCK client"

### Login fails with correct password
- Check browser console for error messages
- Verify you're using exactly "Johnny2000$$" (case-sensitive)
- Make sure the mock client is loaded (check for [MOCK] logs)

### Changes not appearing
- Clear browser cache and reload
- Restart the development server
- Check that `src/lib/mocks/supabase-mock.ts` contains the user definitions

## Automated Testing

To add automated tests for these users:

1. Create test cases that verify login with each user
2. Test password validation (correct and incorrect passwords)
3. Verify user roles are correctly assigned
4. Test that user data is properly stored in mock storage

Example test structure:
```javascript
describe('Initial Client Users', () => {
  it('should login Angelica Toda with correct password', async () => {
    const result = await supabase.auth.signInWithPassword({
      email: 'angelicatoda@gmail.com',
      password: 'Johnny2000$$'
    });
    expect(result.error).toBeNull();
    expect(result.data.user.email).toBe('angelicatoda@gmail.com');
  });

  it('should reject login with incorrect password', async () => {
    const result = await supabase.auth.signInWithPassword({
      email: 'angelicatoda@gmail.com',
      password: 'WrongPassword'
    });
    expect(result.error).toBeTruthy();
  });
});
```
