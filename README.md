# Loadify Market

A comprehensive B2B & B2C marketplace platform for products, pallets, and bulk lots.

## 🚀 Features

- **Multi-User System**: Guest, Buyer, Seller, and Admin roles with RBAC
- **Product Management**: Support for individual products, pallets, lots, and clearance items
- **Secure Payments**: Stripe Connect integration with escrow system
- **Order Tracking**: Complete order flow from checkout to delivery
- **Reviews & Ratings**: Product and seller ratings with verified purchase badges
- **Returns & Disputes**: 14-day return policy with dispute resolution center
- **Seller Dashboard**: Comprehensive tools for inventory, orders, and payouts management
- **Admin Panel**: Full platform control including user management, product moderation, and analytics
- **GDPR Compliant**: Cookie consent, data export, and account deletion
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## 📋 Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- Stripe account
- SendGrid account (for emails)

## 🛠️ Installation

1. Clone the repository:
```bash
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- Supabase URL and keys
- Stripe keys
- SendGrid API key
- Other configuration

4. Set up the database:
- Go to your Supabase dashboard
- Run the SQL script in `database-schema.sql` in the SQL editor

5. Start the development server:
```bash
npm run dev
```

## 🏗️ Build

```bash
npm run build
```

## 🚀 Deployment

The project is configured for Netlify deployment:

1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy!

The `netlify.toml` file is already configured.

## 📦 Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth)
- **Payments**: Stripe Connect
- **Email**: SendGrid
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **PDF Generation**: jsPDF
- **Hosting**: Netlify

## 📂 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── layout/      # Layout components (Header, Footer)
│   └── ...
├── pages/           # Page components
│   ├── legal/       # Legal pages (Terms, Privacy, etc.)
│   └── ...
├── lib/             # Library configurations
├── hooks/           # Custom React hooks
├── store/           # Zustand stores
├── types/           # TypeScript type definitions
├── services/        # API services
└── utils/           # Utility functions
```

## 🔐 Security Features

- Row Level Security (RLS) in Supabase
- Secure authentication with Supabase Auth
- Rate limiting for API endpoints
- Input validation and sanitization
- HTTPS only in production
- Secure payment processing with Stripe

## 📧 Contact

**Company**: Danny Courier LTD  
**Email**: loadifymarket.co.uk@gmail.com  
**Address**: 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom  
**VAT**: GB375949535

## 📄 License

Copyright © 2025 Danny Courier LTD. All rights reserved.

## 🤝 Contributing

This is a private project. For inquiries, please contact loadifymarket.co.uk@gmail.com.
