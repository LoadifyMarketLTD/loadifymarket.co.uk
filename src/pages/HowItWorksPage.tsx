import { Link } from 'react-router-dom';
import {
  Search,
  UserPlus,
  CreditCard,
  Package,
  CheckCircle,
} from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      icon: Search,
      title: 'Find a listing',
      description: 'Browse loads, pallets, or products.',
    },
    {
      icon: UserPlus,
      title: 'Review seller details',
      description: 'Check verification and payment behaviour.',
    },
    {
      icon: CreditCard,
      title: 'Agree terms',
      description: 'Contact seller and confirm transaction.',
    },
    {
      icon: Package,
      title: 'Complete transaction',
      description: 'Secure checkout with tracking.',
    },
    {
      icon: CheckCircle,
      title: 'Leave feedback',
      description: 'Rate your experience.',
    },
  ];

  return (
    <div className="bg-jet min-h-screen py-12">
      {/* Header Section */}
      <section className="py-12 bg-graphite/30">
        <div className="container-cinematic text-center">
          <h1 className="heading-hero text-white mb-6">
            How It Works
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto">
            Simple steps to buy or sell on LoadifyMarket.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16">
        <div className="container-cinematic">
          <div className="max-w-4xl mx-auto space-y-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-6 card-glass hover:scale-[1.01] transition-all duration-300"
                >
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-premium-sm bg-gold/10 flex items-center justify-center border-2 border-gold/30">
                      <span className="text-2xl font-bold text-gold">{index + 1}</span>
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 pt-2">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-gold" />
                      <h3 className="text-xl font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="text-white/60">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12">
        <div className="container-cinematic">
          <div className="card-glass max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-white mb-6">
              Ready to Get Started?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/catalog" className="btn-primary">
                Browse Catalog
              </Link>
              <Link to="/register?type=seller" className="btn-secondary">
                Become a Seller
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
