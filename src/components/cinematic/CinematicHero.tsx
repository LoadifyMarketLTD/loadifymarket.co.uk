import { Link } from 'react-router-dom';

export default function CinematicHero() {
  return (
    <section className="relative bg-gradient-to-br from-jet via-graphite to-jet overflow-hidden min-h-[700px] flex items-center">
      {/* Light beam effects - warm tones */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-to-br from-gold-400/40 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-gradient-to-tr from-gold-400/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: 'linear-gradient(rgba(212, 175, 55, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 175, 55, 0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-20 lg:py-28 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          {/* Main Content */}
          <div className="space-y-8 animate-fadeIn">
            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-white leading-tight text-shadow-lg">
              Your Marketplace for
              <br />
              <span className="text-gold-400">Logistics, Stock & Handmade Goods</span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl lg:text-3xl text-gray-300 max-w-4xl mx-auto leading-relaxed text-shadow-md">
              From pallets to unique handmade art — everything in one place
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8 animate-slideUp">
              <Link 
                to="/catalog" 
                className="inline-flex items-center justify-center px-10 py-5 bg-gold-400 hover:bg-gold-500 text-jet font-display font-bold rounded-cinematic-md shadow-cinematic hover:shadow-cinematic-glow transition-all duration-300 hover:scale-105 text-lg"
              >
                Explore Marketplace
              </Link>
              <Link 
                to="/register?type=seller" 
                className="inline-flex items-center justify-center px-10 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-cinematic border-2 border-white/30 hover:border-white text-white font-display font-bold rounded-cinematic-md shadow-cinematic transition-all duration-300 hover:scale-105 text-lg"
              >
                Sell on Loadify Market
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade to next section */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-smoke to-transparent"></div>
    </section>
  );
}
