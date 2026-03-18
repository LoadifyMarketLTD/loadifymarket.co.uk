import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Store,
  Lock,
  BadgeCheck,
  TrendingUp,
  UserPlus,
  List,
  ShoppingCart,
  Banknote,
} from 'lucide-react';

const HOW_IT_WORKS = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Create Account',
    description: 'Sign up free in minutes. Get verified and unlock your seller or buyer dashboard.',
  },
  {
    icon: List,
    step: '2',
    title: 'List Your Stock',
    description: 'Add your products — wholesale, clearance, returns or job lots — with photos and pricing.',
  },
  {
    icon: ShoppingCart,
    step: '3',
    title: 'Get Orders',
    description: 'Buyers across the UK discover your listings and purchase directly through Loadify Market.',
  },
  {
    icon: Banknote,
    step: '4',
    title: 'Get Paid',
    description: 'Payments are processed securely by Stripe and transferred straight to your account.',
  },
];

export default function HomeBelowFold() {
  return (
    <>
      {/* ── Seller Conversion Section ───────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-12 border-b border-gray-200">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">

            {/* Left: Headline + CTA */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#F4C400]/20 text-[#F4C400] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                Launch Offer — 0% Commission
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Start Selling on Loadify Market Today
              </h2>
              <p className="text-blue-100 text-base mb-6 leading-relaxed">
                Join hundreds of UK sellers already making money on Loadify Market. List your stock, reach buyers nationwide, and grow your business faster — with zero commission for your first 3 months.
              </p>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-bold px-8 py-4 rounded text-base transition-colors shadow-lg"
              >
                <Store className="w-5 h-5" />
                Create Free Seller Account
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-blue-200 text-xs mt-3">No setup fees. No listing fees during launch. Cancel anytime.</p>
            </div>

            {/* Right: Benefit cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-5 bg-white/10 rounded-xl border border-white/10">
                <Lock className="w-7 h-7 text-[#F4C400] mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Secure Payments</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Every transaction encrypted and powered by Stripe.</p>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/10 rounded-xl border border-white/10">
                <BadgeCheck className="w-7 h-7 text-[#F4C400] mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Reach Real Buyers</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Connect with thousands of active UK buyers looking for stock.</p>
              </div>
              <div className="flex flex-col items-center text-center p-5 bg-white/10 rounded-xl border border-white/10">
                <TrendingUp className="w-7 h-7 text-[#F4C400] mb-3" />
                <h3 className="text-sm font-bold text-white mb-1">Grow Faster</h3>
                <p className="text-blue-200 text-xs leading-relaxed">Tools and exposure to scale your stock sales quickly.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="bg-white py-10 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-600 text-sm max-w-xl mx-auto">
              Getting started on Loadify Market is simple. Buy or sell stock in four easy steps.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative bg-[#F8F9FA] border border-gray-200 rounded-xl p-6 text-center"
                >
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#F4C400] text-gray-900 text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-[#1E3A5F]/10 rounded-full mb-4">
                    <Icon className="w-6 h-6 text-[#1E3A5F]" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] border-t border-gray-200 py-10">
        <div className="container-market text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            Ready to Buy or Sell Stock?
          </h2>
          <p className="text-gray-600 text-base max-w-xl mx-auto mb-6">
            Join the UK's growing stock marketplace. Find profitable deals or reach thousands of buyers — all in one place.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-bold px-8 py-3.5 rounded text-base transition-colors shadow-sm"
            >
              <Store className="w-5 h-5" />
              Start Selling Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-8 py-3.5 rounded text-base transition-colors"
            >
              Browse Products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
