import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu, Shirt, Home, Wrench, Car, Baby, Sparkles, Heart,
  ArrowRight, TrendingUp, Star, Clock,
} from 'lucide-react';

type MarketplaceTab = 'products' | 'featured';

const CATEGORIES = [
  { name: 'Electronics', icon: Cpu, slug: 'electronics', color: 'from-blue-900/50 to-jet', badge: 'Popular' },
  { name: 'Fashion', icon: Shirt, slug: 'fashion', color: 'from-pink-900/50 to-jet', badge: null },
  { name: 'Home & Garden', icon: Home, slug: 'home-garden', color: 'from-green-900/50 to-jet', badge: null },
  { name: 'Tools & DIY', icon: Wrench, slug: 'tools-diy', color: 'from-orange-900/50 to-jet', badge: null },
  { name: 'Automotive', icon: Car, slug: 'automotive', color: 'from-gray-800/60 to-jet', badge: null },
  { name: 'Baby & Kids', icon: Baby, slug: 'baby-kids', color: 'from-yellow-900/50 to-jet', badge: null },
  { name: 'Health & Beauty', icon: Heart, slug: 'health-beauty', color: 'from-rose-900/50 to-jet', badge: null },
  { name: 'Handmade', icon: Sparkles, slug: 'handmade', color: 'from-purple-900/50 to-jet', badge: 'Unique' },
];

const FEATURED_SELLERS = [
  { id: 1, name: 'TechPro UK', rating: 4.9, sales: 1240, badge: 'Active', type: 'Electronics & Tech' },
  { id: 2, name: 'Fashion Forward UK', rating: 4.8, sales: 876, badge: 'Top Seller', type: 'Fashion & Apparel' },
  { id: 3, name: 'Home Essentials Ltd', rating: 4.7, sales: 654, badge: 'Active', type: 'Home & Garden' },
];

export default function CinematicMarketplaceSwitch() {
  const [activeTab, setActiveTab] = useState<MarketplaceTab>('products');

  return (
    <section className="py-20 bg-white/30">
      <div className="container-cinematic">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="heading-section text-gray-900 mb-4">
            Explore the <span className="text-gradient-gold">Marketplace</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Browse products across multiple categories and connect with top sellers
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-12">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-premium-sm font-semibold transition-all duration-300 ${
              activeTab === 'products'
                ? 'bg-gold text-jet shadow-cinematic-gold scale-105'
                : 'bg-white text-white hover:bg-white/80 shadow-cinematic'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('featured')}
            className={`flex items-center justify-center gap-3 px-8 py-4 rounded-premium-sm font-semibold transition-all duration-300 ${
              activeTab === 'featured'
                ? 'bg-gold text-jet shadow-cinematic-gold scale-105'
                : 'bg-white text-white hover:bg-white/80 shadow-cinematic'
            }`}
          >
            <Star className="w-5 h-5" />
            <span>Featured Sellers</span>
          </button>
        </div>

        {/* Category Grid */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-fadeIn">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/shop?category=${cat.slug}`}
                  className={`group relative overflow-hidden rounded-premium-sm bg-gradient-to-br ${cat.color} border border-gray-200 p-6 flex flex-col items-center justify-center text-center hover:border-gold/50 hover:scale-[1.03] transition-all duration-300 min-h-[140px]`}
                >
                  {cat.badge && (
                    <span className="absolute top-3 right-3 text-xs font-semibold bg-gold/20 text-gold border border-gold/30 rounded-full px-2 py-0.5">
                      {cat.badge}
                    </span>
                  )}
                  <div className="w-12 h-12 rounded-premium-sm bg-gold/10 flex items-center justify-center mb-3 group-hover:bg-gold/20 transition-colors">
                    <Icon className="w-6 h-6 text-gold" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{cat.name}</h3>
                </Link>
              );
            })}
          </div>
        )}

        {/* Featured Sellers */}
        {activeTab === 'featured' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            {FEATURED_SELLERS.map((seller) => (
              <div key={seller.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 rounded-premium-sm bg-gold/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-gold">{seller.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 truncate">{seller.name}</h3>
                      <span className="text-xs bg-gold/20 text-gold border border-gold/30 rounded-full px-2 py-0.5 flex-shrink-0">
                        {seller.badge}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{seller.type}</p>
                  </div>
                  {seller.badge && (
                    <span className="absolute -top-2 -right-2 badge-gold text-[10px] px-1.5 py-0.5">
                      {seller.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-gold fill-gold" />
                    <span className="text-gray-900 font-semibold">{seller.rating}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>{seller.sales.toLocaleString()} sales</span>
                  </div>
                  <Link to="/catalog" className="text-gold text-xs font-semibold hover:underline flex items-center gap-1">
                    View Store <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Link
            to={activeTab === 'featured' ? '/catalog' : '/shop'}
            className="btn-outline inline-flex items-center gap-2"
          >
            {activeTab === 'featured' ? 'View All Sellers' : 'Browse All Products'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
