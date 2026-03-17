import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  Truck,
  Store,
  UserPlus,
  ShoppingCart,
  LayoutGrid,
} from 'lucide-react';

const LOGISTICS_IMG =
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1400&q=70&auto=format&fit=crop&fm=webp';

const HOW_IT_WORKS = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Create account',
    description:
      'Sign up free and complete your profile in minutes. Open to all UK buyers and sellers.',
  },
  {
    icon: ShoppingCart,
    step: '2',
    title: 'Buy or list products',
    description:
      'Browse thousands of listings or list your own stock — single items, pallets, or wholesale lots.',
  },
  {
    icon: Truck,
    step: '3',
    title: 'Arrange delivery',
    description:
      'Arrange collection and delivery across the UK through our trusted logistics network.',
  },
];

export default function HomeBelowFold() {
  return (
    <>
      {/* ── Transport Support ───────────────────────────────────────────── */}
      <section className="bg-[#F5F6F7] py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                UK Logistics Network
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Need delivery or transport support?
              </h2>
              <p className="text-gray-600 text-sm md:text-base mb-6">
                Arrange collection and delivery for pallets, wholesale stock and marketplace orders
                across the UK. We connect you with trusted freight partners for nationwide
                collections and deliveries.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/transport-quote"
                  className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2C4E73] text-white font-semibold px-6 py-3 rounded transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Request Transport Quote
                </Link>
                <Link
                  to="/category/wholesale"
                  className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-6 py-3 rounded transition-colors"
                >
                  <Package className="w-4 h-4" />
                  Wholesale &amp; Pallets
                </Link>
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden shadow-md aspect-[16/9]">
              <img
                src={LOGISTICS_IMG}
                alt="UK logistics and delivery trucks"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="bg-white py-8 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">How It Works</h2>
            <p className="text-gray-600 text-sm max-w-xl mx-auto">
              Join thousands of UK buyers and sellers on Loadify Market — browse, list, and arrange
              delivery all in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative bg-[#F8F9FA] border border-gray-200 rounded-lg p-6 text-center"
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

      {/* ── Seller CTA (navy) ───────────────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-10">
        <div className="container-market">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Have pallets or clearance stock to sell?
            </h2>
            <p className="text-white/80 text-base mb-6">
              Reach thousands of UK buyers through Loadify Market.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
              >
                <Store className="w-4 h-4" />
                Start Selling
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 border-2 border-white text-white hover:bg-white hover:text-[#1E3A5F] font-semibold px-6 py-3 rounded transition-colors"
              >
                <LayoutGrid className="w-4 h-4" />
                Browse Marketplace
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
