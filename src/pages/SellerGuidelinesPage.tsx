import { Link } from 'react-router-dom';
import {
  BadgeCheck,
  ClipboardList,
  ShieldCheck,
  Store,
  Package,
  CreditCard,
  Star,
  MessageCircle,
} from 'lucide-react';

const GUIDELINES = [
  {
    icon: ClipboardList,
    title: 'Accurate Listings',
    description:
      'All products must be described accurately. Include clear photos, correct condition grading (new, used, refurbished), and honest descriptions of any defects or missing items.',
  },
  {
    icon: Package,
    title: 'Legal & Compliant Stock',
    description:
      'Only list items you have the legal right to sell. Counterfeit, stolen, or prohibited goods are strictly banned and will result in immediate account suspension.',
  },
  {
    icon: CreditCard,
    title: 'Pricing & Fees',
    description:
      'Prices must reflect the true cost of goods. A 7% marketplace commission applies to all completed sales. All transactions must be processed through the Loadify Market payment system.',
  },
  {
    icon: BadgeCheck,
    title: 'Verification Process',
    description:
      'All sellers undergo identity and business verification before their listings go live. You must provide valid UK business information and pass our onboarding review.',
  },
  {
    icon: MessageCircle,
    title: 'Responsive Communication',
    description:
      'Respond to buyer enquiries within 48 hours. Prompt, professional communication builds trust and improves your seller rating on the platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Order Fulfilment',
    description:
      'Dispatch orders within the timeframe stated in your listing. Upload proof of dispatch and provide accurate tracking information. Failure to fulfil orders may result in account suspension.',
  },
  {
    icon: Star,
    title: 'Seller Ratings',
    description:
      'Your performance is rated by buyers after each transaction. Consistently low ratings may result in reduced listing visibility or account review. Strive for 5-star service.',
  },
  {
    icon: Store,
    title: 'Seller Dashboard',
    description:
      'Manage all your listings, orders, and payouts from your Seller Dashboard. Keep your stock quantities up to date to avoid overselling.',
  },
];

export default function SellerGuidelinesPage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-gray-200 py-12">
        <div className="container-market text-center">
          <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            For Sellers
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Seller Guidelines</h1>
          <p className="text-gray-700 text-base max-w-2xl mx-auto">
            Everything you need to know to sell successfully on Loadify Market. Follow these
            guidelines to build trust, protect buyers, and grow your business.
          </p>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
            >
              <Store className="w-4 h-4" />
              Start Selling
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-6 py-3 rounded transition-colors"
            >
              View Fees &amp; Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Guidelines Grid */}
      <section className="py-12 bg-[#F8F9FA]">
        <div className="container-market">
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Seller Rules &amp; Best Practices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {GUIDELINES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="bg-white border border-gray-200 rounded-lg p-6 flex gap-4"
                >
                  <div className="flex-shrink-0 w-11 h-11 bg-[#1E3A5F]/10 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#1E3A5F]" />
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

      {/* Policy Summary */}
      <section className="py-10 bg-white border-t border-gray-200">
        <div className="container-market max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Prohibited Items &amp; Activities</h2>
          <p className="text-gray-600 text-sm mb-4">
            The following items and activities are strictly prohibited on Loadify Market:
          </p>
          <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
            <li>Counterfeit, replica, or trademark-infringing goods</li>
            <li>Stolen or illegally obtained merchandise</li>
            <li>Weapons, illegal substances, or age-restricted goods sold without verification</li>
            <li>Misleading product descriptions or fake reviews</li>
            <li>Transactions conducted outside the platform to avoid fees</li>
            <li>Multiple accounts for the same seller or business</li>
            <li>Any activity that violates UK consumer protection law</li>
          </ul>
          <p className="text-gray-600 text-sm mt-4">
            Violations may result in listing removal, account suspension, or legal action. For the full
            policy, please review our{' '}
            <Link to="/acceptable-use-policy" className="text-[#1E3A5F] hover:underline font-medium">
              Acceptable Use Policy
            </Link>{' '}
            and{' '}
            <Link to="/terms" className="text-[#1E3A5F] hover:underline font-medium">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#F8F9FA] py-10 border-t border-gray-200">
        <div className="container-market text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to start selling?</h2>
          <p className="text-gray-600 text-sm mb-5">
            Join hundreds of verified UK sellers already using Loadify Market.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-semibold px-6 py-3 rounded transition-colors"
            >
              <Store className="w-4 h-4" />
              Create Seller Account
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white font-semibold px-6 py-3 rounded transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
