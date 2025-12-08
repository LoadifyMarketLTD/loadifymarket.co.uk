import { useState } from 'react';
import { Truck, Package, Sparkles, MapPin, Clock, ArrowRight } from 'lucide-react';

type MarketplaceMode = 'logistics' | 'pallet' | 'handmade';

export default function CinematicMarketplaceSwitch() {
  const [activeMode, setActiveMode] = useState<MarketplaceMode>('logistics');

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Tab buttons */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-12">
          <button
            onClick={() => setActiveMode('logistics')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeMode === 'logistics'
                ? 'bg-navy-800 text-white shadow-xl scale-105'
                : 'bg-white text-navy-800 hover:bg-navy-50 shadow-md'
            }`}
          >
            <Truck className="w-6 h-6" />
            <span className="text-lg">Logistics Jobs</span>
          </button>
          
          <button
            onClick={() => setActiveMode('pallet')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeMode === 'pallet'
                ? 'bg-navy-800 text-white shadow-xl scale-105'
                : 'bg-white text-navy-800 hover:bg-navy-50 shadow-md'
            }`}
          >
            <Package className="w-6 h-6" />
            <span className="text-lg">Pallet & Wholesale</span>
          </button>
          
          <button
            onClick={() => setActiveMode('handmade')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeMode === 'handmade'
                ? 'bg-navy-800 text-white shadow-xl scale-105'
                : 'bg-white text-navy-800 hover:bg-navy-50 shadow-md'
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
                <div key={job.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-navy-100 p-3 rounded-lg">
                        <Truck className="w-8 h-8 text-navy-800" />
                      </div>
                      <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                        Active
                      </span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-navy-900 mb-3">{job.vehicle}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-gold-500" />
                        <span>From: {job.from}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4 text-navy-500" />
                        <span>To: {job.to}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{job.date}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <p className="text-2xl font-bold text-navy-900">£{job.price}</p>
                        <p className="text-xs text-gray-500">Quoted price</p>
                      </div>
                      <button className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-4 py-2 rounded-lg transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pallet & Wholesale */}
          {activeMode === 'pallet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
              {palletStock.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Package className="w-24 h-24 text-gray-400" />
                    </div>
                    <div className="absolute top-3 right-3 bg-navy-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {item.palletCount} Pallets
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-navy-900 mb-2 line-clamp-2">{item.category}</h3>
                    <p className="text-sm text-gray-600 mb-3">RRP: £{item.rrp.toLocaleString()}</p>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold text-navy-900">£{item.price.toLocaleString()}</span>
                      <span className="text-sm text-gray-500">/ lot</span>
                    </div>
                    <button className="w-full bg-navy-800 hover:bg-navy-900 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
                      <span>View Stock</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Handmade & Retail */}
          {activeMode === 'handmade' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
              {handmadeItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden group">
                  <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 relative overflow-hidden">
                    {/* Warm lighting effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-amber-200/40 to-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-20 h-20 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    {/* Unique badge */}
                    <div className="absolute top-3 right-3 bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      {item.badge}
                    </div>
                    {/* Handmade tag */}
                    <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-navy-900 text-xs font-semibold px-3 py-1 rounded-full">
                      Handmade
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-navy-900 mb-2 line-clamp-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-1">{item.artist}</p>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold text-navy-900">£{item.price}</span>
                    </div>
                    <button className="w-full bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-600 hover:to-amber-600 text-navy-900 font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                      <span>View Item</span>
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    category: 'Clothing - Women\'s Fashion',
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
  {
    id: 5,
    category: 'Office Supplies Bulk',
    palletCount: 2,
    rrp: 6000,
    price: 2199,
  },
  {
    id: 6,
    category: 'Sports & Outdoor Gear',
    palletCount: 4,
    rrp: 11000,
    price: 3999,
  },
  {
    id: 7,
    category: 'Beauty & Cosmetics',
    palletCount: 3,
    rrp: 8500,
    price: 2999,
  },
  {
    id: 8,
    category: 'Pet Supplies Collection',
    palletCount: 2,
    rrp: 5500,
    price: 1899,
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
  {
    id: 5,
    title: 'Hand-painted Canvas',
    artist: 'Urban Art Gallery',
    price: 95,
    badge: 'Unique',
  },
  {
    id: 6,
    title: 'Macramé Plant Hanger',
    artist: 'Bohemian Threads',
    price: 32,
    badge: '1 of 5',
  },
  {
    id: 7,
    title: 'Leather Journal – Vintage',
    artist: 'Craft & Bind',
    price: 58,
    badge: 'Unique',
  },
  {
    id: 8,
    title: 'Glass Terrarium Set',
    artist: 'Green Home Studio',
    price: 42,
    badge: '1 of 4',
  },
];
