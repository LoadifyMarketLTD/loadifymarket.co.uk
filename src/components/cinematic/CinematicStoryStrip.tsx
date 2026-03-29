import { Link } from 'react-router-dom';
import { Search, ShoppingCart, CreditCard, PackageCheck, Truck, Star, ArrowRight } from 'lucide-react';

export default function CinematicStoryStrip() {
  const steps = [
    {
      id: 1,
      icon: Search,
      title: 'Browse & Discover',
      description: 'Search products across all categories from independent UK sellers',
      link: '/shop',
    },
    {
      id: 2,
      icon: ShoppingCart,
      title: 'Add to Cart',
      description: 'Select items, compare sellers, and add to your secure cart',
      link: '/shop',
    },
    {
      id: 3,
      icon: CreditCard,
      title: 'Secure Checkout',
      description: 'Pay safely with Stripe. Buyer protection on every order',
      link: '/checkout',
    },
    {
      id: 4,
      icon: PackageCheck,
      title: 'Order Confirmed',
      description: 'Receive instant confirmation and automated invoice',
      link: '/orders',
    },
    {
      id: 5,
      icon: Truck,
      title: 'Shipped & Tracked',
      description: 'Full order tracking from dispatch to delivery',
      link: '/track-order',
    },
    {
      id: 6,
      icon: Star,
      title: 'Review & Rate',
      description: 'Leave a review and help other buyers make informed decisions',
      link: '/orders',
    },
  ];

  return (
    <section className="py-20 bg-[#F8F9FA]">
      <div className="container-cinematic">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="heading-section text-gray-900 mb-4">
            How It <span className="text-gradient-gold">Works</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            From browsing to delivery – a simple, secure marketplace experience
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Link key={step.id} to={step.link} className="relative card-glass hover:scale-[1.03] transition-all duration-500 group text-center block">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-gold text-jet rounded-full flex items-center justify-center font-bold text-sm shadow-cinematic-gold">
                  {step.id}
                </div>

                {/* Icon */}
                <div className="mt-4 mb-5 inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm group-hover:bg-gold/20 transition-colors duration-300">
                  <Icon className="w-7 h-7 text-gold" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {step.description}
                </p>

                {/* Connector dot for sequence */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 items-center z-10">
                    <div className="w-6 h-6 rounded-full bg-gold/30 border border-gold/50 flex items-center justify-center">
                      <ArrowRight className="w-3 h-3 text-gold" />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/register"
            className="btn-primary inline-flex items-center gap-2"
          >
            Start Shopping Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
