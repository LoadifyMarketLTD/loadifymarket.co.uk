import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/loadify-logo.svg";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import MobileDrawer from "@/components/MobileDrawer";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryNode } from "@/hooks/useCategories";

/**
 * Marketplace-style desktop header — always renders with the opaque dark-navy background.
 * Fixed at top-0 on every public-marketplace page.
 * Row 1 (h-16): Hamburger (LEFT, all sizes) | Logo | Search | Cart + auth actions
 * Row 2 (h-12): Category quick-links
 *
 * On mobile viewports (< 768 px) this header is always hidden via `hidden md:block`.
 * Each mobile page provides its own mobile-specific header (MobileAppHeader, back-button
 * bar, etc.).  The MobileAppLayout shell (used automatically by MainLayout on mobile)
 * provides MobileBottomNav for in-app navigation.
 */

const Header = () => {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { categories } = useCategories();

  useEffect(() => {
    setHoveredCat(null);
  }, []);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setHoveredCat(null), 80);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

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

  // Priority order for the category quick-links bar (canonical slugs from migration 400).
  // Shown in this order; any slug not yet in the DB is silently skipped.
  const PRIORITY_SLUGS = [
    "electronics",
    "clothing-fashion",
    "home-garden",
    "health-beauty",
    "sports-fitness",
    "automotive",
  ];

  const priorityCategories = PRIORITY_SLUGS
    .map((slug) => categories.find((c) => c.slug === slug))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  // Fall back to the first 6 DB categories if none of the priority slugs are
  // found (e.g. legacy DB that hasn't run migration 400 yet).
  const displayCategories =
    priorityCategories.length > 0 ? priorityCategories : categories.slice(0, 6);

  const navLinks = [
    { to: "/", label: "HOME", strong: true, catSlug: null as string | null },
    { to: "/catalog", label: "All Categories", strong: true, catSlug: null as string | null },
    ...displayCategories.map((cat) => ({
      to: `/catalog?category=${encodeURIComponent(cat.name)}`,
      label: cat.name,
      strong: false,
      catSlug: cat.slug,
    })),
    { to: "/catalog", label: "More →", strong: true, catSlug: null as string | null },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 bg-[linear-gradient(180deg,#121A2B,#0A0E1A)] border-b border-white/[0.06] shadow-[0_8px_25px_rgba(0,0,0,0.35)] hidden md:block"
      style={{ willChange: "transform", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >

      {/* ── Row 1: Hamburger | Logo | Search | Actions ──────────────────── */}
      <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] md:h-[72px] flex items-center gap-4">

        {/* Hamburger — LEFT side, all screen sizes */}
        <button
          className="p-2.5 text-muted-foreground bg-white/[0.10] hover:text-primary hover:bg-white/[0.18] active:bg-white/[0.22] rounded-xl transition-all shrink-0 ring-1 ring-white/20"
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
            <span className="hidden sm:block font-display text-[13px] font-bold text-primary tracking-tight">Market</span>
          </span>
        </Link>

        {/* Prominent search bar — hidden on mobile, visible md+ */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto min-w-0">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 h-4 w-4 sm:left-4 sm:h-[18px] sm:w-[18px] text-white/35 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, sellers..."
              aria-label="Search marketplace"
              className="w-full h-11 sm:h-[46px] pl-9 sm:pl-11 pr-10 sm:pr-28 bg-[rgba(15,23,42,0.85)] border border-white/[0.08] rounded-2xl text-xs sm:text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 sm:h-[34px] px-3 sm:px-5 bg-primary hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(212,175,55,0.25)] text-background text-xs sm:text-[13px] font-bold rounded-xl transition-all duration-250"
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
          className="lg:hidden relative p-2.5 text-muted-foreground hover:text-primary hover:-translate-y-0.5 hover:drop-shadow-[0_0_7px_rgba(212,175,55,0.35)] hover:bg-white/10 rounded-xl transition-all shrink-0"
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-0.5">
              {cartCount}
            </span>
          )}
        </Link>

        {/* Right actions (desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Link
            to="/cart"
            className="relative p-2.5 text-muted-foreground hover:text-primary hover:-translate-y-0.5 hover:drop-shadow-[0_0_7px_rgba(212,175,55,0.35)] hover:bg-white/10 rounded-xl transition-all"
            aria-label="Shopping cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to={dashboardPath}>
                  <LayoutDashboard className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  {user.role === "admin" ? "Admin Hub" : "Dashboard"}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-white/10 font-medium rounded-xl transition-all" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/#how-it-works-buyers">For Buyers</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/#how-it-works-sellers">For Sellers</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/help">Help</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-9 bg-primary border border-[rgba(212,175,55,0.35)] text-background font-bold px-5 rounded-xl shadow-[0_6px_16px_rgba(212,175,55,0.25)] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(212,175,55,0.28),0_10px_24px_rgba(0,0,0,0.40)] transition-all duration-250 ml-1"
                asChild
              >
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Row 2: Category quick-links (desktop only) ──────────────────── */}
      <nav aria-label="Category navigation" className="hidden md:block border-t border-white/[0.08]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="h-[50px] overflow-x-auto scrollbar-none">
            <div className="grid grid-flow-col auto-cols-fr items-center justify-between min-w-[980px] lg:min-w-0 gap-x-8 h-full">
              {navLinks.map((link) => {
                const catNode: CategoryNode | undefined = link.catSlug
                  ? categories.find((c) => c.slug === link.catSlug)
                  : undefined;
                const hasChildren = !!catNode && catNode.children.length > 0;
                const isHovered = hoveredCat === link.to;
                return (
                  <div
                    key={`${link.to}-${link.label}`}
                    className="relative h-full flex items-center"
                    onMouseEnter={() => { cancelClose(); if (hasChildren) setHoveredCat(link.to); }}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      to={link.to}
                      className={[
                        "nav-cat-link text-[13px] font-semibold text-[#E5E7EB] hover:text-primary hover:-translate-y-px hover:[text-shadow:0_0_8px_rgba(212,175,55,0.25)] hover:bg-white/[0.08] px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap text-center w-full",
                        isHovered ? "bg-white/[0.08] text-primary" : "",
                      ].join(" ")}
                    >
                      {link.label}
                    </Link>
                    {hasChildren && isHovered && (
                      <div
                        className="absolute top-full left-0 z-50 min-w-[180px] rounded-xl border border-white/[0.12] shadow-2xl overflow-hidden"
                        style={{ background: "rgba(14,21,32,1)", marginTop: "2px" }}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        {catNode.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/category/${child.slug}`}
                            className="flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-white/75 hover:text-white hover:bg-white/[0.08] transition-colors"
                            onClick={() => setHoveredCat(null)}
                          >
                            {child.name}
                            {child.children?.length > 0 && (
                              <ChevronRight className="h-3.5 w-3.5 text-white/40 shrink-0" />
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
