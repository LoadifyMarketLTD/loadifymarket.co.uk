import { Link } from "react-router-dom";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-16 bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4">

        {/* 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Column 1 — Brand / Description */}
          <div>
            <p className="text-xl font-bold text-white mb-4">Loadify Market</p>
            <p className="text-sm text-gray-400 max-w-xs">
              A UK-based multi-category marketplace connecting buyers and sellers with secure payments and modern tools.
            </p>
            <p className="text-sm text-gray-400 mt-3">Operated by Loadify Market LTD (UK).</p>
          </div>

          {/* Column 2 — Marketplace */}
          <div>
            <p className="text-sm font-semibold text-gray-200 uppercase mb-4">Marketplace</p>
            <ul className="space-y-2">
              {[
                { to: "/catalog", label: "Browse Categories" },
                { to: "/#how-it-works-buyers", label: "How It Works for Buyers" },
                { to: "/#how-it-works-sellers", label: "How It Works for Sellers" },
                { to: "/features", label: "Features" },
              ].map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — For Sellers */}
          <div>
            <p className="text-sm font-semibold text-gray-200 uppercase mb-4">For Sellers</p>
            <ul className="space-y-2">
              {[
                { to: "/register-seller", label: "Create Seller Account" },
                { to: "/seller", label: "Seller Dashboard" },
                { to: "/seller-terms", label: "Pricing & Fees" },
                { to: "/help", label: "Help Centre" },
              ].map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Legal & Company */}
          <div>
            <p className="text-sm font-semibold text-gray-200 uppercase mb-4">Legal &amp; Company</p>
            <ul className="space-y-2">
              {[
                { to: "/terms", label: "Terms & Conditions" },
                { to: "/privacy", label: "Privacy Policy" },
                { to: "/cookies", label: "Cookie Policy" },
                { to: "/contact", label: "Contact" },
              ].map((link) => (
                <li key={link.to + link.label}>
                  <Link to={link.to} className="text-sm text-gray-400 hover:text-gray-200 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-3">Registered in England &amp; Wales.</p>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {currentYear} Loadify Market LTD. All rights reserved.
          </p>
          <p className="text-xs text-gray-500">
            Built with Stripe, Supabase, and modern web standards.
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
