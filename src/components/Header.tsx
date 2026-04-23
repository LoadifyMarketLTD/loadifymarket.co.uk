import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, LogOut, Package, ShoppingBag, Heart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/loadify-logo.svg";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import { isActiveSellerAccess } from "@/lib/roleUtils";
import MobileDrawer from "@/components/MobileDrawer";
import { useCategories } from "@/hooks/useCategories";

/**
 * Marketplace-style header — used on every page of the site.
 * Layout: fixed at top-0.
 * Row 1 (h-16): Hamburger (mobile, LEFT) | Logo | Search | Cart + auth actions
 * Row 2 (h-12, desktop only): Category quick-links
 *
 * Transparency behaviour:
 *   - Homepage (default): transparent at top, becomes opaque after 10px scroll.
 *   - Inner pages: pass `forceOpaque` to always render the opaque dark-navy
 *     background from the first paint (no hero behind it).
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
  const { categories } = useCategories();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const opaque = forceOpaque || scrolled;

  const dashboardPath =
    user?.role === "seller" ? "/seller" :
    user?.role === "admin" ? "/admin" :
    "/buyer";

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
          ? "bg-[#0A1930]/95 backdrop-blur-md border-b border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.45)]"
          : "bg-transparent border-b border-transparent",
      ].join(" ")}
      style={{ willChange: "transform", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >

      {/* ── Row 1: Hamburger | Logo | Search | Actions ──────────────────── */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center gap-4">

        {/* Hamburger — LEFT side, all screen sizes */}
        <button
          className="p-2.5 text-white/80 hover:text-green-400 hover:bg-white/10 active:bg-white/15 rounded-xl transition-all shrink-0"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <Menu size={22} aria-hidden="true" />
        </button>

        {/* Logo */}
        <Link to="/" aria-label="Loadify Market — Home" className="flex items-center gap-2.5 shrink-0 ml-0.5">
          <img src={logo} alt="" aria-hidden="true" className="h-9 w-9" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-bold text-white tracking-tight">Loadify</span>
            <span className="hidden sm:block font-display text-[13px] font-bold text-[#22C55E] tracking-tight">Market</span>
          </span>
        </Link>

        {/* Prominent search bar (center) */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl mx-auto min-w-0">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 sm:left-4 sm:h-[18px] sm:w-[18px] text-white/35 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, sellers..."
              aria-label="Search marketplace"
              className="w-full h-11 sm:h-[46px] pl-9 sm:pl-11 pr-10 sm:pr-28 bg-white/[0.09] border border-white/20 rounded-2xl text-xs sm:text-sm text-white placeholder:text-white/35 focus:outline-none focus:bg-white/[0.13] focus:border-green-400/70 focus:ring-2 focus:ring-green-400/15 transition-all duration-200"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 sm:h-[34px] px-3 sm:px-5 bg-[#22C55E] hover:bg-[#16A34A] active:bg-[#15803d] text-white text-xs sm:text-[13px] font-semibold rounded-xl transition-colors"
              aria-label="Search"
            >
              <span className="hidden sm:inline">Search</span>
              <Search className="sm:hidden h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </form>

        {/* Mobile cart icon */}
        <Link
          to="/cart"
          className="lg:hidden relative p-2.5 text-white/75 hover:text-green-400 hover:bg-white/10 rounded-xl transition-all shrink-0"
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#22C55E] text-white text-[10px] font-bold flex items-center justify-center px-0.5">
              {cartCount}
            </span>
          )}
        </Link>

        {/* Right actions (desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Link
            to="/cart"
            className="relative p-2.5 text-white/75 hover:text-green-400 hover:bg-white/10 rounded-xl transition-all"
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
              {isActiveSellerAccess(user) && (
                <>
                  <Button variant="ghost" size="sm" className="text-white/65 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex rounded-xl" asChild>
                    <Link to="/seller/products">
                      <Package className="h-4 w-4 mr-1.5" aria-hidden="true" /> My Products
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white/65 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex rounded-xl" asChild>
                    <Link to="/seller/orders">
                      <ShoppingBag className="h-4 w-4 mr-1.5" aria-hidden="true" /> Orders
                    </Link>
                  </Button>
                </>
              )}
              {(user.role === "buyer") && (
                <>
                  <Button variant="ghost" size="sm" className="text-white/65 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex rounded-xl" asChild>
                    <Link to="/buyer/orders">
                      <ShoppingBag className="h-4 w-4 mr-1.5" aria-hidden="true" /> Orders
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="text-white/65 hover:text-green-400 hover:bg-white/10 font-medium hidden xl:flex rounded-xl" asChild>
                    <Link to="/buyer/wishlist">
                      <Heart className="h-4 w-4 mr-1.5" aria-hidden="true" /> Wishlist
                    </Link>
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" className="text-white/75 hover:text-green-400 hover:bg-white/10 font-medium rounded-xl" asChild>
                <Link to={dashboardPath}>
                  <LayoutDashboard className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  {user.role === "admin" ? "Admin Hub" : "Dashboard"}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/75 hover:text-green-400 hover:bg-white/10 font-medium rounded-xl" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" /> Sign Out
              </Button>
              {user.role !== "admin" && user.role !== "seller" && (
                <Button
                  size="sm"
                  className="h-9 bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:from-[#4ade80] hover:to-[#22C55E] text-black font-semibold px-5 rounded-full shadow-lg shadow-green-500/20 hover:shadow-green-400/30 transition-all duration-300 ml-1"
                  asChild
                >
                  <Link to="/seller">Start Selling</Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-white/75 hover:text-green-400 hover:bg-white/10 font-medium rounded-xl" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-9 bg-gradient-to-r from-[#22C55E] to-[#16a34a] hover:from-[#4ade80] hover:to-[#22C55E] text-black font-semibold px-5 rounded-full shadow-lg shadow-green-500/20 hover:shadow-green-400/30 transition-all duration-300 ml-1"
                asChild
              >
                <Link to="/signup?type=seller">Start Selling</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Category quick-links ────────────────────────────────── */}
      <nav aria-label="Category navigation" className="border-t border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0.5 h-[50px] overflow-x-auto scrollbar-none">
            <Link
              to="/catalog"
              className="shrink-0 text-[13px] font-bold text-white hover:text-green-400 hover:bg-white/[0.08] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              All Categories
            </Link>
            <span className="w-px h-4 bg-white/10 mx-2 shrink-0" aria-hidden="true" />
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.slug}
                to={`/catalog?category=${encodeURIComponent(cat.name)}`}
                className="flex items-center gap-1.5 shrink-0 text-[13px] font-medium text-white/60 hover:text-green-400 hover:bg-white/[0.08] px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
            <span className="w-px h-4 bg-white/10 mx-2 shrink-0" aria-hidden="true" />
            <Link
              to="/catalog"
              className="shrink-0 text-[13px] font-semibold text-green-400 hover:text-green-300 hover:bg-white/[0.08] px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              More →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer (renders via portal) ─────────────────────────── */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        dashboardPath={dashboardPath}
        onLogout={handleLogout}
      />
    </header>
  );
};

export default Header;
