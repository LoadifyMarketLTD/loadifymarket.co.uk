import { Link } from 'react-router-dom';
import { Cpu, Shirt, Home, Wrench, Car, Package, ShoppingBag, Sparkles, ArrowRight } from 'lucide-react';

const categories = [
  {
    icon: Cpu,
    label: 'Electronics',
    description: 'Phones, laptops, TVs & more',
    query: 'electronics',
    route: '/shop?category=electronics',
    badge: 'Popular',
  },
  {
    icon: Shirt,
    label: 'Fashion',
    description: 'Clothing, shoes & accessories',
    query: 'fashion',
    route: '/shop?category=fashion',
    badge: 'Trending',
  },
  {
    icon: Home,
    label: 'Home & Garden',
    description: 'Furniture, appliances & décor',
    query: 'home',
    route: '/shop?category=home',
    badge: null,
  },
  {
    icon: Wrench,
    label: 'Tools',
    description: 'Power tools, hand tools & equipment',
    query: 'tools',
    route: '/shop?category=tools',
    badge: null,
  },
  {
    icon: Car,
    label: 'Vehicles',
    description: 'Cars, vans & vehicle parts',
    query: 'vehicles',
    route: '/shop?category=vehicles',
    badge: null,
  },
  {
    icon: Package,
    label: 'Bulk Lots',
    description: 'Liquidation & clearance stock',
    query: 'bulk',
    route: '/bulk?category=bulk',
    badge: 'B2B',
  },
  {
    icon: ShoppingBag,
    label: 'Pallet Deals',
    description: 'Wholesale pallets & job lots',
    query: 'pallet',
    route: '/bulk?category=pallet',
    badge: 'B2B',
  },
  {
    icon: Sparkles,
    label: 'Handmade',
    description: 'Unique handcrafted items',
    query: 'handmade',
    route: '/shop?category=handmade',
    badge: 'Unique',
  },
];

export default function CinematicMarketplaceSwitch() {
  return (
    <section className="py-20 bg-graphite/30">
      <div className="container-cinematic">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="heading-section text-white mb-4">
            Shop by <span className="text-gradient-gold">Category</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Browse thousands of listings across all marketplace categories
          </p>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.label}
                to={cat.route}
                className="card-glass group flex flex-col items-center text-center p-6 hover:scale-[1.03] transition-all duration-300"
              >
                <div className="relative mb-4">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm group-hover:bg-gold/20 transition-colors duration-300">
                    <Icon className="h-7 w-7 text-gold" />
                  </div>
                  {cat.badge && (
                    <span className="absolute -top-2 -right-2 badge-gold text-[10px] px-1.5 py-0.5">
                      {cat.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white mb-1 text-sm">{cat.label}</h3>
                <p className="text-white/50 text-xs leading-relaxed">{cat.description}</p>
                <span className="mt-3 text-gold text-xs font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Browse <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* View All CTA */}
        <div className="text-center mt-12">
          <Link
            to="/catalog"
            className="btn-outline inline-flex items-center gap-2"
          >
            View All Categories
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
