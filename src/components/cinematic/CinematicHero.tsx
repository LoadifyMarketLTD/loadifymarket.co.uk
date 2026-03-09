import { Link } from 'react-router-dom';
import { ShoppingBag, Package, Store, ArrowRight, ShieldCheck, Star, RefreshCw, MapPin } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="relative bg-jet overflow-hidden flex items-center min-h-[auto] md:min-h-[65vh]">
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
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} />
      </div>

      {/* Cinematic Background Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gold/10 rounded-full blur-[120px]" style={{ willChange: 'opacity' }} />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-[1000px] h-[1000px] bg-graphite/30 rounded-full blur-[150px]" style={{ transform: 'translate(-50%, -50%) translateZ(0)' }} />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />

        <div className="absolute inset-0 vignette" />
        <div className="light-beam" />
      </div>

      {/* Hero Content */}
      <div className="container-cinematic relative z-10 pt-16 pb-8 md:pt-28 md:pb-20">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-2 mb-5 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
            <span className="text-gold text-sm font-medium">UK's Premier Multi-Category Marketplace</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-3 md:mb-4 leading-tight" style={{ willChange: 'opacity' }}>
            Buy &amp; Sell Anything – Products, Pallets and Bulk Deals
          </h1>

          {/* Subheadline */}
          <p className="text-base md:text-xl text-white/60 max-w-2xl mx-auto mb-6 md:mb-10">
            Open marketplace where anyone can buy or sell products across the UK.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-6 md:mb-14">
            {/* PRIMARY CTA */}
            <Link to="/shop" className="btn-primary inline-flex items-center group text-lg px-8 py-4">
              <ShoppingBag className="mr-2 h-6 w-6" />
              Browse Products
              <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Link>
            {/* SECONDARY CTA */}
            <Link to="/register?type=seller" className="btn-glass inline-flex items-center group">
              <Store className="mr-2 h-5 w-5" />
              Sell on Loadify
            </Link>
            {/* TERTIARY CTA */}
            <Link to="/bulk" className="btn-secondary inline-flex items-center group">
              <Package className="mr-2 h-5 w-5" />
              Bulk &amp; Pallet Deals
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Category Panels - 3 main categories — hidden on mobile to get to products faster */}
          <div className="hidden md:grid grid-cols-3 gap-6 lg:gap-8">
            {/* B2C Products Panel */}
            <Link to="/shop" className="group relative overflow-hidden rounded-premium-lg aspect-[16/10] cursor-pointer hero-image-wrapper">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet hero-media">
                <img
                  src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=75&auto=format&fit=max&fm=webp"
                  srcSet="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=480&q=75&auto=format&fit=max&fm=webp 480w,
                          https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=768&q=75&auto=format&fit=max&fm=webp 768w"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt="Shop Products"
                  className="w-full h-full object-cover object-center opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20 mr-3">
                    <ShoppingBag className="h-6 w-6 text-gold" />
                  </div>
                  <span className="badge-gold">B2C</span>
                </div>
                <h2 className="heading-card text-white mb-2">Shop Products</h2>
                <p className="text-white/60 text-sm mb-4">Electronics, fashion, tools, bikes &amp; more</p>
                <span className="text-gold text-sm font-semibold flex items-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Bulk / Pallets Panel */}
            <Link to="/bulk" className="group relative overflow-hidden rounded-premium-lg aspect-[16/10] cursor-pointer hero-image-wrapper">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet hero-media">
                <img
                  src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=75&auto=format&fit=max&fm=webp"
                  srcSet="https://images.unsplash.com/photo-1553413077-190dd305871c?w=480&q=75&auto=format&fit=max&fm=webp 480w,
                          https://images.unsplash.com/photo-1553413077-190dd305871c?w=768&q=75&auto=format&fit=max&fm=webp 768w"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt="Bulk Lots and Pallets"
                  className="w-full h-full object-cover object-top opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20 mr-3">
                    <Package className="h-6 w-6 text-gold" />
                  </div>
                  <span className="badge-gold">B2B</span>
                </div>
                <h2 className="heading-card text-white mb-2">Bulk &amp; Pallets</h2>
                <p className="text-white/60 text-sm mb-4">Pallet lots, liquidation stock &amp; wholesale bundles</p>
                <span className="text-gold text-sm font-semibold flex items-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Browse Bulk Lots <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Sell on Loadify Panel */}
            <Link to="/register?type=seller" className="group relative overflow-hidden rounded-premium-lg aspect-[16/10] cursor-pointer hero-image-wrapper">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet hero-media">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=75&auto=format&fit=max&fm=webp"
                  srcSet="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=480&q=75&auto=format&fit=max&fm=webp 480w,
                          https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=768&q=75&auto=format&fit=max&fm=webp 768w"
                  sizes="(max-width: 768px) 100vw, 33vw"
                  alt="Sell on Loadify"
                  className="w-full h-full object-cover object-center opacity-50 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20 mr-3">
                    <Store className="h-6 w-6 text-gold" />
                  </div>
                  <span className="badge-gold">Sellers</span>
                </div>
                <h2 className="heading-card text-white mb-2">Sell on Loadify</h2>
                <p className="text-white/60 text-sm mb-4">Register, list products &amp; start selling today</p>
                <span className="text-gold text-sm font-semibold flex items-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Start Selling <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-5 md:mt-10 flex flex-wrap items-center justify-center gap-4 md:gap-8 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-gold" />
              Secure Payments
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-gold" />
              Verified Sellers
            </div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gold" />
              Buyer Protection
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gold" />
              UK Based Support
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-jet to-transparent" />
    </section>
  );
}
