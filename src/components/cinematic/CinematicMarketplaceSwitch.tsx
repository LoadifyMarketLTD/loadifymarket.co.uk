import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Package, Sparkles, MapPin, Clock, ArrowRight } from 'lucide-react';

type MarketplaceMode = 'logistics' | 'pallet' | 'handmade';

export default function CinematicMarketplaceSwitch() {
  const [activeMode, setActiveMode] = useState<MarketplaceMode>('logistics');

  return (
    <section className="py-20 bg-graphite/30">
      <div className="container-cinematic">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="heading-section text-white mb-4">
            Browse by <span className="text-gradient-gold">Category</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Explore our curated marketplace sections tailored to your needs
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-12">
          <button
            onClick={() => setActiveMode('logistics')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-premium-sm font-semibold transition-all duration-300 ${
              activeMode === 'logistics'
                ? 'bg-gold text-jet shadow-cinematic-gold scale-105'
                : 'bg-graphite text-white hover:bg-graphite/80 shadow-cinematic'
            }`}
          >
            <Truck className="w-6 h-6" />
            <span className="text-lg">Logistics Jobs</span>
          </button>

          <button
            onClick={() => setActiveMode('pallet')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-premium-sm font-semibold transition-all duration-300 ${
              activeMode === 'pallet'
                ? 'bg-gold text-jet shadow-cinematic-gold scale-105'
                : 'bg-graphite text-white hover:bg-graphite/80 shadow-cinematic'
            }`}
          >
            <Package className="w-6 h-6" />
            <span className="text-lg">Pallet & Wholesale</span>
          </button>

          <button
            onClick={() => setActiveMode('handmade')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-premium-sm font-semibold transition-all duration-300 ${
              activeMode === 'handmade'
                ? 'bg-gold text-jet shadow-cinematic-gold scale-105'
                : 'bg-graphite text-white hover:bg-graphite/80 shadow-cinematic'
            }`}
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-lg">Handmade & Retail</span>
          </button>
        </div>

        {/* Content area */}
        <div className="mt-8">
          {/* Logistics Jobs */}
          {activeMode === 'logistics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
              {logisticsJobs.map((job) => (
                <div key={job.id} className="card-glass hover:scale-[1.02] transition-all duration-500 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-premium-sm bg-gold/20">
                      <Truck className="w-8 h-8 text-gold" />
                    </div>
                    <span className="badge-stock">Active</span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-3">{job.vehicle}</h3>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <MapPin className="w-4 h-4 text-gold" />
                      <span>From: {job.from}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <MapPin className="w-4 h-4 text-white/40" />
                      <span>To: {job.to}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <Clock className="w-4 h-4 text-white/40" />
                      <span>{job.date}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      <p className="price-tag">£{job.price}</p>
                      <p className="text-xs text-white/40">Quoted price</p>
                    </div>
                    <Link to={`/catalog?type=logistics`} className="btn-glass py-2 px-4 text-sm">
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pallet & Wholesale */}
          {activeMode === 'pallet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
              {palletStock.map((item) => (
                <div key={item.id} className="card-product group">
                  <div className="aspect-square bg-gradient-to-br from-graphite to-jet relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-24 h-24 text-white/20 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="absolute top-3 right-3 badge-gold">
                      {item.palletCount} Pallets
                    </div>
                    <div className="card-product-overlay" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white mb-2 line-clamp-2">{item.category}</h3>
                    <p className="text-sm text-white/40 mb-3">RRP: £{item.rrp.toLocaleString()}</p>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="price-tag">£{item.price.toLocaleString()}</span>
                      <span className="text-sm text-white/40">/ lot</span>
                    </div>
                    <Link to={`/catalog?type=pallet`} className="w-full btn-glass py-3 text-sm flex items-center justify-center gap-2">
                      <span>View Stock</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Handmade & Retail */}
          {activeMode === 'handmade' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
              {handmadeItems.map((item) => (
                <div key={item.id} className="card-product group">
                  <div className="aspect-square bg-gradient-to-br from-graphite to-jet relative overflow-hidden">
                    {/* Warm lighting effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gold/10 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-20 h-20 text-gold/30 group-hover:scale-110 group-hover:text-gold/50 transition-all duration-500" />
                    </div>
                    {/* Unique badge */}
                    <div className="absolute top-3 right-3 badge-premium">
                      {item.badge}
                    </div>
                    {/* Handmade tag */}
                    <div className="absolute bottom-3 left-3 badge-gold">
                      Handmade
                    </div>
                    <div className="card-product-overlay" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-sm text-white/40 mb-3 line-clamp-1">{item.artist}</p>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="price-tag">£{item.price}</span>
                    </div>
                    <Link to={`/catalog?type=handmade`} className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
                      <span>View Item</span>
                      <Sparkles className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Link
            to="/catalog"
            className="btn-outline inline-flex items-center gap-2"
          >
            Browse All Products
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// Sample data - Logistics Jobs
const logisticsJobs = [
  {
    id: 1,
    vehicle: 'Sprinter Van',
    from: 'London',
    to: 'Manchester',
    date: 'Tomorrow, 8:00 AM',
    price: 180,
  },
  {
    id: 2,
    vehicle: '7.5T Truck',
    from: 'Birmingham',
    to: 'Leeds',
    date: 'Dec 10, 2:00 PM',
    price: 320,
  },
  {
    id: 3,
    vehicle: 'Luton Van',
    from: 'Bristol',
    to: 'Liverpool',
    date: 'Dec 11, 10:00 AM',
    price: 220,
  },
];

// Sample data - Pallet Stock
const palletStock = [
  {
    id: 1,
    category: 'Electronics Mixed Lot',
    palletCount: 4,
    rrp: 12500,
    price: 4999,
  },
  {
    id: 2,
    category: "Clothing - Women's Fashion",
    palletCount: 6,
    rrp: 18000,
    price: 6499,
  },
  {
    id: 3,
    category: 'Home & Kitchen Appliances',
    palletCount: 3,
    rrp: 9500,
    price: 3299,
  },
  {
    id: 4,
    category: 'Toys & Games Clearance',
    palletCount: 5,
    rrp: 15000,
    price: 4999,
  },
];

// Sample data - Handmade Items
const handmadeItems = [
  {
    id: 1,
    title: 'Handmade Book Art – Warm Lights',
    artist: 'Artisan Crafts',
    price: 45,
    badge: '1 of 1',
  },
  {
    id: 2,
    title: 'Ceramic Vase – Ocean Blue',
    artist: 'Studio Ceramics',
    price: 68,
    badge: 'Unique',
  },
  {
    id: 3,
    title: 'Knitted Wool Blanket',
    artist: 'Cozy Creations',
    price: 85,
    badge: '1 of 3',
  },
  {
    id: 4,
    title: 'Wooden Wall Art – Forest',
    artist: 'Nature & Wood',
    price: 120,
    badge: '1 of 1',
  },
];
