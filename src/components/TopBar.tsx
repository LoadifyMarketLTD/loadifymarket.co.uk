import { Link } from "react-router-dom";

const TopBar = () => (
  <div className="fixed top-0 left-0 right-0 z-50 bg-[#0F2D52] text-white h-10 flex items-center">
    <div className="container mx-auto px-4 flex items-center justify-between">
      <span className="text-[11px] text-blue-200 hidden sm:block">
        🇬🇧 UK's #1 Trusted B2B Marketplace — Verified Sellers, Secure Payments
      </span>
      <span className="text-[11px] text-blue-200 sm:hidden">🇬🇧 UK's #1 Marketplace</span>
      <div className="flex items-center gap-3 text-[11px] text-blue-200">
        <Link to="/contact" className="hover:text-white transition-colors">Help</Link>
        <span className="opacity-40">|</span>
        <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
        <span className="opacity-40">|</span>
        <Link to="/signup" className="hover:text-white transition-colors font-semibold text-white">
          Register
        </Link>
      </div>
    </div>
  </div>
);

export default TopBar;
