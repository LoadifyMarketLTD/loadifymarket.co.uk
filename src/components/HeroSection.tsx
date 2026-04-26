import { Link } from 'react-router-dom';
import { ShieldCheck, CreditCard, BadgeCheck, Tag } from 'lucide-react';

const HERO_BULLETS = [
  'Free to list — no hidden fees',
  '0% commission until 1 July 2026',
  'Fast Stripe payouts to your bank',
];

const TRUST_ITEMS = [
  {
    icon: CreditCard,
    label: 'Stripe Secured Payments',
    desc: 'Every transaction encrypted end-to-end',
  },
  {
    icon: BadgeCheck,
    label: 'Verified UK Sellers',
    desc: 'Identity-checked before they can list',
  },
  {
    icon: ShieldCheck,
    label: 'UK-Based Marketplace',
    desc: 'Registered & operated in the United Kingdom',
  },
  {
    icon: Tag,
    label: '0% Commission Until 1 July 2026',
    desc: 'No hidden fees — list and sell for free',
  },
];

const HeroSection = () => (
  <section
    aria-label="Loadify Market — UK Online Marketplace"
    className="w-full bg-white pt-[122px] py-20"
  >
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">

        {/* ── Left column (7 cols) ─────────────────────────────────────── */}
        <div className="md:col-span-7 flex flex-col gap-5 text-center md:text-left items-center md:items-start">

          {/* 1. Promo badge */}
          <div className="inline-flex items-center gap-2 bg-green-600 text-white text-xs font-bold rounded-full px-4 py-1.5">
            <span aria-hidden="true">⚡</span>
            <span>0% Commission Until 1 July 2026</span>
          </div>

          {/* 2. Label */}
          <span className="text-sm font-medium text-green-600 tracking-wide uppercase">
            UK Multi Category Marketplace
          </span>

          {/* 3. H1 */}
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-gray-900">
            Sell Across the UK — Reach More Buyers
          </h1>

          {/* 4. Paragraph */}
          <p className="text-lg text-gray-700 max-w-xl">
            List your products or services for free and connect with verified UK buyers. No setup fees, no monthly charges.
          </p>

          {/* 5. Bullet points */}
          <ul className="flex flex-col gap-2">
            {HERO_BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-base text-gray-700">
                <span className="text-green-600 font-bold text-lg leading-none" aria-hidden="true">✓</span>
                {b}
              </li>
            ))}
          </ul>

          {/* 6. CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              to="/register?type=seller"
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl text-center transition-colors"
            >
              Start Selling — It's Free
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto border border-green-600 text-green-600 hover:bg-green-50 font-semibold px-8 py-4 rounded-xl text-center transition-colors"
            >
              Create Buyer Account
            </Link>
          </div>

          {/* 7. Social proof */}
          <p className="text-sm text-gray-500 italic">
            Join our early sellers — priority homepage placement for new sellers.
          </p>
        </div>

        {/* ── Right column (5 cols) ────────────────────────────────────── */}
        <div className="md:col-span-5 relative rounded-xl overflow-hidden min-h-[320px] md:min-h-[460px]">

          {/* Hero image */}
          <img
            src="/hero-marketplace.jpg"
            alt="Loadify Market — UK Online Marketplace"
            width={1536}
            height={1024}
            className="w-full h-full object-cover object-center absolute inset-0"
            loading="eager"
          />

          {/* Gradient overlay: white → transparent, left to right */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.35) 0%, transparent 60%)' }}
            aria-hidden="true"
          />

          {/* Trust strip — bottom overlay */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200"
            aria-label="Platform trust features"
          >
            {TRUST_ITEMS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2 px-3 py-3">
                <span className="w-7 h-7 bg-green-50 rounded-md flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-green-700" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-gray-900 leading-tight">{label}</p>
                  <p className="text-[9px] text-gray-500 leading-tight mt-0.5 hidden md:block">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  </section>
);

export default HeroSection;
