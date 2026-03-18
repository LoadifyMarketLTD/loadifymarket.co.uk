import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Store,
  CheckCircle2,
  Zap,
  TrendingUp,
  Users,
  Settings2,
  UserPlus,
  List,
  ShoppingCart,
  Banknote,
  BadgePercent,
  Eye,
  Rocket,
} from 'lucide-react';

// ── §2  Trust section data ────────────────────────────────────────────────────
const TRUST_ENVIRONMENT = [
  'Verified users only',
  'Real buying intent',
  'Secure and transparent transactions',
  'High-quality listings',
];

const EARLY_SELLER_BENEFITS = [
  'Higher visibility',
  'Less competition',
  'Direct access to buyers',
  'Faster deal flow',
];

// ── §3  What You Can Sell — 6 categories ─────────────────────────────────────
const SELL_CATEGORIES = [
  {
    slug: 'electronics',
    label: 'Electronics & Gadgets',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'fashion',
    label: 'Fashion & Apparel',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'home-garden',
    label: 'Home & Living',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'tools-diy',
    label: 'Tools & Equipment',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'clearance',
    label: 'Clearance & Overstock',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'wholesale',
    label: 'Mixed Lots & Bundles',
    image: 'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=400&q=65&auto=format&fit=crop',
  },
];

// ── §4  Why Sellers Choose Us — 4 blocks ─────────────────────────────────────
const WHY_US = [
  {
    icon: Zap,
    title: 'Sell Faster',
    desc: 'Buyers come with intent, not just browsing.',
  },
  {
    icon: TrendingUp,
    title: 'Keep More Profit',
    desc: 'Launch phase with 0% commission.',
  },
  {
    icon: Users,
    title: 'Reach Real Buyers',
    desc: 'Focused marketplace — not general traffic.',
  },
  {
    icon: Settings2,
    title: 'Stay in Control',
    desc: 'Your stock. Your pricing. Your business.',
  },
];

// ── §5  How It Works — 4 steps ───────────────────────────────────────────────
const HOW_IT_WORKS = [
  { icon: UserPlus,    step: '1', title: 'Create Account',  desc: 'Sign up free in minutes and get your seller account verified.' },
  { icon: List,        step: '2', title: 'List Your Stock', desc: 'Add your products with photos, descriptions, and pricing.' },
  { icon: ShoppingCart,step: '3', title: 'Get Orders',      desc: 'Buyers across the UK discover and purchase your listings.' },
  { icon: Banknote,    step: '4', title: 'Get Paid',        desc: 'Payments processed securely by Stripe, transferred to you.' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function HomeBelowFold() {
  return (
    <>
      {/* ── §2  TRUST SECTION ─────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
              Built for Serious Sellers — Not Casual Listings
            </h2>
            <p className="text-gray-600 text-base leading-relaxed mb-4">
              Loadify Market is a focused UK marketplace designed for businesses that want to sell
              stock efficiently — not waste time on low-quality leads.
            </p>
            <p className="text-gray-600 text-base leading-relaxed">
              We are onboarding sellers and buyers in a controlled environment to ensure:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {TRUST_ENVIRONMENT.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4"
              >
                <CheckCircle2 className="w-5 h-5 text-[#1E3A5F] flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-gray-800">{point}</p>
              </div>
            ))}
          </div>

          {/* Highlight box */}
          <div className="max-w-2xl mx-auto bg-[#1E3A5F] rounded-2xl p-8">
            <p className="text-[#F4C400] text-xs font-bold uppercase tracking-widest mb-4">
              Early Seller Advantage
            </p>
            <p className="text-white font-bold text-lg mb-5">Early sellers benefit from:</p>
            <ul className="space-y-3 mb-6">
              {EARLY_SELLER_BENEFITS.map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-[#F4C400] flex-shrink-0" />
                  <span className="text-blue-100 text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-white/20 pt-5">
              <p className="text-white font-bold text-base">
                This is not a saturated marketplace.
              </p>
              <p className="text-[#F4C400] font-bold text-base">
                This is a growing opportunity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── §3  WHAT YOU CAN SELL ──────────────────────────────────────────── */}
      <section className="bg-white py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Sell What Moves. Profit From What Others Can't.
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SELL_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group block rounded-xl overflow-hidden border border-gray-200 hover:border-[#F4C400] hover:shadow-lg transition-all duration-200"
              >
                <div className="aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-3 text-center bg-white">
                  <p className="text-xs font-bold text-gray-900 leading-tight">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── §4  WHY SELLERS CHOOSE US ─────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Why Sellers Choose Loadify Market
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_US.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-200 rounded-2xl p-7 text-center hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-[#1E3A5F]/10 rounded-2xl mb-5">
                  <Icon className="w-7 h-7 text-[#1E3A5F]" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §5  HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="bg-white py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1E3A5F] text-white font-extrabold text-lg mb-4 shadow-md">
                  {step}
                </div>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-[#F4C400]/15 rounded-xl">
                    <Icon className="w-5 h-5 text-[#1E3A5F]" />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §6  PROFIT SECTION ────────────────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-14 border-b border-gray-200">
        <div className="container-market text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            Turn Stock Into Revenue — Not Storage
          </h2>
          <p className="text-blue-200 text-base mb-2">Every product sitting still is lost money.</p>
          <p className="text-blue-200 text-base mb-8">List it. Sell it. Scale it.</p>
          <Link
            to="/register?type=seller"
            className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-extrabold px-8 py-4 rounded-xl text-base transition-colors shadow-lg"
          >
            <Store className="w-5 h-5" />
            Start Selling Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── §7  URGENCY SECTION ───────────────────────────────────────────── */}
      <section className="bg-[#FFFBEA] py-14 border-b border-yellow-100">
        <div className="container-market">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Launch Phase — Limited Opportunity
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center bg-white border border-yellow-200 rounded-2xl p-7 shadow-sm">
              <BadgePercent className="w-10 h-10 text-[#92700A] mb-4" />
              <h3 className="text-base font-extrabold text-gray-900 mb-2">0% Commission</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Sell during the launch phase and keep every pound of your revenue.
              </p>
            </div>
            <div className="flex flex-col items-center text-center bg-white border border-yellow-200 rounded-2xl p-7 shadow-sm">
              <Rocket className="w-10 h-10 text-[#92700A] mb-4" />
              <h3 className="text-base font-extrabold text-gray-900 mb-2">Early Seller Advantage</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Early sellers build reputation and reach before the platform scales.
              </p>
            </div>
            <div className="flex flex-col items-center text-center bg-white border border-yellow-200 rounded-2xl p-7 shadow-sm">
              <Eye className="w-10 h-10 text-[#92700A] mb-4" />
              <h3 className="text-base font-extrabold text-gray-900 mb-2">Increased Visibility</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                With fewer sellers on board, your listings get significantly more exposure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── §8  FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="container-market text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
            Ready to Start Selling?
          </h2>
          <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
            Join early sellers building their business on Loadify Market.
          </p>
          <Link
            to="/register?type=seller"
            className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-extrabold px-10 py-4 rounded-xl text-base transition-colors shadow-lg mb-4"
          >
            <Store className="w-5 h-5" />
            Create Your Free Seller Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-gray-400 mt-4">No Fees. No Contracts. Just Results.</p>
        </div>
      </section>
    </>
  );
}
