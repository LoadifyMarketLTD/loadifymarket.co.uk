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
      description: 'Unique folded book sculpture with LED warm lights',
      badge: '1 of 1',
    },
    {
      id: 2,
      title: 'Ceramic Vase – Ocean Wave',
      artist: 'Coastal Ceramics',
      price: 68,
      description: 'Hand-thrown ceramic with ocean-inspired glaze',
      badge: 'Unique',
    },
    {
      id: 3,
      title: 'Knitted Wool Throw Blanket',
      artist: 'Cozy Threads Co.',
      price: 85,
      description: 'Chunky knit throw in natural wool',
      badge: '1 of 3',
    },
    {
      id: 4,
      title: 'Wooden Wall Art – Forest Scene',
      artist: 'Nature & Wood Works',
      price: 120,
      description: 'Layered wood art with natural edge',
      badge: '1 of 1',
    },
    {
      id: 5,
      title: 'Hand-Painted Canvas – Sunset',
      artist: 'Urban Art Gallery',
      price: 95,
      description: 'Abstract sunset in warm acrylics',
      badge: 'Unique',
    },
    {
      id: 6,
      title: 'Macramé Plant Hanger Set',
      artist: 'Bohemian Threads',
      price: 32,
      description: 'Set of 3 handmade cotton plant hangers',
      badge: '1 of 5',
    },
  ];

  return (
    <section className="py-20 bg-graphite/50">
      <div className="container-cinematic">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/30 mb-6">
            <Sparkles className="w-5 h-5 text-gold" />
            <span className="text-sm font-medium text-gold">Curated for You</span>
          </div>

          <h2 className="heading-section text-white mb-4">
            Daily Trending <span className="text-gradient-gold">Handmade</span>
          </h2>

          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Discover one-of-a-kind artisan pieces crafted with care. Each item tells a unique story.
          </p>
        </div>

        {/* Featured Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {trendingItems.map((item) => (
            <div
              key={item.id}
              className="card-product group"
            >
              {/* Image area with warm lighting effect */}
              <div className="relative aspect-square bg-gradient-to-br from-graphite to-jet overflow-hidden">
                {/* Warm light overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-gold/20 via-transparent to-transparent" />

                {/* Center icon placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gold/20 group-hover:text-gold/40 transition-colors duration-500">
                    <Sparkles className="w-32 h-32 group-hover:scale-110 transition-transform duration-700" />
                  </div>
                </div>

                {/* Unique badge */}
                <div className="absolute top-4 right-4 badge-premium">
                  {item.badge}
                </div>

                {/* Handmade tag */}
                <div className="absolute bottom-4 left-4 badge-gold">
                  Handmade
                </div>

                {/* Quick action buttons - appear on hover */}
                <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-gold hover:text-jet transition-all duration-300 shadow-lg">
                    <Heart className="w-5 h-5" />
                  </button>
                  <button className="p-3 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-gold hover:text-jet transition-all duration-300 shadow-lg">
                    <ShoppingBag className="w-5 h-5" />
                  </button>
                </div>

                {/* Gradient overlay */}
                <div className="card-product-overlay" />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-2 group-hover:text-gold transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-sm text-white/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-gold" />
                    By {item.artist}
                  </p>
                </div>

                <p className="text-sm text-white/50 mb-4 line-clamp-2">
                  {item.description}
                </p>

                <div className="flex items-center justify-between">
                  <span className="price-tag">£{item.price}</span>
                  <Link
                    to={`/product/${item.id}`}
                    className="btn-glass py-2 px-4 text-sm flex items-center gap-2"
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
            className="btn-primary inline-flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            <span>Explore All Handmade Items</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="card-glass">
            <div className="text-3xl font-bold text-gold mb-2">100%</div>
            <p className="text-white/60">Authentic Handmade</p>
          </div>
          <div className="card-glass">
            <div className="text-3xl font-bold text-gold mb-2">500+</div>
            <p className="text-white/60">Verified Artisans</p>
          </div>
          <div className="card-glass">
            <div className="text-3xl font-bold text-gold mb-2">14 Days</div>
            <p className="text-white/60">Satisfaction Guarantee</p>
          </div>
        </div>
      </div>
    </section>
  );
}
