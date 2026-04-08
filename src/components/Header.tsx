import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, X, LogOut, Package, ShoppingBag, Heart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/loadify-logo.svg";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import CATEGORY_CONFIG from "@/lib/category-config";

/**
 * Marketplace-style header used on the homepage.
 * Layout: fixed at top-0.
 * Row 1 (h-16): Logo | Prominent search bar | Cart + auth actions
 * Row 2 (h-10, desktop only): Category quick-links
 *
 * Transparency behaviour:
 *   - At top of page: bg-transparent, no border/shadow — floats over the
 *     dark hero area seamlessly.
 *   - After 10px scroll: bg-[#0A1930]/90 backdrop-blur-md appears for
 *     readability over scrolled content.
 *
 * Auth CTA logic:
 *   - Guest: Sign In → /login | Start Selling (green) → /signup?type=seller
 *   - Logged in: Dashboard → role dashboard | Sign Out | Start Selling (green) → /pp/seller
 */
/**
 * Marketplace-style header — used on every page of the site.
 * Layout: fixed at top-0.
 * Row 1 (h-16): Logo | Prominent search bar | Cart + auth actions
 * Row 2 (h-10, desktop only): Category quick-links
 *
 * Transparency behaviour:
 *   - Homepage (default): transparent at top, becomes opaque after 10px scroll.
 *   - Inner pages: pass `forceOpaque` to always render the opaque dark-navy
 *     background from the first paint (no hero behind it).
 *
 * Auth CTA logic:
 *   - Guest: Sign In → /login | Start Selling (green) → /signup?type=seller
 *   - Logged in: Dashboard → role dashboard | Sign Out | Start Selling (green) → /pp/seller
 */
interface HeaderProps {
  /** When true the header is always opaque (use on every non-homepage page). */
  forceOpaque?: boolean;
}

const Header = ({ forceOpaque = false }: HeaderProps) => {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const opaque = forceOpaque || scrolled;

  const dashboardPath =
    user?.role === "seller" ? "/pp/seller" :
    user?.role === "admin" ? "/pp/admin" :
    "/pp/buyer";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className={[
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        opaque
          ? "bg-[#0A1930]/90 backdrop-blur-md border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
      style={{ willChange: "transform" }}
    >

      {/* ── Row 1: Logo | Search | Actions ─────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" aria-label="Loadify Market — Home" className="flex items-center gap-2 shrink-0">
          <img src={logo} alt="" aria-hidden="true" className="h-8 w-8" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-base font-bold text-white">Loadify</span>
            <span className="hidden sm:block font-display text-sm font-bold text-[#22C55E]">Market</span>
          </span>
        </Link>

        {/* Prominent search bar (center) */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto min-w-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 sm:left-4 sm:h-5 sm:w-5 text-white/40 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search marketplace"
              className="w-full h-10 sm:h-12 pl-8 sm:pl-11 pr-16 sm:pr-28 bg-white/10 border border-white/20 rounded-xl text-xs sm:text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 sm:h-9 px-2.5 sm:px-5 bg-[#22C55E] hover:bg-[#16A34A] text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
              aria-label="Search"
            >
              <span className="hidden sm:inline">Search</span>
              <Search className="sm:hidden h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </form>

        {/* Right actions (desktop) */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Link
            to="/cart"
            className="relative p-2 text-white/80 hover:text-green-400 transition-colors"
            aria-label="Shopping cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#22C55E] text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              {/* Role-specific quick links (desktop) */}
              {(user.role === "seller") && (
                <>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex" asChild>
                    <Link to="/pp/seller/products">
                      <Package className="h-4 w-4 mr-1" aria-hidden="true" /> My Products
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex" asChild>
                    <Link to="/pp/seller/orders">
                      <ShoppingBag className="h-4 w-4 mr-1" aria-hidden="true" /> Orders
                    </Link>
                  </Button>
                </>
              )}
              {(user.role === "buyer") && (
                <>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex" asChild>
                    <Link to="/pp/buyer/orders">
                      <ShoppingBag className="h-4 w-4 mr-1" aria-hidden="true" /> Orders
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white/70 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex" asChild>
                    <Link to="/pp/buyer/wishlist">
                      <Heart className="h-4 w-4 mr-1" aria-hidden="true" /> Wishlist
                    </Link>
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-green-400 hover:bg-white/10 font-medium" asChild>
                <Link to={dashboardPath}>
                  <LayoutDashboard className="h-4 w-4 mr-1" aria-hidden="true" />
                  {user.role === "admin" ? "Admin Hub" : "Dashboard"}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-green-400 hover:bg-white/10 font-medium" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" aria-hidden="true" /> Sign Out
              </Button>
              {user.role !== "admin" && (
                <Button
                  size="sm"
                  className="h-9 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black font-semibold px-5 rounded-full shadow-lg hover:shadow-green-400/30 transition-all duration-300"
                  asChild
                >
                  <Link to="/pp/seller">Start Selling</Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-green-400 hover:bg-white/10 font-medium" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-9 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black font-semibold px-5 rounded-full shadow-lg hover:shadow-green-400/30 transition-all duration-300"
                asChild
              >
                <Link to="/signup?type=seller">Start Selling</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="lg:hidden p-2 text-white/80 hover:text-green-400 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Row 2: Category quick-links (desktop only) ─────────────────── */}
      <nav aria-label="Category navigation" className="hidden lg:block border-t border-white/10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-0.5 h-12">
            <Link
              to="/catalog"
              className="shrink-0 text-sm font-bold text-white hover:text-green-400 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              All Categories
            </Link>
            <span className="w-px h-5 bg-white/10 mx-1.5 shrink-0" aria-hidden="true" />
            {CATEGORY_CONFIG.slice(0, 6).map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="flex items-center gap-1.5 shrink-0 text-sm font-semibold text-white/70 hover:text-green-400 hover:bg-white/10 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Icon className="h-4 w-4 text-white/50" aria-hidden="true" />
                  {cat.label}
                </Link>
              );
            })}
            <span className="w-px h-5 bg-white/10 mx-1.5 shrink-0" aria-hidden="true" />
            <Link
              to="/catalog"
              className="shrink-0 text-sm font-semibold text-green-400 hover:text-green-300 hover:bg-white/10 px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              More →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Mobile menu ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#0A1930]/95 backdrop-blur-md border-t border-white/10 px-4 py-4 space-y-2 shadow-lg">
          <form onSubmit={handleSearch} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              aria-label="Search marketplace"
              className="w-full h-10 pl-9 pr-20 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-green-400"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-3 bg-[#22C55E] text-white text-xs font-semibold rounded-lg"
            >
              Search
            </button>
          </form>

          <Link to="/catalog" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-white/80 hover:text-green-400 transition-colors">All Categories</Link>
          <Link to="/deals" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-white/80 hover:text-green-400 transition-colors">Deals</Link>
          {user?.role === "seller" && (
            <>
              <Link to="/pp/seller/products" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium text-white/80 hover:text-green-400 transition-colors">
                <Package className="h-4 w-4" /> My Products
              </Link>
              <Link to="/pp/seller/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium text-white/80 hover:text-green-400 transition-colors">
                <ShoppingBag className="h-4 w-4" /> Orders
              </Link>
            </>
          )}
          {user?.role === "buyer" && (
            <>
              <Link to="/pp/buyer/orders" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium text-white/80 hover:text-green-400 transition-colors">
                <ShoppingBag className="h-4 w-4" /> My Orders
              </Link>
              <Link to="/pp/buyer/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm font-medium text-white/80 hover:text-green-400 transition-colors">
                <Heart className="h-4 w-4" /> Wishlist
              </Link>
            </>
          )}

          <div className="flex gap-2 pt-2 border-t border-white/10">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="flex-1 text-white/80 hover:text-green-400 hover:bg-white/10" asChild>
                  <Link to={dashboardPath} onClick={() => setMobileOpen(false)}>
                    {user.role === "admin" ? "Admin Hub" : "Dashboard"}
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="flex-1 border-white/20 text-white/80 hover:bg-white/10" onClick={() => { setMobileOpen(false); handleLogout(); }}>
                  Sign Out
                </Button>
                {user.role !== "admin" && (
                  <Button size="sm" className="flex-1 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold" asChild>
                    <Link to="/pp/seller" onClick={() => setMobileOpen(false)}>Start Selling</Link>
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1 text-white/80 hover:text-green-400 hover:bg-white/10" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
                <Button size="sm" className="flex-1 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold" asChild>
                  <Link to="/signup?type=seller" onClick={() => setMobileOpen(false)}>Start Selling</Link>
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
