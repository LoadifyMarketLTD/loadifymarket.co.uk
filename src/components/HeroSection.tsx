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
    className="w-full flex flex-col lg:flex-row lg:items-stretch overflow-hidden bg-white pt-[138px] lg:pt-[142px]"
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
      {/* 1. Label */}
      <span className="text-xs font-medium uppercase tracking-wide text-green-600 mb-3">
        UK Multi-Category Marketplace
      </span>

      {/* 2. Main heading */}
      <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-extrabold leading-tight text-gray-900 mb-3">
        Buy &amp; Sell Across the UK
      </h1>

      {/* 3. Description */}
      <p className="text-xl text-gray-800 font-medium mb-2">
        Buy and sell across the UK — from single items to bulk deals.
      </p>

      {/* 4. Support line */}
      <p className="text-lg text-gray-700 font-medium mb-5">
        For individuals and businesses • Single items or bulk stock • Secure payments with Stripe
      </p>

      {/* 5. Start Selling — inline, no card */}
      <p className="text-lg font-black text-gray-950 uppercase tracking-tight mb-1 w-full">
        Start Selling on Loadify Market
      </p>
      <p className="text-base text-gray-800 font-medium mb-1 w-full">
        Start selling your products and reach buyers across the UK marketplace.
      </p>
      <p className="text-base lg:text-lg font-bold text-[#15803d] mb-3 w-full">
        0% Commission until 31 December 2026 — then a simple 7% on completed sales.
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center lg:justify-start w-full mb-10">
        {HERO_FEATURES.map((f) => (
          <span key={f} className="text-sm lg:text-base font-semibold text-gray-700 flex items-center gap-1.5">
            <span className="text-[#15803d] font-bold">✓</span> {f}
          </span>
        ))}
      </div>

      {/* 6. CTA row */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Link
          to="/catalog"
          className="bg-[#22C55E] hover:bg-[#16a34a] text-white px-6 py-3 font-semibold text-sm transition-colors text-center"
        >
          Browse Marketplace
        </Link>
        <Link
          to="/register"
          className="border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 font-semibold text-sm transition-colors text-center"
        >
          Create Buyer Account
        </Link>
        <Link
          to="/register?type=seller"
          className="border border-[#22C55E] text-[#15803d] hover:bg-[#22C55E] hover:text-white px-6 py-3 font-semibold text-sm transition-colors text-center"
        >
          Start Selling
        </Link>
      </div>
    </div>

    {/* Right: hero image (55%) — desktop only, no padding, touches right edge */}
    <div className="hidden lg:block lg:w-[55%] self-stretch">
      <img
        src="/hero-marketplace.jpg"
        alt="Loadify Market — UK Online Marketplace"
        width={1536}
        height={1024}
        className="w-full h-full object-cover object-center"
        loading="eager"
      />
    </div>
  </section>
);

export default HeroSection;
