import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  Truck,
  Store,
  Lock,
  BadgeCheck,
  Search,
  ShoppingCart,
} from 'lucide-react';

const LOGISTICS_IMG =
  'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1400&q=70&auto=format&fit=crop&fm=webp';

const HOW_IT_WORKS = [
  {
    icon: Search,
    step: '1',
    title: 'Browse Products',
    description: 'Explore thousands of wholesale, clearance and pallet listings from verified UK sellers.',
  },
  {
    icon: ShoppingCart,
    step: '2',
    title: 'Contact Seller / Buy',
    description: 'Purchase directly or contact the seller to discuss bulk orders and delivery options.',
  },
  {
    icon: Package,
    step: '3',
    title: 'Receive Goods',
    description: 'Arrange collection or delivery across the UK — fast, flexible and hassle-free.',
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
                Connect with trusted freight partners for pallet, wholesale and marketplace order collections and deliveries across the UK.
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

      {/* ── Seller CTA + Trust (merged) ─────────────────────────────────── */}
      <section className="bg-[#F8F9FA] border-t border-gray-200 py-10">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

            {/* Left: Seller CTA */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Start selling your stock on Loadify Market today
              </h2>
              <p className="text-gray-700 text-base mb-6">
                List pallets, clearance and wholesale stock and reach thousands of UK buyers instantly.
              </p>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-bold px-8 py-4 rounded text-base transition-colors shadow-lg"
              >
                <Store className="w-5 h-5" />
                Start Selling Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            {/* Right: Trust items */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4 bg-gray-100 rounded-lg">
                <Lock className="w-6 h-6 text-[#F4C400] mb-2" />
                <h3 className="text-sm font-bold text-gray-900 mb-1">Secure Payments</h3>
                <p className="text-gray-600 text-xs leading-relaxed">Powered by Stripe — every transaction is encrypted.</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-100 rounded-lg">
                <BadgeCheck className="w-6 h-6 text-[#F4C400] mb-2" />
                <h3 className="text-sm font-bold text-gray-900 mb-1">Verified Sellers</h3>
                <p className="text-gray-600 text-xs leading-relaxed">All sellers are vetted before listing on the platform.</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-gray-100 rounded-lg">
                <Truck className="w-6 h-6 text-[#F4C400] mb-2" />
                <h3 className="text-sm font-bold text-gray-900 mb-1">UK Delivery Support</h3>
                <p className="text-gray-600 text-xs leading-relaxed">Flexible delivery and collection options nationwide.</p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
