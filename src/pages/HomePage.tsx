import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
  Store,
  Zap,
  TrendingUp,
  Users,
  Settings2,
  UserPlus,
  List,
  ShoppingCart,
  Banknote,
  CreditCard,
} from 'lucide-react';
import CountdownBanner from '../components/CountdownBanner';
import FeaturesSection from '../components/home/FeaturesSection';
import StatsSection from '../components/home/StatsSection';

// ── §1  Hero image ────────────────────────────────────────────────────────────
const HERO_IMG_BASE = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d';

// ── §2  Trust strip data ──────────────────────────────────────────────────────
const TRUST_STRIP = [
  { icon: BadgeCheck,  label: 'Verified Sellers'          },
  { icon: ShieldCheck, label: 'Secure Payments (Stripe)'  },
  { icon: Zap,         label: 'Fast Payouts'              },
  { icon: CreditCard,  label: 'Buyer Protection'          },
];

// ── §3  Seller value cards ────────────────────────────────────────────────────
const SELLER_VALUES = [
  {
    icon: TrendingUp,
    title: 'Keep More Profit',
    desc: 'Lower fees than traditional marketplaces — more revenue stays in your pocket.',
  },
  {
    icon: Users,
    title: 'Reach Real Buyers',
    desc: 'Shoppers arrive with genuine intent. No wasted impressions.',
  },
  {
    icon: Settings2,
    title: 'Full Control',
    desc: 'Your stock. Your pricing. Your business — your rules.',
  },
  {
    icon: Banknote,
    title: 'Fast Payments',
    desc: 'Stripe-powered payouts sent directly to your account.',
  },
];

// ── §4  Category grid ─────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    slug: 'electronics',
    label: 'Electronics',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'fashion',
    label: 'Fashion',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'home-garden',
    label: 'Home & Living',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'tools-diy',
    label: 'Tools',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'clearance',
    label: 'Clearance',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&q=65&auto=format&fit=crop',
  },
  {
    slug: 'wholesale',
    label: 'Mixed Lots',
    image: 'https://images.unsplash.com/photo-1493723843671-1d655e66ac1c?w=400&q=65&auto=format&fit=crop',
  },
];

// ── §5  How it works data ─────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { icon: UserPlus,     step: '1', title: 'Create Account',  desc: 'Sign up free in minutes and get your seller account verified.' },
  { icon: List,         step: '2', title: 'List Products',   desc: 'Add your products with photos, descriptions, and pricing.' },
  { icon: ShoppingCart, step: '3', title: 'Get Orders',      desc: 'Buyers across the UK discover and purchase your listings.' },
  { icon: Banknote,     step: '4', title: 'Get Paid',        desc: 'Payments processed securely via Stripe and transferred to you.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Homepage
// Section order: Countdown → Hero → Trust Strip → Seller Value → Features →
//                Stats → Category Grid → How It Works → Strong CTA
// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-white">

      {/* ── §0  COUNTDOWN BANNER ──────────────────────────────────────────── */}
      <CountdownBanner />

      {/* ── §1  HERO ──────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="container-market">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 py-12 lg:py-20 items-center">

            {/* Left: copy + CTAs */}
            <div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-900 leading-[1.1] mb-6">
                Sell Faster.<br />Scale Bigger.<br />Keep More Profit.
              </h1>

              <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-md">
                Join a modern UK marketplace built for serious sellers.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C9A227] text-gray-900 font-bold px-7 py-4 rounded-lg text-base transition-colors shadow-md"
                >
                  <Store className="h-5 w-5" />
                  Start Selling
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 border-2 border-gray-300 text-gray-700 hover:border-[#0A2239] hover:text-[#0A2239] font-semibold px-7 py-4 rounded-lg text-base transition-colors"
                >
                  Browse Marketplace
                </Link>
              </div>
            </div>

            {/* Right: modern retail / business image */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img
                  src={`${HERO_IMG_BASE}?w=768&q=70&auto=format&fit=max&fm=webp`}
                  srcSet={`
                    ${HERO_IMG_BASE}?w=480&q=70&auto=format&fit=max&fm=webp 480w,
                    ${HERO_IMG_BASE}?w=640&q=70&auto=format&fit=max&fm=webp 640w,
                    ${HERO_IMG_BASE}?w=768&q=70&auto=format&fit=max&fm=webp 768w,
                    ${HERO_IMG_BASE}?w=1280&q=70&auto=format&fit=max&fm=webp 1280w`}
                  sizes="(max-width: 1023px) 100vw, 640px"
                  alt="Modern UK marketplace for serious sellers"
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── §2  TRUST STRIP ───────────────────────────────────────────────── */}
      <section className="bg-[#0A2239] py-5">
        <div className="container-market">
          <div className="flex flex-wrap justify-center gap-6 md:gap-12">
            {TRUST_STRIP.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-white">
                <Icon className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                <span className="text-sm font-semibold whitespace-nowrap">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §3  SELLER VALUE SECTION ──────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-16 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-4">
              Built for Serious Sellers — Not Casual Listings
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SELLER_VALUES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-white border border-gray-200 rounded-2xl p-7 text-center hover:shadow-lg transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 bg-[#0A2239]/10 rounded-2xl mb-5">
                  <Icon className="w-7 h-7 text-[#0A2239]" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §4a  FEATURES SECTION ────────────────────────────────────────── */}
      <FeaturesSection />

      {/* ── §4b  STATS SECTION ───────────────────────────────────────────── */}
      <StatsSection />

      {/* ── §4  CATEGORY GRID ─────────────────────────────────────────────── */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-3">
              Shop by Category
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Discover products across every major category — from everyday essentials to specialist finds.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group block rounded-xl overflow-hidden border border-gray-200 hover:border-[#D4AF37] hover:shadow-lg transition-all duration-200"
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

      {/* ── §5  HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="bg-[#F8F9FA] py-16 border-b border-gray-200">
        <div className="container-market">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#0A2239] text-white font-extrabold text-lg mb-5 shadow-md">
                  {step}
                </div>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-[#D4AF37]/20 rounded-xl">
                    <Icon className="w-5 h-5 text-[#0A2239]" />
                  </div>
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §6  STRONG CTA ────────────────────────────────────────────────── */}
      <section className="bg-[#0A2239] py-20">
        <div className="container-market text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-10">
            Turn Stock Into Revenue — Not Storage
          </h2>
          <Link
            to="/register?type=seller"
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C9A227] text-gray-900 font-extrabold px-10 py-5 rounded-xl text-base transition-colors shadow-xl"
          >
            <Store className="w-5 h-5" />
            Create Free Seller Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

    </div>
  );
}
