import { Link } from 'react-router-dom';
import { BadgeCheck, ShieldCheck, ClipboardList, Star, Store, Search } from 'lucide-react';

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: 'Identity Verified',
    description:
      'Every seller undergoes a manual identity and business verification before their first listing goes live. We confirm legal business registration and contact details.',
  },
  {
    icon: ClipboardList,
    title: 'Listing Reviewed',
    description:
      'All product listings are reviewed by our moderation team before appearing on the marketplace, ensuring accuracy, legality, and compliance with our seller guidelines.',
  },
  {
    icon: Star,
    title: 'Performance Rated',
    description:
      'Verified sellers are rated by buyers after each transaction. Ratings are displayed publicly so you can shop with confidence and choose the best seller for your needs.',
  },
  {
    icon: BadgeCheck,
    title: 'Ongoing Compliance',
    description:
      'Sellers must maintain compliance with our Acceptable Use Policy. Accounts are monitored for disputes, fulfilment rates, and buyer feedback.',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Register & Apply',
    description: 'Create a seller account and submit your business information for review.',
  },
  {
    step: '2',
    title: 'Identity Check',
    description:
      'Our team reviews your application, verifies your business details, and approves your account.',
  },
  {
    step: '3',
    title: 'Verified Badge',
    description:
      'Once approved, your listings display the Verified Seller badge, building buyer confidence.',
  },
  {
    step: '4',
    title: 'Ongoing Review',
    description:
      'We continuously monitor seller performance, reviews, and compliance to maintain standards.',
  },
];

export default function VerifiedSellersPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-12">
        <div className="container-market text-center">
          <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            Buyer Confidence
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Verified Sellers</h1>
          <p className="text-gray-700 text-base max-w-2xl mx-auto">
            Every seller on Loadify Market goes through a rigorous verification process. Shop with
            confidence knowing that all listings come from vetted, trusted UK businesses.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
            >
              <Search className="w-4 h-4" />
              Browse Verified Listings
            </Link>
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-[#1E3A5F] font-semibold px-6 py-3 rounded transition-colors"
            >
              <Store className="w-4 h-4" />
              Become a Verified Seller
            </Link>
          </div>
        </div>
      </section>

      {/* What Verification Means */}
      <section className="py-12 bg-[#F8F9FA]">
        <div className="container-market">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            What Does Verification Mean?
          </h2>
          <p className="text-gray-600 text-sm text-center max-w-xl mx-auto mb-8">
            The Verified Seller badge is only awarded after a seller has passed all stages of our
            vetting process.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {BENEFITS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white border border-gray-200 rounded-lg p-6 flex gap-4"
                >
                  <div className="flex-shrink-0 w-11 h-11 bg-green-50 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Verification Process */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="container-market">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            The Verification Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="relative bg-[#F8F9FA] border border-gray-200 rounded-lg p-6 text-center"
              >
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#F4C400] text-gray-900 text-xs font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2 mt-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buyer Protection Link */}
      <section className="py-10 bg-[#F8F9FA] border-t border-gray-200">
        <div className="container-market text-center max-w-2xl mx-auto">
          <BadgeCheck className="w-10 h-10 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Protected on every purchase
          </h2>
          <p className="text-gray-600 text-sm mb-5">
            In addition to verified sellers, every transaction on Loadify Market is covered by our
            Buyer Protection Policy. If something goes wrong, we're here to help.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/buyer-protection"
              className="inline-flex items-center gap-2 bg-[#1E3A5F] hover:bg-[#2C4E73] text-white font-semibold px-6 py-3 rounded transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Buyer Protection Policy
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-[#1E3A5F] font-semibold px-6 py-3 rounded transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
