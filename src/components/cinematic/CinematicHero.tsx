import { Link } from 'react-router-dom';
import { Store, ArrowRight, ShieldCheck, BadgeCheck, Truck } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="relative bg-jet overflow-hidden flex items-center min-h-[45vh] md:min-h-[55vh]">
      {/* Hero Background Image — warehouse / pallet / logistics theme */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=70&auto=format&fit=max&fm=webp"
          srcSet="
            https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=768&q=70&auto=format&fit=max&fm=webp 768w,
            https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1280&q=70&auto=format&fit=max&fm=webp 1280w,
            https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=70&auto=format&fit=max&fm=webp 1600w"
          sizes="100vw"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} />
      </div>

      {/* Cinematic Background Effects */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 25% 20%, rgba(212,175,55,0.10) 0%, transparent 50%), ' +
            'radial-gradient(ellipse at 75% 80%, rgba(212,175,55,0.05) 0%, transparent 50%)',
        }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
        <div className="absolute inset-0 vignette" />
        <div className="light-beam" />
      </div>

      {/* Hero Content */}
      <div className="container-cinematic relative z-10 pt-10 pb-6 md:pt-14 md:pb-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="hidden sm:inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-2 mb-4 md:mb-6">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
            <span className="text-gold text-sm font-medium">UK Wholesale Marketplace</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 leading-tight" style={{ willChange: 'opacity' }}>
            Buy &amp; Sell Wholesale Stock Across the UK
          </h1>

          {/* Subheadline */}
          <p className="hidden sm:block text-base md:text-xl text-white/80 max-w-2xl mx-auto mb-6 md:mb-8">
            Find pallets, clearance stock and bulk deals from verified UK sellers.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-5 md:mb-8">
            <Link to="/bulk" className="btn-primary inline-flex items-center group text-lg px-8 py-4">
              Browse Stock
              <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/register?type=seller" className="btn-secondary inline-flex items-center group">
              <Store className="mr-2 h-5 w-5" />
              Start Selling
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" />
              Secure Payments
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-gold" />
              Verified Sellers
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gold" />
              UK Delivery
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-jet to-transparent" />
    </section>
  );
}
