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
      title: 'Post a listing',
      description: 'Create your load, pallet, or product listing.',
      link: '/register?type=seller',
    },
    {
      icon: UserPlus,
      title: 'Review offers',
      description: 'Check inquiries and interested parties.',
      link: '/catalog',
    },
    {
      icon: CreditCard,
      title: 'Agree terms',
      description: 'Contact buyer/seller and confirm details.',
      link: '/contact',
    },
    {
      icon: Package,
      title: 'Complete the transaction',
      description: 'Finalize payment and delivery.',
      link: '/help',
    },
    {
      icon: CheckCircle,
      title: 'Leave feedback',
      description: 'Rate your experience.',
      link: '/help',
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
            Simple steps for buying or selling on Loadify Market.
          </p>
        </div>
      </section>

      {/* Steps Section - Compact 2-row grid layout on desktop */}
      <section className="py-12">
        <div className="container-cinematic">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Link
                  key={index}
                  to={step.link}
                  className="card-glass hover:scale-[1.02] transition-all duration-300 block"
                >
                  {/* Step Number and Icon */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-premium-sm bg-gold/10 flex items-center justify-center border-2 border-gold/30 flex-shrink-0">
                      <span className="text-xl font-bold text-gold">{index + 1}</span>
                    </div>
                    <Icon className="w-5 h-5 text-gold" />
                  </div>

                  {/* Step Content */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                    <p className="text-white/60 text-sm">{step.description}</p>
                  </div>
                </Link>
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
                Create Business Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
