import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, ShoppingBag, Package, Truck, RotateCcw, AlertTriangle,
  CreditCard, Store, Shield, ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react';
import { BRAND } from '../constants/brand';

interface FAQ {
  q: string;
  a: string;
}

const SECTIONS = [
  {
    title: 'Orders & Checkout',
    icon: ShoppingBag,
    faqs: [
      { q: 'How do I place an order?', a: 'Browse products, click "Add to Cart", proceed to checkout, enter your delivery details and payment information, then confirm your order. You\'ll receive an email confirmation immediately.' },
      { q: 'Can I modify or cancel my order?', a: 'You can cancel an order within 1 hour of placing it by contacting our support team. Once the seller has confirmed your order, modifications may not be possible.' },
      { q: 'How do I get my invoice?', a: 'An invoice is automatically generated after every order. You can download it as a PDF from the Order Details page under My Orders.' },
      { q: 'What payment methods are accepted?', a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex) powered by Stripe. All payments are fully encrypted and secure.' },
    ] as FAQ[],
  },
  {
    title: 'Shipping & Tracking',
    icon: Truck,
    faqs: [
      { q: 'How do I track my order?', a: 'Once your order is shipped, you\'ll receive a shipping confirmation email with a tracking number. You can also track orders on the Track Order page.' },
      { q: 'What are the delivery timeframes?', a: 'Standard delivery: 3-5 working days. Express delivery: 1-2 working days. Bulk/pallet orders: 3-7 working days depending on location.' },
      { q: 'Do you offer collection?', a: 'Some sellers offer warehouse collection for bulk and pallet orders. Look for the "Pickup available" option on the product listing.' },
    ] as FAQ[],
  },
  {
    title: 'Returns & Refunds',
    icon: RotateCcw,
    faqs: [
      { q: `What is the return policy?`, a: `You can return most items within ${BRAND.returnsDays} days of delivery. Items must be in their original condition. Handmade and custom items may not be returnable.` },
      { q: 'How do I request a return?', a: 'Go to My Orders, find the order, and click "Request Return". Select a reason, optionally upload photos, and submit. The seller will respond within 48 hours.' },
      { q: 'When will I receive my refund?', a: 'Approved refunds are processed within 3-5 business days and will be returned to your original payment method.' },
      { q: 'What if my item arrived damaged?', a: 'If your item arrived damaged, select "Damaged" as the return reason and upload photos as evidence. We will prioritise your case.' },
    ] as FAQ[],
  },
  {
    title: 'Disputes',
    icon: AlertTriangle,
    faqs: [
      { q: 'How do I open a dispute?', a: 'Go to My Orders, find the relevant order, and click "Open Dispute". Describe the issue clearly and our team will review within 48 hours.' },
      { q: 'How long does dispute resolution take?', a: 'Most disputes are resolved within 3-5 business days. Complex cases may take up to 14 days.' },
      { q: 'What if a seller is unresponsive?', a: 'If a seller does not respond to your dispute within 48 hours, the case is automatically escalated to our admin team for review.' },
    ] as FAQ[],
  },
  {
    title: 'Payments & Security',
    icon: CreditCard,
    faqs: [
      { q: 'Is my payment information secure?', a: 'Yes. All payments are processed by Stripe, which is PCI-DSS compliant. We never store your full card details on our servers.' },
      { q: 'What is buyer protection?', a: `${BRAND.name} offers full buyer protection on every order. If you don't receive your order or it doesn't match the description, you're entitled to a full refund.` },
      { q: 'How does escrow work?', a: 'Payments are held in escrow by Stripe Connect. Sellers receive funds only after the buyer confirms delivery, or automatically after 7 days.' },
    ] as FAQ[],
  },
  {
    title: 'Selling on Loadify',
    icon: Store,
    faqs: [
      { q: 'How do I start selling?', a: 'Click "Sell on Loadify" and create a seller account. After identity verification, you can create your store and start listing products immediately.' },
      { q: `What are the seller fees?`, a: `${BRAND.name} charges a ${BRAND.marketplaceFeePercent}% platform commission on each sale. There are no listing fees or monthly charges.` },
      { q: 'When do I get paid?', a: 'Seller payouts are processed 7 days after order confirmation. Funds are transferred to your registered bank account via Stripe Connect.' },
      { q: 'Can I list bulk and pallet stock?', a: 'Yes. We support individual products, bulk lots, pallet deals, liquidation stock, and wholesale bundles. Use the Bulk Deals section to list B2B inventory.' },
    ] as FAQ[],
  },
  {
    title: 'Account & Security',
    icon: Shield,
    faqs: [
      { q: 'How do I reset my password?', a: 'Click "Sign In", then "Forgot password?" and enter your email address. You\'ll receive a reset link within a few minutes.' },
      { q: 'How do I verify my email?', a: 'After registration, check your inbox for a verification email and click the confirmation link. Check spam if you don\'t see it.' },
      { q: 'Can I have multiple accounts?', a: 'Each person may only have one buyer account. However, you can be both a buyer and a seller under the same account.' },
    ] as FAQ[],
  },
];

function FAQItem({ q, a }: FAQ) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        className="w-full flex items-start justify-between py-4 text-left group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className={`font-medium text-sm pr-4 ${open ? 'text-gold' : 'text-white group-hover:text-gold'} transition-colors`}>
          {q}
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-gold flex-shrink-0 mt-0.5 transition-colors" />
        )}
      </button>
      {open && (
        <div className="pb-4">
          <p className="text-white/60 text-sm leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const lowerSearch = search.toLowerCase();

  const filteredSections = SECTIONS.map(section => ({
    ...section,
    faqs: search
      ? section.faqs.filter(f => f.q.toLowerCase().includes(lowerSearch) || f.a.toLowerCase().includes(lowerSearch))
      : section.faqs,
  })).filter(s => s.faqs.length > 0);

  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Hero */}
      <section className="bg-gradient-to-b from-graphite/40 to-jet py-16">
        <div className="container-cinematic text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gold/10 rounded-full mb-6">
            <HelpCircle className="w-8 h-8 text-gold" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Help &amp; FAQ</h1>
          <p className="text-white/60 text-lg mb-8 max-w-xl mx-auto">
            Find answers to common questions about {BRAND.name}
          </p>
          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search for help..."
              className="input-search w-full pl-12"
            />
            <HelpCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <div className="container-cinematic py-16 max-w-4xl">
        {filteredSections.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/50">No results found for "{search}"</p>
            <button onClick={() => setSearch('')} className="text-gold text-sm underline mt-2">Clear search</button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSections.map(section => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="card-glass">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gold/10 rounded-premium-sm">
                      <Icon className="w-5 h-5 text-gold" />
                    </div>
                    <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  </div>
                  <div>
                    {section.faqs.map(faq => (
                      <FAQItem key={faq.q} {...faq} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Still need help? */}
        <div className="card-glass mt-10 text-center">
          <h3 className="text-xl font-bold text-white mb-3">Still need help?</h3>
          <p className="text-white/60 mb-6 text-sm">
            Our support team is available Monday–Friday 9am–6pm GMT.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="btn-primary inline-flex items-center gap-2">
              Contact Support <ArrowRight className="w-4 h-4" />
            </Link>
            <a href={`mailto:${BRAND.supportEmail}`} className="btn-outline inline-flex items-center gap-2">
              {BRAND.supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
