import { Link } from 'react-router-dom';
import { ArrowRight, Store } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="container-market">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 lg:py-12 items-center">
          {/* Left: Text Content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
              UK Multi-Category Marketplace
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Buy &amp; Sell Wholesale,<br />Clearance &amp; Pallet Deals<br className="hidden lg:block" /> Across the UK
            </h1>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Loadify Market connects buyers and sellers across the UK. We do not own or sell products — we provide the platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-7 py-3.5 rounded text-base transition-colors shadow-sm"
              >
                Browse Marketplace
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-7 py-3.5 rounded text-base transition-colors"
              >
                <Store className="h-5 w-5" />
                Start Selling
              </Link>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative">
            <div className="relative rounded-xl overflow-hidden shadow-lg aspect-[16/10]">
              <img
                src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=768&q=65&auto=format&fit=max&fm=webp"
                srcSet="
                  https://images.unsplash.com/photo-1553413077-190dd305871c?w=480&q=65&auto=format&fit=max&fm=webp 480w,
                  https://images.unsplash.com/photo-1553413077-190dd305871c?w=640&q=65&auto=format&fit=max&fm=webp 640w,
                  https://images.unsplash.com/photo-1553413077-190dd305871c?w=768&q=65&auto=format&fit=max&fm=webp 768w,
                  https://images.unsplash.com/photo-1553413077-190dd305871c?w=1280&q=65&auto=format&fit=max&fm=webp 1280w"
                sizes="(max-width: 480px) 100vw, (max-width: 1023px) 100vw, 640px"
                alt="UK warehouse with pallets and stock"
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
              <p className="text-xl font-bold text-gray-900">1000+</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
