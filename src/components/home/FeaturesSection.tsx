import { CheckCircle, Zap, Shield, BarChart3, Headphones, Globe } from 'lucide-react';

const FEATURES = [
  {
    icon: CheckCircle,
    title: 'Active Seller Accounts',
    desc: 'Sellers complete their profile and connect a Stripe account before they can list products on the platform.',
  },
  {
    icon: Zap,
    title: 'Fast Listing Tools',
    desc: 'List products in minutes with our optimised seller portal — bulk uploads, image hosting, and instant publishing.',
  },
  {
    icon: Shield,
    title: 'Secure Checkout',
    desc: 'All payments are processed via Stripe, a leading payment provider, for every transaction.',
  },
  {
    icon: BarChart3,
    title: 'Seller Analytics',
    desc: 'Real-time dashboards show views, conversions, revenue trends, and fulfilment performance in one place.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    desc: 'A real UK-based support team is available to help sellers and buyers resolve issues quickly.',
  },
  {
    icon: Globe,
    title: 'UK-Wide Reach',
    desc: 'Reach buyers across all of the United Kingdom — list your stock and connect with buyers in your region.',
  },
];

/**
 * FeaturesSection — a 3-column grid of platform capabilities shown on the
 * homepage between the seller-value section and the statistics strip.
 */
export default function FeaturesSection() {
  return (
    <section className="bg-white py-16 border-b border-gray-200">
      <div className="container-market">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
            Everything You Need to Sell Successfully
          </h2>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Loadify Market combines powerful seller tools with a seamless buyer experience — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 p-6 rounded-2xl border border-gray-100 hover:border-[#D4AF37]/60 hover:shadow-md transition-all duration-200 bg-[#FAFAFA]"
            >
              <div className="flex-shrink-0">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-[#0A2239]/10">
                  <Icon className="w-5 h-5 text-[#0A2239]" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 mb-1.5">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
