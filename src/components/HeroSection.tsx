import { Link } from 'react-router-dom';

const HeroSection = () => (
  <section
    aria-label="Loadify Market — UK Online Marketplace"
    className="w-full flex flex-col lg:flex-row items-center px-6 sm:px-10 lg:px-16 py-10 gap-8"
  >
    {/* Mobile: image on top */}
    <div className="w-full lg:hidden">
      <img
        src="/hero-marketplace.jpg"
        alt="Loadify Market — UK Online Marketplace"
        className="w-full max-h-[300px] object-cover object-center rounded-xl"
        loading="eager"
      />
    </div>

    {/* Left: text content (40%) */}
    <div className="w-full lg:w-[40%] flex flex-col text-center lg:text-left items-center lg:items-start">
      <span className="text-xs font-medium uppercase tracking-wide text-green-600 mb-3">
        UK Multi-Category Marketplace
      </span>

      <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 mb-4">
        Buy &amp; Sell Across the UK
      </h1>

      <p className="text-base sm:text-lg text-gray-600 max-w-xl mb-6">
        A modern UK marketplace where individuals and businesses can buy and sell products across multiple categories — from single items to bulk stock.
      </p>

      <div className="flex gap-4 flex-wrap justify-center lg:justify-start mb-6">
        <Link
          to="/catalog"
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-colors"
        >
          Browse Marketplace
        </Link>
        <Link
          to="/register?type=seller"
          className="border border-gray-300 hover:bg-gray-100 text-gray-800 px-6 py-3 rounded-xl font-medium transition-colors"
        >
          Start Selling
        </Link>
      </div>

      <p className="text-sm text-gray-500 flex flex-wrap gap-4 justify-center lg:justify-start">
        For individuals and businesses • Single items or bulk stock • Secure payments with Stripe
      </p>
    </div>

    {/* Right: hero image (60%) — desktop only */}
    <div className="hidden lg:block lg:w-[60%] h-full">
      <img
        src="/hero-marketplace.jpg"
        alt="Loadify Market — UK Online Marketplace"
        className="w-full h-full object-cover object-center rounded-xl"
        loading="eager"
      />
    </div>
  </section>
);

export default HeroSection;
