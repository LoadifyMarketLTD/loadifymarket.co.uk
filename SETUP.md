# Setup Guide for Loadify Market

## Prerequisites

Before you begin, ensure you have the following:
- Node.js 20 or higher
- npm or yarn package manager
- A Supabase account (free tier available)
- A Stripe account (for payments)
- A SendGrid account (for emails)

## Step 1: Clone and Install

```bash
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
npm install
```

## Step 2: Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings → API
3. Copy your project URL and anon key
4. Go to SQL Editor and run the entire `database-schema.sql` file

## Step 3: Stripe Setup

1. Go to [stripe.com](https://stripe.com) and create an account
2. Enable Stripe Connect for your account
3. Go to Developers → API keys
4. Copy your publishable and secret keys
5. Go to Developers → Webhooks
6. Add a webhook endpoint for your deployed URL
7. Copy the webhook secret

## Step 4: SendGrid Setup

1. Go to [sendgrid.com](https://sendgrid.com) and create an account
2. Create an API key with Mail Send permissions
3. Copy the API key

## Step 5: Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in all the values:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid
SENDGRID_API_KEY=SG...

# App URLs
VITE_APP_URL=http://localhost:5173
VITE_SUPPORT_EMAIL=loadifymarket.co.uk@gmail.com

# Company Details (already configured)
VITE_COMPANY_NAME=Danny Courier LTD
VITE_COMPANY_ADDRESS=101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom
VITE_COMPANY_VAT=GB375949535
VITE_CURRENCY=GBP
VITE_CURRENCY_SYMBOL=£

# Marketplace
VITE_COMMISSION_RATE=0.07
```

## Step 6: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Step 7: Create Admin User

Since this is a fresh setup, you'll need to create an admin user:

1. Register a new account through the UI
2. Go to Supabase → Table Editor → users
3. Find your user and change the `role` field to `admin`

## Step 8: Deploy to Netlify

1. Push your code to GitHub (if not already done)
2. Go to [netlify.com](https://netlify.com) and sign in
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect the build settings from `netlify.toml`
6. Add all your environment variables in Site settings → Environment variables
7. Deploy!

## Step 9: Configure Domain

1. In Netlify, go to Domain settings
2. Add your custom domain: loadifymarket.co.uk
3. Follow the DNS configuration instructions
4. Update `VITE_APP_URL` to your production URL
5. Update Stripe webhook URL to production

## Troubleshooting

### Build Fails
- Ensure all environment variables are set
- Check that Node.js version is 20+
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`

### Database Issues
- Verify the SQL schema was executed completely
- Check Row Level Security (RLS) policies are enabled
- Ensure service role key has proper permissions

### Authentication Not Working
- Verify Supabase URL and keys are correct
- Check that users table exists
- Ensure RLS policies allow user operations

### Stripe Issues
- Verify API keys are for the correct mode (test/live)
- Check webhook endpoint is accessible
- Ensure Stripe Connect is enabled

## Next Steps

After deployment:
1. Test the complete buyer flow (browse → cart → checkout → order)
2. Test seller registration and product listing
3. Configure email templates in SendGrid
4. Set up monitoring and alerts
5. Add analytics (Google Analytics, etc.)
6. Implement additional features as needed

## Support

For questions or issues, contact: loadifymarket.co.uk@gmail.com
