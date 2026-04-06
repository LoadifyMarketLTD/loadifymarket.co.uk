import { Link } from "react-router-dom";

const TopBar = () => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-[#0F2D52] text-white h-10 flex items-center">
    <div className="container mx-auto px-4 flex items-center justify-between">
      {/* Tagline — progressive disclosure: more detail as viewport widens */}
      <span className="text-[11px] text-gray-300 hidden xl:block">
        🇬🇧 UK Multi-Category Marketplace — Registered Sellers, Secure Checkout
      </span>
      <span className="text-[11px] text-gray-300 hidden sm:block xl:hidden">
        🇬🇧 UK Multi-Category Marketplace
      </span>
      <span className="text-[11px] text-gray-300 sm:hidden">🇬🇧 Loadify Market</span>

      {/* Utility links */}
      <nav aria-label="Utility links" className="flex items-center gap-2.5 text-[11px] text-gray-300">
        <Link to="/contact" className="hover:text-white transition-colors">Help</Link>
        <span className="opacity-30 select-none" aria-hidden="true">|</span>
        <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
        <span className="opacity-30 select-none" aria-hidden="true">|</span>
        <Link to="/signup" className="hover:text-white transition-colors font-semibold text-white">
          Register
        </Link>
      </nav>
    </div>
  </div>
);

export default TopBar;
