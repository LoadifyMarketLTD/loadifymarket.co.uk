import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/loadify-logo.svg";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import { supabase } from "@/lib/supabase";
import CATEGORY_CONFIG from "@/lib/category-config";

/**
 * Marketplace-style header used exclusively on the homepage (pixel-perfect/Index.tsx).
 * Layout: fixed below TopBar (top-10).
 * Row 1 (h-16): Logo | Prominent search bar | Cart + auth actions
 * Row 2 (h-10, desktop only): Category quick-links
 */
const Header = () => {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "seller" ? "/pp/seller" :
    user?.role === "admin" || user?.role === "owner" ? "/pp/admin" :
    "/pp/buyer";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
  };

  return (
    <header className="fixed top-10 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">

      {/* ── Row 1: Logo | Search | Actions ─────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="Loadify Market" className="h-8 w-8" />
          <span className="font-display text-lg font-bold text-[#0F172A] whitespace-nowrap hidden sm:block">
            Loadify <span className="text-[#2563EB]">Market</span>
          </span>
        </Link>

        {/* Prominent search bar (center) */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto">
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-5 w-5 text-[#94A3B8] pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, sellers..."
              aria-label="Search marketplace"
              className="w-full h-12 pl-11 pr-28 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Search
            </button>
          </div>
        </form>

        {/* Right actions (desktop) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link
            to="/cart"
            className="relative p-2 text-[#64748B] hover:text-[#0F172A] transition-colors"
            aria-label="Shopping cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Button variant="ghost" size="sm" className="text-[#334155] font-medium" asChild>
                <Link to={dashboardPath}>
                  <User className="h-4 w-4 mr-1" aria-hidden="true" /> Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-[#334155] font-medium" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" aria-hidden="true" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-[#334155] font-medium" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-9 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-5 rounded-lg"
                asChild
              >
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 text-[#334155]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Row 2: Category quick-links (desktop only) ─────────────────── */}
      <nav aria-label="Category navigation" className="hidden lg:block border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-0.5 h-10 overflow-x-auto">
            <Link
              to="/catalog"
              className="shrink-0 text-xs font-semibold text-[#334155] hover:text-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              All Categories
            </Link>
            <span className="w-px h-4 bg-gray-200 mx-1 shrink-0" aria-hidden="true" />
            {CATEGORY_CONFIG.slice(0, 8).map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="flex items-center gap-1.5 shrink-0 text-xs font-medium text-[#334155] hover:text-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Icon className={`h-3.5 w-3.5 ${cat.iconColor}`} aria-hidden="true" />
                  {cat.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-2 shadow-lg">
          <form onSubmit={handleSearch} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search marketplace"
              className="w-full h-10 pl-9 pr-20 bg-[#F1F5F9] border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:border-[#2563EB]"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-[#2563EB] text-white text-xs font-semibold rounded-lg"
            >
              Search
            </button>
          </form>

          <Link to="/catalog" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#334155]">All Categories</Link>
          <Link to="/clearance" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-[#334155]">Deals</Link>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to={dashboardPath} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setMobileOpen(false); handleLogout(); }}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
                <Button size="sm" className="flex-1 bg-[#2563EB] hover:bg-[#1D4ED8] text-white" asChild>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
