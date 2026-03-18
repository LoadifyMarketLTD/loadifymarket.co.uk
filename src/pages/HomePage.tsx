import { Link } from 'react-router-dom';
import {
  Tag,
  ShieldCheck,
  BadgeCheck,
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
} from 'lucide-react';

// ── §1  Hero image ────────────────────────────────────────────────────────────
const HERO_IMG_BASE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8';

// ── §1  Hero data ─────────────────────────────────────────────────────────────
const VALUE_POINTS = [
  { icon: Tag,         label: '0% Commission',    note: 'Launch Offer' },
  { icon: ShieldCheck, label: 'Secure Payments',  note: 'Stripe Protected' },
  { icon: BadgeCheck,  label: 'Controlled Onboarding', note: 'Verified Users Only' },
];

// ── §2  Trust data ────────────────────────────────────────────────────────────
const TRUST_POINTS = [
  'Verified users',
  'Secure transactions',
  'Controlled environment',
  'Quality listings',
];

// ── §3  Category data ─────────────────────────────────────────────────────────
const CATEGORIES = [
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

// ── §4  Why sellers data ──────────────────────────────────────────────────────
const WHY_SELLERS = [
  { icon: Zap,       title: 'Sell Faster',       desc: 'Buyers come with intent, not just browsing.' },
  { icon: TrendingUp,title: 'Keep More Profit',  desc: 'Launch phase with 0% commission.' },
  { icon: Users,     title: 'Reach Real Buyers', desc: 'A focused marketplace, not scattered general traffic.' },
  { icon: Settings2, title: 'Stay in Control',   desc: 'Your stock. Your pricing. Your business.' },
];

// ── §5  How it works data ─────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { icon: UserPlus,     step: '1', title: 'Create Account',  desc: 'Sign up free in minutes and get your seller account verified.' },
  { icon: List,         step: '2', title: 'List Your Stock', desc: 'Add your products with photos, descriptions, and pricing.' },
  { icon: ShoppingCart, step: '3', title: 'Get Orders',      desc: 'Buyers across the UK discover and purchase your listings.' },
  { icon: Banknote,     step: '4', title: 'Get Paid',        desc: 'Payments processed securely by Stripe, transferred to you.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Homepage
// Section order: Hero → Trust → What You Can Sell → Why Sellers Choose Us →
//                How It Works → Seller/Profit CTA → Final CTA
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-white">

      {/* ── §1  HERO ──────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 py-10 lg:py-16 items-center">

            {/* Left: copy + CTAs */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[#F4C400]/20 text-[#92700A] text-xs font-bold px-3 py-1.5 rounded-full mb-5 tracking-wide uppercase">
                Launch Phase — 0% Commission
              </div>

              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-5">
                Sell Faster.<br />Scale Bigger.<br />Keep More Profit.
              </h1>

              <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
                Join a UK marketplace built for serious sellers — not casual listings.
              </p>

              {/* Value points */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-8">
                {VALUE_POINTS.map(({ icon: Icon, label, note }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2.5 bg-[#F8F9FA] border border-gray-200 rounded-lg px-3.5 py-2.5"
                  >
                    <Icon className="w-4 h-4 text-[#1E3A5F] flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 leading-tight">{label}</p>
                      <p className="text-xs text-gray-500 leading-tight">{note}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-bold px-6 py-3.5 rounded-lg text-base transition-colors shadow-md"
                >
                  <Store className="h-5 w-5" />
                  Start Selling
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-[#1E3A5F] hover:text-[#1E3A5F] font-semibold px-6 py-3.5 rounded-lg text-base transition-colors"
                >
                  Browse Marketplace
                </Link>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                Your stock. Your pricing. Your business.
              </p>
            </div>

            {/* Right: product / commerce image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3]">
                <img
                  src={`${HERO_IMG_BASE}?w=768&q=65&auto=format&fit=max&fm=webp`}
                  srcSet={`
                    ${HERO_IMG_BASE}?w=480&q=65&auto=format&fit=max&fm=webp 480w,
                    ${HERO_IMG_BASE}?w=640&q=65&auto=format&fit=max&fm=webp 640w,
                    ${HERO_IMG_BASE}?w=768&q=65&auto=format&fit=max&fm=webp 768w,
                    ${HERO_IMG_BASE}?w=1280&q=65&auto=format&fit=max&fm=webp 1280w`}
                  sizes="(max-width: 1023px) 100vw, 640px"
                  alt="Products for sale on a UK marketplace"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
                <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg px-4 py-3">
                  <p className="text-xs font-bold text-[#1E3A5F] mb-0.5">Launch Phase Active</p>
                  <p className="text-xs text-gray-600">0% commission for early sellers</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── §2  TRUST SECTION ─────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
              Built for Serious Sellers — Not Casual Listings
            </h2>
            <p className="text-gray-600 text-base leading-relaxed mb-4">
              Loadify Market is a focused UK marketplace designed for businesses that want to sell
              stock efficiently in a cleaner, more professional environment.
            </p>
            <p className="text-gray-600 text-base leading-relaxed">
              We are building a trusted marketplace experience centered around quality listings,
              secure transactions, and real buying intent.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {TRUST_POINTS.map((point) => (
              <div
                key={point}
                className="flex items-start gap-3 bg-white border border-gray-200 rounded-xl p-4"
              >
                <CheckCircle2 className="w-5 h-5 text-[#1E3A5F] flex-shrink-0 mt-0.5" />
                <p className="text-sm font-semibold text-gray-800">{point}</p>
              </div>
            ))}
          </div>

          <div className="max-w-2xl mx-auto bg-[#1E3A5F] rounded-2xl p-8 text-center">
            <p className="text-white font-bold text-lg mb-2">
              This is not a saturated marketplace.
            </p>
            <p className="text-[#F4C400] font-bold text-lg">
              This is a growing opportunity.
            </p>
          </div>
        </div>
      </section>

      {/* ── §3  WHAT YOU CAN SELL ──────────────────────────────────────────── */}
      <section className="bg-white py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              Sell What Moves. Profit From What Others Can't.
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              List products across multiple categories and connect with buyers looking for real opportunities.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
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

      {/* ── §4  WHY SELLERS CHOOSE LOADIFY ────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-14 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Why Sellers Choose Loadify Market
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_SELLERS.map(({ icon: Icon, title, desc }) => (
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

      {/* ── §6  SELLER / PROFIT CTA ────────────────────────────────────────── */}
      <section className="bg-[#1E3A5F] py-14">
        <div className="container-market text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
            Turn Stock Into Revenue — Not Storage
          </h2>
          <p className="text-blue-200 text-base mb-2">
            Every product sitting still is lost opportunity.
          </p>
          <p className="text-blue-200 text-base mb-8">
            List it, sell it, and grow your business through a cleaner marketplace experience.
          </p>
          <Link
            to="/register?type=seller"
            className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-extrabold px-8 py-4 rounded-xl text-base transition-colors shadow-lg mb-4"
          >
            <Store className="w-5 h-5" />
            Create Free Seller Account
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-blue-300 text-sm mt-2">
            Launch phase benefits available for early sellers.
          </p>
        </div>
      </section>

      {/* ── §7  FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="bg-white py-16">
        <div className="container-market text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
            Ready to Start Selling?
          </h2>
          <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
            Join early sellers building their business on Loadify Market.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-4">
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 bg-[#F4C400] hover:bg-[#EAB308] text-gray-900 font-extrabold px-10 py-4 rounded-xl text-base transition-colors shadow-lg"
            >
              <Store className="w-5 h-5" />
              Start Selling
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-[#1E3A5F] hover:text-[#1E3A5F] font-semibold px-10 py-4 rounded-xl text-base transition-colors"
            >
              Browse Marketplace
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-4">No clutter. No wasted time. Just a cleaner place to trade.</p>
        </div>
      </section>

    </div>
  );
}
