import { Link } from 'react-router-dom';
import { Truck, Package, Sparkles } from 'lucide-react';

export default function CinematicCategoryPanels() {
  const categories = [
    {
      title: 'Logistics Loads',
      description: 'Post loads, find drivers, streamline transport',
      icon: Truck,
      link: '/catalog?listingType=logistics',
      bgGradient: 'from-slate-800 to-slate-900',
      iconColor: 'text-gold-400',
    },
    {
      title: 'Pallets & Wholesale Stock',
      description: 'Clear stock in bulk, verified wholesale buyers',
      icon: Package,
      link: '/catalog?listingType=wholesale',
      bgGradient: 'from-gray-800 to-gray-900',
      iconColor: 'text-gold-400',
    },
    {
      title: 'Handmade & Unique Items',
      description: 'One-of-a-kind artisan creations and crafts',
      icon: Sparkles,
      link: '/catalog?listingType=handmade',
      bgGradient: 'from-amber-900 to-orange-900',
      iconColor: 'text-gold-400',
    },
  ];

  return (
    <section className="py-20 bg-smoke">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <Link
              key={category.title}
              to={category.link}
              className="group relative overflow-hidden rounded-cinematic-lg shadow-cinematic hover:shadow-cinematic-lg transition-all duration-500 hover:scale-105 animate-fadeIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Background with gradient */}
              <div className={`relative h-96 bg-gradient-to-br ${category.bgGradient} overflow-hidden`}>
                {/* Cinematic lighting effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent group-hover:from-black/40 transition-all duration-500"></div>
                
                {/* Light beam effect */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/20 rounded-full blur-3xl group-hover:bg-gold-400/30 transition-all duration-500"></div>
                
                {/* Icon container */}
                <div className="absolute top-8 left-8 z-10">
                  <div className="relative">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-cinematic-md p-4 group-hover:bg-white/20 transition-all duration-300">
                      <category.icon className={`h-12 w-12 ${category.iconColor}`} strokeWidth={1.5} />
                    </div>
                    {/* Icon glow */}
                    <div className="absolute inset-0 bg-gold-400/0 group-hover:bg-gold-400/20 blur-xl transition-all duration-500"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
                  <h3 className="text-2xl font-display font-bold text-white mb-2 group-hover:text-gold-400 transition-colors duration-300">
                    {category.title}
                  </h3>
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                    {category.description}
                  </p>
                  <div className="inline-flex items-center text-gold-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    Explore Now
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Hover zoom effect overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
