import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ShieldCheck, Store, Truck } from 'lucide-react';

const HERO_TRUST = [
  { Icon: BadgeCheck, label: 'Verified sellers' },
  { Icon: ShieldCheck, label: 'Secure payments' },
  { Icon: Truck, label: 'UK delivery support' },
];

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
              Marketplace for Pallets, Wholesale &amp; Clearance Stock<br className="hidden lg:block" /> Across the UK
            </h1>

            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Loadify Market connects independent buyers and sellers. We do not own or sell products — we provide the platform.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/catalog"
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

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
              {HERO_TRUST.map(({ Icon, label }) => (
                <div key={label} className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#1E3A5F]" />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative">
            <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-md aspect-[16/10] max-h-[360px] lg:max-h-none">
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
          </div>
        </div>
      </div>
    </section>
  );
}
