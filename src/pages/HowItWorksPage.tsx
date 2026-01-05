import { Link } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  CreditCard,
  Package,
  CheckCircle,
  UserPlus,
  ListChecks,
  Upload,
  TrendingUp,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export default function HowItWorksPage() {
  const buyerSteps = [
    {
      icon: Search,
      title: 'Browse & Search',
      description:
        'Explore thousands of products, pallets, and logistics loads. Use filters to find exactly what you need.',
    },
    {
      icon: ShoppingCart,
      title: 'Add to Cart',
      description:
        'Found something you like? Add it to your cart. Compare prices and sellers before purchasing.',
    },
    {
      icon: CreditCard,
      title: 'Secure Checkout',
      description:
        'Complete your purchase with our secure Stripe-powered checkout. All payments are protected.',
    },
    {
      icon: Package,
      title: 'Track Your Order',
      description:
        'Get real-time updates on your shipment. Track from dispatch to delivery with our logistics system.',
    },
    {
      icon: CheckCircle,
      title: 'Receive & Review',
      description:
        'Get your items delivered. Leave a review to help other buyers and build trust in the community.',
    },
  ];

  const sellerSteps = [
    {
      icon: UserPlus,
      title: 'Register as Seller',
      description:
        'Sign up with your business details. Provide VAT information and bank details for payouts.',
    },
    {
      icon: ListChecks,
      title: 'Get Approved',
      description:
        'Our team reviews your application (usually within 24 hours). Once approved, you can start listing.',
    },
    {
      icon: Upload,
      title: 'List Your Products',
      description:
        'Upload product photos, set prices, add descriptions. List individual items, pallets, or loads.',
    },
    {
      icon: TrendingUp,
      title: 'Manage Orders',
      description:
        'Receive orders in your seller dashboard. Ship products and provide tracking information.',
    },
    {
      icon: DollarSign,
      title: 'Get Paid',
      description:
        'Receive automatic payouts after successful delivery. Track your earnings and analytics.',
    },
  ];

  return (
    <div className="bg-jet min-h-screen py-12">
      {/* Header Section */}
      <section className="py-12 bg-graphite/30">
        <div className="container-cinematic text-center">
          <h1 className="heading-hero text-white mb-6">
            How <span className="text-gradient-gold">It Works</span>
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-8">
            Whether you're buying or selling, LoadifyMarket makes it simple, secure, and profitable.
          </p>
        </div>
      </section>

      {/* For Buyers Section */}
      <section className="py-16">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              For <span className="text-gradient-gold">Buyers</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Find the products you need in just a few clicks
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            {buyerSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col md:flex-row items-center gap-8 card-glass hover:scale-[1.02] transition-all duration-500"
                >
                  {/* Step Number & Icon */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-24 h-24 rounded-premium-sm bg-gold/10 flex items-center justify-center border-2 border-gold/30">
                      <Icon className="w-12 h-12 text-gold" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-gold rounded-full flex items-center justify-center text-jet font-bold text-lg shadow-cinematic-gold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-white/60 text-lg leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Buyer CTA */}
          <div className="text-center mt-12">
            <Link to="/catalog" className="btn-primary inline-flex items-center gap-2">
              Start Shopping Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container-cinematic">
        <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      </div>

      {/* For Sellers Section */}
      <section className="py-16">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              For <span className="text-gradient-gold">Sellers</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Reach thousands of buyers and grow your business
            </p>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            {sellerSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="flex flex-col md:flex-row items-center gap-8 card-glass hover:scale-[1.02] transition-all duration-500"
                >
                  {/* Step Number & Icon */}
                  <div className="flex-shrink-0 relative">
                    <div className="w-24 h-24 rounded-premium-sm bg-gold/10 flex items-center justify-center border-2 border-gold/30">
                      <Icon className="w-12 h-12 text-gold" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-gold rounded-full flex items-center justify-center text-jet font-bold text-lg shadow-cinematic-gold">
                      {index + 1}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                    <p className="text-white/60 text-lg leading-relaxed">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Seller CTA */}
          <div className="text-center mt-12">
            <Link to="/register?type=seller" className="btn-primary inline-flex items-center gap-2">
              Become a Seller
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Indicators Section */}
      <section className="py-16 bg-graphite/30">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              Why Choose <span className="text-gradient-gold">LoadifyMarket</span>?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="card-glass text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-4">
                <CheckCircle className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Verified Sellers</h3>
              <p className="text-white/50 text-sm">
                All sellers are verified and approved by our team
              </p>
            </div>

            <div className="card-glass text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-4">
                <CreditCard className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Secure Payments</h3>
              <p className="text-white/50 text-sm">
                All transactions protected by Stripe with buyer protection
              </p>
            </div>

            <div className="card-glass text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-4">
                <Package className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Real-time Tracking</h3>
              <p className="text-white/50 text-sm">
                Track your orders from dispatch to delivery
              </p>
            </div>

            <div className="card-glass text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-4">
                <TrendingUp className="h-8 w-8 text-gold" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">UK Based Support</h3>
              <p className="text-white/50 text-sm">
                Friendly support team ready to help you succeed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16">
        <div className="container-cinematic">
          <div className="card-glass max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-white/60 text-lg mb-8">
              Join thousands of buyers and sellers on the UK's most trusted marketplace
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register?type=buyer" className="btn-primary inline-flex items-center">
                Sign Up as Buyer
              </Link>
              <Link to="/register?type=seller" className="btn-primary inline-flex items-center">
                Sign Up as Seller
              </Link>
            </div>
            <p className="text-white/40 text-sm mt-6">
              Have questions? <Link to="/help" className="text-gold hover:underline">Visit our Help Center</Link> or{' '}
              <Link to="/contact" className="text-gold hover:underline">Contact Us</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
