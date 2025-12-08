import { Link } from 'react-router-dom';
import { Truck, Package, Sparkles, ArrowRight, Play } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="relative min-h-screen bg-jet overflow-hidden flex items-center">
      {/* Cinematic Background Effects */}
      <div className="absolute inset-0">
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
      <div className="container-cinematic relative z-10 pt-32 pb-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gold/10 border border-gold/30 mb-8 animate-fadeInUp">
            <span className="w-2 h-2 bg-gold rounded-full mr-3 animate-pulse" />
            <span className="text-gold text-sm font-medium">UK's Premier B2B & B2C Marketplace</span>
          </div>

          {/* Main Headline */}
          <h1 className="heading-hero text-white mb-6 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            Your Marketplace for{' '}
            <span className="text-gradient-gold">Logistics</span>,{' '}
            <span className="text-gradient-gold">Stock</span> &{' '}
            <span className="text-gradient-gold">Handmade</span> Goods
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto mb-12 leading-relaxed animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            From pallets to unique handmade art — everything in one place.
            Connect with verified buyers and sellers across the UK.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
            <Link to="/catalog" className="btn-primary inline-flex items-center group">
              Explore Marketplace
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/register?type=seller" className="btn-secondary inline-flex items-center">
              <Play className="mr-2 h-5 w-5" />
              Sell on Loadify Market
            </Link>
          </div>

          {/* Category Panels */}
          <div className="category-grid animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
            {/* Logistics Loads Panel */}
            <Link to="/catalog?type=logistics" className="group relative overflow-hidden rounded-premium-lg aspect-[4/3] cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet">
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
            <Link to="/catalog?type=pallet" className="group relative overflow-hidden rounded-premium-lg aspect-[4/3] cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet">
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

            {/* Handmade Panel */}
            <Link to="/catalog?type=handmade" className="group relative overflow-hidden rounded-premium-lg aspect-[4/3] cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-graphite to-jet">
                <img
                  src="https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=600&q=80"
                  alt="Handmade Crafts"
                  className="w-full h-full object-cover opacity-60 transition-all duration-700 group-hover:scale-110 group-hover:opacity-40"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-overlay" />
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center mb-3">
                  <div className="p-2 rounded-premium-sm bg-gold/20 mr-3">
                    <Sparkles className="h-6 w-6 text-gold" />
                  </div>
                  <span className="badge-gold">Handmade</span>
                </div>
                <h3 className="heading-card text-white mb-2">Handmade & Unique Items</h3>
                <p className="text-white/60 text-sm mb-4">Discover one-of-a-kind artisan pieces</p>
                <span className="text-gold text-sm font-semibold flex items-center opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                  Browse Handmade <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-white/40 text-sm animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              Verified Sellers
            </div>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              Secure Payments
            </div>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              UK Based Support
            </div>
            <div className="flex items-center">
              <span className="text-gold mr-2">✓</span>
              Buyer Protection
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade to content */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-jet to-transparent" />
    </section>
  );
}
