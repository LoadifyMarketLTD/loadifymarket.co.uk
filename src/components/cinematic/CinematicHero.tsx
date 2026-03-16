import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, BadgeCheck, Truck, Store } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="container-market">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-10 lg:py-12 items-center">
          {/* Left: Text Content */}
          <div className="min-h-[280px] lg:min-h-[320px] flex flex-col justify-center">
            <span className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
              UK Multi-Category Marketplace
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-3">
              Buy &amp; Sell Pallets<br />Across the UK
            </h1>
            <p className="text-lg text-gray-700 mb-5 leading-relaxed">
              Amazon returns, clearance stock, wholesale lots and mixed pallets from verified UK sellers.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
              >
                Browse Marketplace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-6 py-3 rounded transition-colors"
              >
                <Store className="h-4 w-4" />
                Start Selling
              </Link>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-green-600" />
                Verified UK Sellers
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Secure Payments
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                Buyer Protection
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-green-600" />
                UK Wide Delivery
              </span>
            </div>
          </div>

          {/* Right: Hero Image — hidden on mobile to reduce DOM and avoid LCP waste */}
          <div className="relative hidden lg:block">
            <img
              src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1280&q=65&auto=format&fit=max&fm=webp"
              srcSet="
                https://images.unsplash.com/photo-1553413077-190dd305871c?w=768&q=65&auto=format&fit=max&fm=webp 768w,
                https://images.unsplash.com/photo-1553413077-190dd305871c?w=1280&q=65&auto=format&fit=max&fm=webp 1280w,
                https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=65&auto=format&fit=max&fm=webp 1920w"
              sizes="50vw"
              alt="UK warehouse with pallets and stock"
              className="w-full rounded-xl shadow-lg aspect-[4/3] object-cover"
              width={1280}
              height={960}
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
            {/* Floating stat badges — inside padded container to prevent CLS */}
            <div className="absolute bottom-3 left-3 bg-white border border-gray-200 rounded-lg shadow-md px-4 py-2.5">
              <p className="text-xs text-gray-700">Verified Sellers</p>
              <p className="text-xl font-bold text-[#1E3A5F]">100+</p>
            </div>
            <div className="absolute top-3 right-3 bg-[#F4C400] rounded-lg shadow-md px-4 py-2.5">
              <p className="text-xs text-gray-800">Active Listings</p>
              <p className="text-xl font-bold text-gray-900">1000+</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
