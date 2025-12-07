# Quick Start Guide - Loadify Market

## Prerequisites
- Node.js 20+
- Git

## Installation (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

The app will be available at http://localhost:5173

## What You'll See

✅ Homepage with hero section and features  
✅ Navigation header with search  
✅ Footer with company info  
✅ Login/Register pages  
✅ Shopping cart  
✅ Legal pages (Terms, Privacy, etc.)  
✅ Cookie consent banner  

## What's Not Working Yet

⚠️ Database operations (requires Supabase setup)  
⚠️ Product catalog (needs implementation)  
⚠️ Checkout (needs Stripe setup)  
⚠️ Email notifications (needs SendGrid)  

## Full Setup

For complete setup with all services:
1. Read `SETUP.md` for detailed instructions
2. Set up Supabase database
3. Configure environment variables
4. Set up Stripe and SendGrid

## Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

## Deploy to Netlify

1. Push to GitHub
2. Connect to Netlify
3. Add environment variables
4. Deploy!

Configuration is already in `netlify.toml`.

## Project Structure

```
src/
├── components/    # UI components
├── pages/        # Page components
├── lib/          # Supabase client
├── store/        # Zustand state
├── types/        # TypeScript types
└── App.tsx       # Main application
```

## Next Steps

1. Read `ROADMAP.md` for development plan
2. Review `IMPLEMENTATION_STATUS.md` for current state
3. Follow `SETUP.md` for production deployment

## Support

Email: loadifymarket.co.uk@gmail.com

## License

Copyright © 2025 Danny Courier LTD. All rights reserved.
