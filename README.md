# Loadify Market

A comprehensive B2B & B2C marketplace platform for products, pallets, and bulk lots.

## 🚀 Quick Start

**New to the project?** Start here:
- 📘 **[Complete Setup Guide](./COMPLETE_SETUP_GUIDE.md)** - Step-by-step installation and configuration
- 🗄️ **[Database Setup Guide](./DATABASE_SETUP_COMPLETE.md)** - Complete database initialization

## ✨ Core Marketplace Features

### 1. Product Listing System ✅
- Create listings for products, pallets, lots, and clearance items
- Upload up to 10 images per product
- Full category tree with 15 main categories and 60+ subcategories
- Pricing with automatic VAT calculation
- Stock management and product specifications

### 2. Seller Dashboard ✅
- Complete product management (add/edit/delete)
- Order tracking and management
- Earnings overview with commission tracking
- Analytics and performance metrics
- Store profile management
- Shipment and returns handling

### 3. Buyer Features ✅
- Advanced product search and filtering
- Multiple view modes (grid/list)
- Wishlist functionality
- Shopping cart with persistent storage
- Secure checkout with Stripe
- Order tracking
- Seller messaging system

### 4. Admin Panel ✅
- Seller approval workflow
- Product moderation
- User management
- Category management
- Reported listings review
- System analytics and metrics
- Data export capabilities

### 5. Complete Database Schema ✅
All entities implemented:
- Users (buyer, seller, admin roles)
- Products & Categories
- Orders & Reviews
- Messages & Conversations
- Carts & Wishlists
- Payment Sessions
- Seller Stores
- Returns & Disputes
- Payouts

### 6. Authentication ✅
- Supabase-powered authentication
- Separate buyer and seller registration
- Email verification ready
- Role-based access control
- Secure session management

## 📋 Prerequisites

- **Node.js 20+** and npm
- **Supabase account** (free tier works)
- **Stripe account** (optional - for payments, test mode available)
- **SendGrid account** (optional - for email notifications)

## 🛠️ Installation

For complete setup instructions, see **[COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md)**

### Quick Start:

1. **Clone and install**:
```bash
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
npm install
```

2. **Set up database**:
   - Create a Supabase project
   - Run `database-complete.sql` in Supabase SQL Editor
   - Run `database-seed-categories.sql` to populate categories
   - Run `database-seed-testdata.sql` for test data (development only)

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. **Start development**:
```bash
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

**Note:** App works with mock services if Supabase credentials are not configured.

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
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
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
│   ├── layout/      # Header, Footer, Navigation
│   ├── CategorySelector.tsx
│   ├── ImageUpload.tsx
│   └── ProductCard.tsx
├── pages/           # Page components
│   ├── HomePage.tsx
│   ├── CatalogPage.tsx
│   ├── ProductFormPage.tsx
│   ├── SellerDashboardPage.tsx
│   ├── AdminDashboardPage.tsx
│   ├── legal/       # Terms, Privacy, etc.
│   └── ...
├── lib/             # Library configurations
│   ├── supabase.ts  # Supabase client
│   └── mocks/       # Mock services for development
├── store/           # Zustand state management
├── types/           # TypeScript definitions
└── App.tsx          # Main app with routing

Database Files:
├── database-complete.sql          # Complete schema with all tables
├── database-seed-categories.sql   # Category tree data
├── database-seed-testdata.sql     # Test users and products
└── DATABASE_SETUP_COMPLETE.md     # Database setup guide
```

## 🔐 Security Features

- Row Level Security (RLS) in Supabase
- Secure authentication with Supabase Auth
- Email verification for sellers
- Input validation and sanitization
- HTTPS only in production
- Secure payment processing with Stripe
- Protected API routes with role-based access

## 📚 Documentation

- **[Complete Setup Guide](./COMPLETE_SETUP_GUIDE.md)** - Full installation and configuration
- **[Database Setup](./DATABASE_SETUP_COMPLETE.md)** - Database initialization guide
- **[Features Documentation](./FEATURES.md)** - Detailed feature descriptions
- **[Shipping System](./docs/SHIPPING.md)** - Shipment and tracking documentation
- **[Mock Services Guide](./MOCK_SERVICES_GUIDE.md)** - Development without external services

## 🧪 Testing

### Development with Test Data

After running `database-seed-testdata.sql`, you have:
- **Test Buyer**: buyer@test.com
- **Test Seller**: seller@test.com (approved)
- **Admin**: admin@loadifymarket.co.uk
- **5 Sample Products** across different categories

### Test Stripe Cards
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Use any future expiry and any CVV

## 📦 Shipping & Tracking

The platform includes a comprehensive DHL-like shipping and tracking system. For detailed documentation, see [docs/SHIPPING.md](docs/SHIPPING.md).

**Key Features:**
- Multiple shipping options (Standard, Express, Pallet)
- Real-time shipment tracking with status history
- Automated email notifications for status changes
- Proof of delivery upload and management
- Seller shipment dashboard
- Admin shipment oversight
- Public order tracking page

## 📧 Contact

**Company**: Danny Courier LTD  
**Email**: loadifymarket.co.uk@gmail.com  
**Address**: 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom  
**VAT**: GB375949535

## 📄 License

Copyright © 2025 Danny Courier LTD. All rights reserved.

## 🤝 Contributing

This is a private project. For inquiries, please contact loadifymarket.co.uk@gmail.com.
