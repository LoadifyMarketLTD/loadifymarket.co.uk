import { Link } from 'react-router-dom';
import {
  MapPin,
  Mail,
  Phone,
  Shield,
  Users,
  TrendingUp,
  Heart,
  Award,
  CheckCircle,
} from 'lucide-react';

export default function AboutPage() {
  const values = [
    {
      icon: Shield,
      title: 'Trust & Security',
      description:
        'We verify sellers and provide a secure platform. Your safety is our priority.',
    },
    {
      icon: Users,
      title: 'Community First',
      description:
        'We build tools and features based on what our buyers and sellers need to succeed.',
    },
    {
      icon: TrendingUp,
      title: 'Growth & Innovation',
      description:
        'We continuously improve our platform to help your business grow and thrive.',
    },
    {
      icon: Heart,
      title: 'Customer Care',
      description:
        'UK-based support team ready to help. We treat every customer like family.',
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Active Listings' },
    { value: '500+', label: 'Verified Sellers' },
    { value: '50,000+', label: 'Products Sold' },
    { value: '4.8/5', label: 'Average Rating' },
  ];

  return (
    <div className="bg-jet min-h-screen py-12">
      {/* Header Section */}
      <section className="py-12 bg-graphite/30">
        <div className="container-cinematic text-center">
          <h1 className="heading-hero text-white mb-6">
            About <span className="text-gradient-gold">XDrive Logistics Market by XDrive Logistics Ltd</span>
          </h1>
          <p className="text-xl text-white/60 max-w-3xl mx-auto mb-8">
            The UK's premier marketplace for logistics, wholesale, and handmade goods
          </p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="container-cinematic max-w-4xl">
          <div className="card-glass">
            <h2 className="heading-section text-white mb-6 text-center">
              Our <span className="text-gradient-gold">Story</span>
            </h2>
            <div className="space-y-4 text-white/70 text-lg leading-relaxed">
              <p>
                XDrive Logistics Market by XDrive Logistics Ltd was born from a simple observation: the UK needed a better way to
                connect buyers and sellers across diverse markets—from logistics and freight to
                wholesale pallets and unique handmade goods.
              </p>
              <p>
                Founded by XDrive Logistics Ltd in Blackburn, we set out to build more than just
                another marketplace. We wanted to create a trusted platform where businesses could
                grow, buyers could find quality products, and every transaction would be secure and
                transparent.
              </p>
              <p>
                Today, XDrive Logistics Market by XDrive Logistics Ltd serves thousands of businesses across the UK, from small
                artisans to large-scale wholesalers and logistics providers. Our mission remains the
                same: to make B2B and B2C commerce simple, secure, and profitable for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-graphite/30">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-6">
              Our <span className="text-gradient-gold">Mission</span>
            </h2>
            <p className="text-xl text-white/60 max-w-3xl mx-auto">
              To empower UK businesses by providing a trusted, secure, and innovative marketplace
              that connects buyers and sellers across logistics, wholesale, and handmade sectors.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto mb-12">
            {stats.map((stat, index) => (
              <div key={index} className="card-glass text-center">
                <div className="text-4xl font-bold text-gradient-gold mb-2">{stat.value}</div>
                <div className="text-white/60">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container-cinematic">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              Our <span className="text-gradient-gold">Values</span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="card-glass text-center hover:scale-[1.03] transition-all duration-500"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-premium-sm mb-6">
                    <Icon className="h-8 w-8 text-gold" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{value.title}</h3>
                  <p className="text-white/60">{value.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-16 bg-graphite/30">
        <div className="container-cinematic max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="heading-section text-white mb-4">
              What Makes Us <span className="text-gradient-gold">Different</span>
            </h2>
          </div>

          <div className="space-y-6">
            <div className="card-glass flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Verified Sellers Only</h3>
                <p className="text-white/60">
                  Every seller is manually reviewed and approved by our team before they can list
                  products. No fake accounts, no scams.
                </p>
              </div>
            </div>

            <div className="card-glass flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Payment Processing</h3>
                <p className="text-white/60">
                  Payments are processed through Stripe. Connect directly with buyers and sellers
                  to finalize transactions.
                </p>
              </div>
            </div>

            <div className="card-glass flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">UK Based & Supported</h3>
                <p className="text-white/60">
                  We're a UK company serving UK businesses. Get support from a local team that
                  understands your market.
                </p>
              </div>
            </div>

            <div className="card-glass flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Multi-Category Platform</h3>
                <p className="text-white/60">
                  Whether you're moving freight, buying wholesale stock, or selling handmade
                  goods—all in one marketplace.
                </p>
              </div>
            </div>

            <div className="card-glass flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Transparent Pricing</h3>
                <p className="text-white/60">
                  No hidden fees. No surprises. You know exactly what you'll pay before you list or
                  buy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="py-16">
        <div className="container-cinematic max-w-4xl">
          <div className="card-glass">
            <div className="text-center mb-8">
              <Award className="w-16 h-16 text-gold mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">XDrive Logistics Market by XDrive Logistics Ltd</h2>
              <p className="text-white/60">Registered UK Company</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Address</h3>
                  <p className="text-white/60">
                    101 Cornelian Street
                    <br />
                    Blackburn, BB1 9QL
                    <br />
                    United Kingdom
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Email</h3>
                  <a
                    href="mailto:loadifymarket.co.uk@gmail.com"
                    className="text-gold hover:underline"
                  >
                    loadifymarket.co.uk@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">VAT Number</h3>
                  <p className="text-white/60">GB375949535</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-gold flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Support</h3>
                  <p className="text-white/60">
                    <Link to="/contact" className="text-gold hover:underline">
                      Contact Us
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-graphite/30">
        <div className="container-cinematic text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">Join Our Growing Community</h2>
            <p className="text-white/60 text-lg mb-8">
              Whether you're buying or selling, XDrive Logistics Market by XDrive Logistics Ltd is here to help you succeed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register?type=buyer" className="btn-primary inline-flex items-center">
                Start Buying
              </Link>
              <Link to="/register?type=seller" className="btn-primary inline-flex items-center">
                Start Selling
              </Link>
              <Link to="/contact" className="btn-secondary inline-flex items-center">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
