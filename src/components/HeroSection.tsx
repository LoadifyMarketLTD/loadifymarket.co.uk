import { Link } from 'react-router-dom';

const HERO_FEATURES = [
  'Free to list',
  '0% Commission until 31 Dec 2026',
  'Fast Stripe payouts',
  'Seller dashboard included',
];

const HeroSection = () => (
  <section
    aria-label="Loadify Market — UK Online Marketplace"
    className="w-full flex flex-col lg:flex-row lg:items-stretch overflow-hidden bg-white pt-[122px]"
  >
    {/* Mobile: image on top */}
    <div className="w-full lg:hidden">
      <img
        src="/hero-marketplace.jpg"
        alt="Loadify Market — UK Online Marketplace"
        width={1536}
        height={1024}
        className="w-full max-h-[260px] object-cover object-center"
        loading="eager"
      />
    </div>

    {/* Left: text content (45%) — padded, min-height to balance right image */}
    <div className="w-full lg:w-[45%] flex flex-col justify-center text-center lg:text-left items-center lg:items-start px-6 sm:px-10 lg:px-16 py-12 lg:py-16 min-h-[440px] lg:min-h-[520px]">

      {/* 1. Prominent commission badge */}
      <div className="inline-flex items-center gap-2 bg-[#22C55E] text-white text-xs font-black uppercase tracking-widest px-4 py-2 mb-4">
        <span aria-hidden="true">★</span>
        <span>0% Commission Until 31 December 2026</span>
      </div>

      {/* 2. Label */}
      <span className="text-xs font-medium uppercase tracking-wide text-green-600 mb-3">
        UK Multi-Category Marketplace
      </span>

      {/* 3. Main heading — seller-focused */}
      <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-tight text-gray-900 mb-3">
        Sell Across the UK.<br className="hidden sm:block" /> Reach UK Buyers.
      </h1>

      {/* 4. Description */}
      <p className="text-xl text-gray-800 font-medium mb-2">
        List your products and services — from single items to bulk deals.
      </p>

      {/* 5. Support line */}
      <p className="text-lg text-gray-700 font-medium mb-5">
        For individuals and businesses • Physical products &amp; services • Secure Stripe payouts
      </p>

      {/* 6. Feature bullets */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center lg:justify-start w-full mb-4">
        {HERO_FEATURES.map((f) => (
          <span key={f} className="text-sm lg:text-base font-semibold text-gray-700 flex items-center gap-1.5">
            <span className="text-[#15803d] font-bold">✓</span> {f}
          </span>
        ))}
      </div>

      {/* 7. Founding seller social proof */}
      <p className="text-sm text-gray-500 italic mb-8 w-full">
        Be one of our founding sellers — early sellers receive priority placement on the homepage.
      </p>

      {/* 8. CTA row — Start Selling first (primary) */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Link
          to="/register?type=seller"
          className="bg-[#22C55E] hover:bg-[#16a34a] text-white px-6 py-3 font-semibold text-sm transition-colors text-center"
        >
          Start Selling — It's Free
        </Link>
        <Link
          to="/register"
          className="border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 font-semibold text-sm transition-colors text-center"
        >
          Create Buyer Account
        </Link>
        <Link
          to="/catalog"
          className="text-[#15803d] hover:underline px-6 py-3 font-semibold text-sm transition-colors text-center"
        >
          Browse Marketplace →
        </Link>
      </div>
    </div>

    {/* Right: hero image (55%) — desktop only, with founding-seller overlay */}
    <div className="hidden lg:block lg:w-[55%] self-stretch relative">
      <img
        src="/hero-marketplace.jpg"
        alt="Loadify Market — UK Online Marketplace"
        width={1536}
        height={1024}
        className="w-full h-full object-cover object-center"
        loading="eager"
      />
      {/* Overlay badge */}
      <div className="absolute bottom-8 left-8 bg-white/95 border border-gray-200 shadow-lg px-5 py-4 max-w-[280px]">
        <p className="text-xs font-black uppercase tracking-widest text-[#15803d] mb-1">Founding Sellers</p>
        <p className="text-base font-bold text-gray-900 leading-tight">Join now — list for free, sell from day one.</p>
        <p className="text-xs text-gray-500 mt-1">No commission until 31 Dec 2026</p>
      </div>
    </div>
  </section>
);

export default HeroSection;
