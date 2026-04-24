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
    className="w-full flex flex-col lg:flex-row lg:items-stretch overflow-hidden bg-white"
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

    {/* Left: text content (45%) — padded */}
    <div className="w-full lg:w-[45%] flex flex-col text-center lg:text-left items-center lg:items-start px-6 sm:px-10 lg:px-16 py-10">
      <span className="text-xs font-medium uppercase tracking-wide text-green-600 mb-3">
        UK Multi-Category Marketplace
      </span>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 mb-4">
        Buy &amp; Sell Across the UK
      </h1>

      <p className="text-sm text-gray-500 mb-6">
        For individuals and businesses • Single items or bulk stock • Secure payments with Stripe
      </p>

      {/* CTA row */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mb-6">
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

      {/* Seller feature strip */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 justify-center lg:justify-start">
        {HERO_FEATURES.map((f) => (
          <span key={f} className="text-[11px] text-gray-600 flex items-center gap-1.5">
            <span className="text-[#15803d] font-bold">✓</span> {f}
          </span>
        ))}
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
