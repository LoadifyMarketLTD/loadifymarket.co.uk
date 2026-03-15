import { Link } from 'react-router-dom';
import { Store, ArrowRight, ShieldCheck, BadgeCheck, Truck, LayoutGrid } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="relative bg-jet overflow-hidden flex items-center min-h-[50vh] md:min-h-[60vh]">
      {/* Hero Background Image — large-scale marketplace / commerce theme */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=65&auto=format&fit=max&fm=webp"
          srcSet="
            https://images.unsplash.com/photo-1553413077-190dd305871c?w=768&q=65&auto=format&fit=max&fm=webp 768w,
            https://images.unsplash.com/photo-1553413077-190dd305871c?w=1280&q=65&auto=format&fit=max&fm=webp 1280w,
            https://images.unsplash.com/photo-1553413077-190dd305871c?w=1920&q=65&auto=format&fit=max&fm=webp 1920w"
          sizes="100vw"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Multi-layer dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.70) 100%)' }} />
      </div>

      {/* Cinematic Background Effects */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(212,175,55,0.12) 0%, transparent 50%), ' +
            'radial-gradient(ellipse at 80% 80%, rgba(212,175,55,0.06) 0%, transparent 50%)',
        }}
      >
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
        <div className="absolute inset-0 vignette" />
        <div className="light-beam" />
      </div>

      {/* Hero Content */}
      <div className="container-cinematic relative z-10 pt-10 pb-6 md:pt-16 md:pb-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-2 mb-4 md:mb-6">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
            <span className="text-gold text-sm font-medium">UK Multi-Category Marketplace</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-5 leading-tight" style={{ willChange: 'opacity' }}>
            Buy &amp; Sell Anything<br className="hidden sm:block" /> Across the UK
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed">
            Electronics · Fashion · Automotive · Agriculture · Industrial · Wholesale · Clearance<br className="hidden md:block" />
            <span className="hidden sm:inline">— one marketplace, every category, verified UK sellers.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6 md:mb-8">
            <Link to="/catalog" className="btn-primary inline-flex items-center group text-base md:text-lg px-7 py-3.5 md:px-8 md:py-4">
              <LayoutGrid className="mr-2 h-5 w-5" />
              Browse Marketplace
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/register?type=seller" className="btn-secondary inline-flex items-center group text-base px-7 py-3.5 md:px-8 md:py-4">
              <Store className="mr-2 h-5 w-5" />
              Start Selling
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-white/75 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold flex-shrink-0" />
              Secure Payments
            </div>
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-gold flex-shrink-0" />
              Verified Sellers
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gold flex-shrink-0" />
              UK Wide Delivery
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-jet to-transparent" />
    </section>
  );
}
