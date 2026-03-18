import { Link } from 'react-router-dom';
import { ArrowRight, Store, ShoppingBag, BadgeCheck, ShieldCheck, ShieldAlert, MapPin } from 'lucide-react';

const HERO_TRUST = [
  { icon: BadgeCheck, label: 'Verified Sellers' },
  { icon: ShieldCheck, label: 'Secure Payments' },
  { icon: ShieldAlert, label: 'Buyer Protection' },
  { icon: MapPin,      label: 'UK Marketplace' },
];

export default function CinematicHero() {
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="container-market">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 lg:py-12 items-center">
          {/* Left: Text Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              UK Stock &amp; Profit Marketplace
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Turn Your Stock Into<br />Profit — Fast
            </h1>
            <p className="text-lg text-gray-600 mb-2 leading-relaxed">
              Buy &amp; sell wholesale, clearance, returns and mixed stock across the UK.
            </p>
            <p className="text-sm font-semibold text-[#1E3A5F] mb-6">
              Start selling with 0% commission for the first 3 months.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-7 py-3.5 rounded text-base transition-colors shadow-sm"
              >
                <Store className="h-5 w-5" />
                Start Selling
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-7 py-3.5 rounded text-base transition-colors"
              >
                <ShoppingBag className="h-5 w-5" />
                Browse Products
              </Link>
            </div>
            {/* Inline trust signals */}
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {HERO_TRUST.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Icon className="w-3.5 h-3.5 text-[#1E3A5F]" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Loadify Market is a platform that connects independent sellers and buyers. All products are listed and sold by third-party sellers.
            </p>
          </div>

          {/* Right: Hero Image */}
          <div className="relative">
            <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[16/10]">
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=768&q=65&auto=format&fit=max&fm=webp"
                srcSet="
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=480&q=65&auto=format&fit=max&fm=webp 480w,
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=640&q=65&auto=format&fit=max&fm=webp 640w,
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=768&q=65&auto=format&fit=max&fm=webp 768w,
                  https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1280&q=65&auto=format&fit=max&fm=webp 1280w"
                sizes="(max-width: 480px) 100vw, (max-width: 1023px) 100vw, 640px"
                alt="Mixed stock and products for a UK marketplace"
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
            {/* Floating stat badges */}
            <div className="absolute -bottom-3 -left-3 bg-white border border-gray-200 rounded-lg shadow-md px-4 py-2.5">
              <p className="text-xs text-gray-500">Verified Sellers</p>
              <p className="text-xl font-bold text-[#1E3A5F]">100+</p>
            </div>
            <div className="absolute -top-3 -right-3 bg-[#F4C400] rounded-lg shadow-md px-4 py-2.5">
              <p className="text-xs text-gray-700">Active Listings</p>
              <p className="text-xl font-bold text-gray-900">1,000+</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
