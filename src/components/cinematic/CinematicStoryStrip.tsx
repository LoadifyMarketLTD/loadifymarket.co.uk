import { Link } from 'react-router-dom';
import { Upload, MessageSquare, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';

export default function CinematicStoryStrip() {
  const steps = [
    {
      id: 1,
      icon: Upload,
      title: 'Post a load or product',
      description: 'List your logistics job, pallet stock, or handmade item in minutes',
    },
    {
      id: 2,
      icon: MessageSquare,
      title: 'Get offers from drivers or buyers',
      description: 'Connect with verified drivers and buyers in our trusted network',
    },
    {
      id: 3,
      icon: TrendingUp,
      title: 'Track jobs & orders live',
      description: 'Real-time updates from pickup to delivery with full transparency',
    },
    {
      id: 4,
      icon: DollarSign,
      title: 'Get paid securely',
      description: 'Safe, protected payments with automatic seller payouts',
    },
  ];

  return (
    <section className="py-20 bg-jet">
      <div className="container-cinematic">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="heading-section text-white mb-4">
            How It <span className="text-gradient-gold">Works</span>
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            From listing to payment, we've streamlined every step of your marketplace journey
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative group">
                {/* Connector line (hidden on mobile, shown on desktop except for last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-gold/50 to-gold/10 z-0" />
                )}

                {/* Card */}
                <div className="relative card-glass hover:scale-[1.03] transition-all duration-500 z-10 text-center">
                  {/* Step number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-gold text-jet rounded-full flex items-center justify-center font-bold text-sm shadow-cinematic-gold">
                    {step.id}
                  </div>

                  {/* Icon */}
                  <div className="mt-4 mb-6 inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm group-hover:bg-gold/20 transition-colors duration-300">
                    <Icon className="w-8 h-8 text-gold" strokeWidth={1.5} />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-white mb-3 leading-tight">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/50 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Link
            to="/register"
            className="btn-primary inline-flex items-center gap-2"
          >
            Get Started Today
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
