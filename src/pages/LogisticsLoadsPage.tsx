import { Link } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Shield,
  Clock,
  ArrowRight,
  CheckCircle,
  Package,
  Users,
  TrendingUp,
} from 'lucide-react';

export default function LogisticsLoadsPage() {
  const benefits = [
    {
      icon: Shield,
      title: 'Verified Carriers & Brokers',
      description:
        'Every carrier and broker on XDrive Logistics Market by XDrive Logistics Ltd is manually reviewed. Post with confidence knowing your load reaches trusted professionals.',
    },
    {
      icon: Clock,
      title: 'Fast Load Matching',
      description:
        'Instant visibility to a network of verified drivers and carriers across the UK. Fill your loads quickly and efficiently.',
    },
    {
      icon: MapPin,
      title: 'Nationwide Coverage',
      description:
        'From London to Edinburgh, we connect shippers and carriers across England, Scotland, Wales, and Northern Ireland.',
    },
    {
      icon: TrendingUp,
      title: 'Competitive Rates',
      description:
        'Receive multiple quotes and compare rates from carriers to get the best value for every load you need moved.',
    },
  ];

  const loadTypes = [
    { label: 'Full Truck Load (FTL)', description: 'Dedicated vehicle for large shipments' },
    { label: 'Part Load / LTL', description: 'Share trailer space to reduce costs' },
    { label: 'Sprinter Van Loads', description: 'Small urgent deliveries nationwide' },
    { label: 'Refrigerated / Reefer', description: 'Temperature-controlled freight' },
    { label: 'Flatbed & Oversized', description: 'Heavy plant, machinery and abnormal loads' },
    { label: 'Pallet Network', description: 'Single or multi-pallet collections and deliveries' },
  ];

  const steps = [
    {
      number: 1,
      title: 'Create a free account',
      description: 'Register as a Broker or Carrier in minutes. No setup fee required.',
    },
    {
      number: 2,
      title: 'Post or browse loads',
      description: 'Brokers post loads with collection and delivery details. Carriers browse and quote.',
    },
    {
      number: 3,
      title: 'Agree terms & confirm',
      description: 'Connect directly with the other party to finalise price, timing and paperwork.',
    },
    {
      number: 4,
      title: 'Complete & rate',
      description: 'Delivery done — leave feedback to build your verified reputation on the platform.',
    },
  ];

  return (
    <div className="bg-jet min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-graphite/30 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gold/8 rounded-full blur-[100px]" />
        </div>
        <div className="container-cinematic relative z-10 text-center">
          <div className="inline-flex items-center gap-2 badge-gold mb-6">
            <Truck className="w-4 h-4" />
            <span>UK Logistics Marketplace</span>
          </div>
          <h1 className="heading-hero text-white mb-6">
            Logistics Loads <span className="text-gradient-gold">UK</span>
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-10">
            The UK's dedicated marketplace for freight loads. Post loads, find verified carriers,
            and move goods across the country with confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/catalog?type=logistics"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              Browse Logistics Loads
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2">
              Post a Load
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-10 bg-jet border-y border-white/5">
        <div className="container-cinematic">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-gradient-gold">1,000+</p>
              <p className="text-white/60 text-sm mt-1">Active Loads</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient-gold">500+</p>
              <p className="text-white/60 text-sm mt-1">Verified Carriers</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient-gold">UK Wide</p>
              <p className="text-white/60 text-sm mt-1">Coverage</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gradient-gold">24/7</p>
              <p className="text-white/60 text-sm mt-1">Platform Access</p>
            </div>
          </div>
        </div>
      </section>

      {/* Load Types */}
      <section className="py-16 bg-graphite/20">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              Types of <span className="text-gradient-gold">Loads</span> Available
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Whether you need a full artic or a single pallet moved, we have carriers ready.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadTypes.map((type, index) => (
              <div key={index} className="card-glass flex items-start gap-4">
                <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white mb-1">{type.label}</h3>
                  <p className="text-white/60 text-sm">{type.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-jet">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              Why Use <span className="text-gradient-gold">XDrive Logistics Market by XDrive Logistics Ltd</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Built specifically for UK logistics professionals — brokers, carriers, and shippers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={index}
                  className="card-glass text-center hover:scale-[1.03] transition-all duration-500"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5">
                    <Icon className="h-7 w-7 text-gold" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{benefit.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-graphite/20">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              How It <span className="text-gradient-gold">Works</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Simple, transparent process for posting and filling loads across the UK.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.number} className="relative group">
                <div className="card-glass text-center">
                  <div className="w-10 h-10 bg-gold text-jet rounded-full flex items-center justify-center font-bold text-base mx-auto mb-5 shadow-cinematic-gold">
                    {step.number}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role Callout */}
      <section className="py-16 bg-jet">
        <div className="container-cinematic">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brokers */}
            <div className="card-glass text-center hover:scale-[1.02] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5">
                <Users className="h-7 w-7 text-gold" />
              </div>
              <span className="inline-block mb-3 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                Broker
              </span>
              <h3 className="text-xl font-bold text-white mb-3">Are you a Broker?</h3>
              <p className="text-white/60 text-sm mb-6">
                Post loads on behalf of your clients. Manage multiple shipments and build your
                verified broker profile.
              </p>
              <Link to="/register?type=seller&role=broker" className="btn-outline text-sm">
                Register as Broker
              </Link>
            </div>

            {/* Carriers */}
            <div className="card-glass text-center hover:scale-[1.02] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5">
                <Truck className="h-7 w-7 text-gold" />
              </div>
              <span className="inline-block mb-3 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold uppercase tracking-wider">
                Carrier
              </span>
              <h3 className="text-xl font-bold text-white mb-3">Are you a Carrier?</h3>
              <p className="text-white/60 text-sm mb-6">
                Find loads that match your routes and vehicle type. Quote directly and keep your
                trucks full.
              </p>
              <Link to="/register?type=seller&role=carrier" className="btn-outline text-sm">
                Register as Carrier
              </Link>
            </div>

            {/* Sellers / Shippers */}
            <div className="card-glass text-center hover:scale-[1.02] transition-all duration-500">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gold/10 rounded-premium-sm mb-5">
                <Package className="h-7 w-7 text-gold" />
              </div>
              <span className="inline-block mb-3 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 text-xs font-semibold uppercase tracking-wider">
                Seller
              </span>
              <h3 className="text-xl font-bold text-white mb-3">Need Goods Moved?</h3>
              <p className="text-white/60 text-sm mb-6">
                Post your shipment requirements and receive competitive quotes from verified
                carriers across the UK.
              </p>
              <Link to="/register?type=seller" className="btn-outline text-sm">
                Post a Shipment
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-graphite/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px]" />
        </div>
        <div className="container-cinematic relative z-10 text-center">
          <h2 className="heading-section text-white mb-6">
            Ready to <span className="text-gradient-gold">Find Your Next Load</span>?
          </h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Join thousands of UK logistics professionals on XDrive Logistics Market by XDrive Logistics Ltd today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/catalog?type=logistics"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Truck className="w-5 h-5" />
              Browse Loads Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register?type=seller" className="btn-secondary inline-flex items-center gap-2">
              Create Free Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
