import { Link } from 'react-router-dom';
import { Sparkles, Heart, ShoppingBag, ArrowRight } from 'lucide-react';

export default function DailyTrendingHandmade() {
  // Featured handmade items with warm, artisan aesthetic
  const trendingItems = [
    {
      id: 1,
      title: 'Handmade Book Art – Warm Lights',
      artist: 'Paper & Light Studio',
      price: 45,
      image: 'warm-book-art',
      description: 'Unique folded book sculpture with LED warm lights',
      badge: '1 of 1',
    },
    {
      id: 2,
      title: 'Ceramic Vase – Ocean Wave',
      artist: 'Coastal Ceramics',
      price: 68,
      image: 'ceramic-vase',
      description: 'Hand-thrown ceramic with ocean-inspired glaze',
      badge: 'Unique',
    },
    {
      id: 3,
      title: 'Knitted Wool Throw Blanket',
      artist: 'Cozy Threads Co.',
      price: 85,
      image: 'wool-blanket',
      description: 'Chunky knit throw in natural wool',
      badge: '1 of 3',
    },
    {
      id: 4,
      title: 'Wooden Wall Art – Forest Scene',
      artist: 'Nature & Wood Works',
      price: 120,
      image: 'wood-art',
      description: 'Layered wood art with natural edge',
      badge: '1 of 1',
    },
    {
      id: 5,
      title: 'Hand-Painted Canvas – Sunset',
      artist: 'Urban Art Gallery',
      price: 95,
      image: 'canvas-painting',
      description: 'Abstract sunset in warm acrylics',
      badge: 'Unique',
    },
    {
      id: 6,
      title: 'Macramé Plant Hanger Set',
      artist: 'Bohemian Threads',
      price: 32,
      image: 'macrame',
      description: 'Set of 3 handmade cotton plant hangers',
      badge: '1 of 5',
    },
  ];

  // Warm color schemes for different items
  const warmGradients = [
    'from-amber-100 to-orange-100',
    'from-rose-100 to-pink-100',
    'from-yellow-100 to-amber-100',
    'from-orange-100 to-red-100',
    'from-amber-50 to-yellow-100',
    'from-pink-100 to-rose-100',
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-amber-50 via-white to-orange-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white px-6 py-2 rounded-full shadow-sm mb-4">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">Curated for You</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-navy-900 mb-4">
            Daily Trending <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600">Handmade</span>
          </h2>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover one-of-a-kind artisan pieces crafted with care. Each item tells a unique story.
          </p>
        </div>

        {/* Featured Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {trendingItems.map((item, index) => (
            <div
              key={item.id}
              className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              {/* Image area with warm lighting effect */}
              <div className={`relative aspect-square bg-gradient-to-br ${warmGradients[index]} overflow-hidden`}>
                {/* Warm light overlay - simulating warm studio lighting */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-200/40 via-transparent to-transparent"></div>
                
                {/* Center icon placeholder (in production, this would be actual product photo) */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-amber-600/30">
                    <Sparkles className="w-32 h-32 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>

                {/* Unique badge */}
                <div className="absolute top-4 right-4 bg-gold-500 text-navy-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                  {item.badge}
                </div>

                {/* Handmade tag */}
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-navy-900 text-xs font-semibold px-3 py-1 rounded-full">
                  🎨 Handmade
                </div>

                {/* Quick action buttons - appear on hover */}
                <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/10 transition-colors duration-300 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button className="bg-white text-navy-900 p-3 rounded-full shadow-lg hover:bg-gold-500 transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="bg-white text-navy-900 p-3 rounded-full shadow-lg hover:bg-gold-500 transition-colors">
                    <ShoppingBag className="w-5 h-5" />
                  </button>
                </div>

                {/* Warm glow effect on hover */}
                <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-40 h-40 bg-amber-300/40 rounded-full blur-3xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100"></div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-navy-900 mb-1 line-clamp-2 group-hover:text-amber-700 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    By {item.artist}
                  </p>
                </div>

                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-navy-900">£{item.price}</span>
                  </div>
                  <Link
                    to={`/product/${item.id}`}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    View
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Link
            to="/catalog?listingType=handmade"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold px-8 py-4 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Sparkles className="w-6 h-6" />
            <span>Explore All Handmade Items</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-amber-600 mb-2">100%</div>
            <p className="text-gray-600">Authentic Handmade</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-600 mb-2">500+</div>
            <p className="text-gray-600">Verified Artisans</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-amber-600 mb-2">14 Days</div>
            <p className="text-gray-600">Satisfaction Guarantee</p>
          </div>
        </div>
      </div>
    </section>
  );
}
