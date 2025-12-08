import { Link } from 'react-router-dom';
import { Truck, Package, Sparkles, MapPin, Navigation } from 'lucide-react';

export default function CinematicHero() {
  return (
    <section className="relative bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 overflow-hidden min-h-[600px]">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(245, 158, 11, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 158, 11, 0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-navy-600 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-16 lg:py-24 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left side: Content */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="block">Loadify Market</span>
                <span className="block text-gold-400 mt-2">Your Everything Marketplace</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed">
                Marketplace for Logistics, Pallet Stock & Handmade Goods
              </p>
            </div>

            {/* Bullet points */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Truck className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-200">Post loads & find drivers in seconds</p>
              </div>
              <div className="flex items-start gap-3">
                <Package className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-200">Clear pallet stock to verified buyers</p>
              </div>
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-gold-400 flex-shrink-0 mt-1" />
                <p className="text-lg text-gray-200">Sell unique handmade pieces, one by one</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                to="/catalog?type=logistics" 
                className="inline-flex items-center justify-center px-8 py-4 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-lg"
              >
                <Truck className="w-5 h-5 mr-2" />
                Post a Load
              </Link>
              <Link 
                to="/register?type=seller" 
                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border-2 border-white/30 hover:border-white text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 text-lg"
              >
                <Package className="w-5 h-5 mr-2" />
                Start Selling Products
              </Link>
            </div>
          </div>

          {/* Right side: Cinematic visual composition */}
          <div className="relative hidden lg:block">
            <div className="relative w-full h-[500px]">
              {/* Main logistics visual - Van/Truck */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full">
                <div className="relative">
                  {/* Map/Grid background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full bg-gradient-to-br from-gold-500/20 to-transparent rounded-2xl" style={{
                      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.2) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)'
                    }}>
                      {/* Route lines */}
                      <svg className="w-full h-full" viewBox="0 0 400 400">
                        <path d="M 50 200 Q 150 100, 250 200" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="2" fill="none" strokeDasharray="5,5">
                          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
                        </path>
                        <path d="M 250 200 Q 300 250, 350 200" stroke="rgba(245, 158, 11, 0.3)" strokeWidth="2" fill="none" strokeDasharray="5,5">
                          <animate attributeName="stroke-dashoffset" from="0" to="10" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                    </div>
                  </div>

                  {/* Central truck/van illustration */}
                  <div className="relative z-10 flex items-center justify-center">
                    <div className="bg-gradient-to-br from-gold-500 to-gold-600 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                      <div className="relative">
                        <Truck className="w-40 h-40 text-navy-900" strokeWidth={1.5} />
                        {/* Animated route indicator */}
                        <div className="absolute -top-6 -right-6 bg-green-500 text-white rounded-full p-3 shadow-lg animate-bounce">
                          <Navigation className="w-6 h-6" />
                        </div>
                        {/* Map pin indicators */}
                        <div className="absolute -bottom-4 -left-4 bg-navy-800 text-gold-400 rounded-full p-2 shadow-lg">
                          <MapPin className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Handmade products collage card - bottom right */}
                  <div className="absolute bottom-0 right-0 transform translate-x-8 translate-y-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-4 w-64 transform hover:scale-105 transition-transform duration-300">
                      <div className="space-y-3">
                        {/* Warm handmade item preview */}
                        <div className="relative h-40 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-16 h-16 text-amber-600 opacity-40" />
                          </div>
                          <div className="absolute top-2 right-2 bg-gold-500 text-navy-900 text-xs font-semibold px-2 py-1 rounded-full">
                            1 of 1
                          </div>
                          {/* Warm light glow effect */}
                          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-amber-200/80 to-transparent"></div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-gray-800">Handmade Collection</p>
                          <p className="text-xs text-gray-600">Unique artisan pieces</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pallet/wholesale card - top left */}
                  <div className="absolute top-0 left-0 transform -translate-x-8 -translate-y-4">
                    <div className="bg-navy-800 rounded-xl shadow-2xl p-4 w-48 transform hover:scale-105 transition-transform duration-300">
                      <div className="space-y-2">
                        <Package className="w-10 h-10 text-gold-400" />
                        <p className="text-sm font-semibold text-white">Pallet Stock</p>
                        <p className="text-xs text-gray-400">Wholesale quantities</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-bold text-gold-400">£2,499</span>
                          <span className="text-xs text-gray-400">/ pallet</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
