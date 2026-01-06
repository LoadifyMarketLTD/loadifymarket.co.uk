import { Link } from 'react-router-dom';
import { Truck, Package, Sparkles, ArrowRight } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="relative min-h-[70vh] bg-jet overflow-hidden flex items-center">
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large gradient orbs for cinematic lighting */}
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-gold/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px]" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-graphite/30 rounded-full blur-[150px]" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />

        {/* Vignette effect */}
        <div className="absolute inset-0 vignette" />

        {/* Light beam effect */}
        <div className="light-beam" />
      </div>

      {/* Hero Content */}
      <div className="container-cinematic relative z-10 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline - Reduced by ~20% */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 animate-fadeInUp leading-tight" style={{ animationDelay: '0.1s' }}>
            Find verified logistics loads and wholesale stock.
          </h1>

          {/* Subheadline - Single direct line */}
          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Connect with brokers, carriers, and sellers.
          </p>

          {/* CTA Buttons - ONE Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            {/* PRIMARY CTA */}
            <Link to="/catalog?type=logistics" className="btn-primary inline-flex items-center group text-lg px-8 py-4">
              <Truck className="mr-2 h-6 w-6" />
              Find Loads
              <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
            </Link>
            {/* SECONDARY CTA */}
            <Link to="/catalog?type=pallet" className="btn-secondary inline-flex items-center group">
              <Package className="mr-2 h-5 w-5" />
              Buy Pallets / Job Lots
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          {/* Tertiary CTA - Link style only */}
          <div className="flex items-center justify-center mb-20 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            <Link to="/register?type=seller" className="text-white/60 hover:text-gold transition-colors text-sm underline">
              Sell / Post a Listing
            </Link>
          </div>

          {/* Category Panels - 2 main + 1 smaller */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
            {/* Logistics Loads Panel */}
            <Link to="/catalog?type=logistics" className="group relative overflow-hidden rounded-premium-lg aspect-[4/3] cursor-pointer hero-image-wrapper">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet hero-media">
                <img
                  src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80"
                  alt="Logistics and Freight"
                  className="w-full h-full object-cover opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20 mr-3">
                    <Truck className="h-6 w-6 text-gold" />
                  </div>
                  <span className="badge-gold">Logistics</span>
                </div>
                <h3 className="heading-card text-white mb-2">Logistics Loads</h3>
                <p className="text-white/60 text-sm mb-4">Post loads & find verified drivers instantly</p>
                <span className="text-gold text-sm font-semibold flex items-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Browse Loads <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </div>
            </Link>

            {/* Pallets & Stock Panel */}
            <Link to="/catalog?type=pallet" className="group relative overflow-hidden rounded-premium-lg aspect-[4/3] cursor-pointer hero-image-wrapper">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet hero-media">
                <img
                  src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80"
                  alt="Warehouse Pallets"
                  className="w-full h-full object-cover opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20 mr-3">
                    <Package className="h-6 w-6 text-gold" />
                  </div>
                  <span className="badge-gold">Wholesale</span>
                </div>
                <h3 className="heading-card text-white mb-2">Pallets & Wholesale Stock</h3>
                <p className="text-white/60 text-sm mb-4">Clear stock to verified buyers worldwide</p>
                <span className="text-gold text-sm font-semibold flex items-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Browse Stock <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>

          {/* Handmade Panel - Smaller, Secondary */}
          <div className="max-w-md mx-auto mt-6 animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
            <Link to="/catalog?type=handmade" className="group relative overflow-hidden rounded-premium-lg aspect-[16/9] cursor-pointer opacity-80 hover:opacity-100 transition-opacity hero-image-wrapper">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet hero-media">
                <img
                  src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80"
                  alt="Handmade Crafts"
                  className="w-full h-full object-cover opacity-50 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20">
                    <Sparkles className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Handmade & Retail</h3>
                    <p className="text-white/50 text-xs">Browse unique items</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-white/70 text-sm animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              Verified Business Roles
            </div>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              Broker, Carrier, Seller
            </div>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              UK Based Support
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade to content */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-jet to-transparent" />
    </section>
  );
}
