import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/loadify-logo.svg";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import MobileDrawer from "@/components/MobileDrawer";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryNode } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";

const Header = () => {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { categories } = useCategories();

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
    await supabase.auth.signOut();
    logout();
    navigate("/login", { replace: true });
  };

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
      className="fixed top-0 left-0 right-0 z-40 bg-[#0A234F] border-b border-white/10 shadow-[0_8px_25px_rgba(10,35,79,0.32)] hidden md:block"
      style={{ willChange: "transform", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8 h-[60px] md:h-[72px] flex items-center gap-4">
        <button
          className="p-2.5 text-white/75 bg-[#0B2F6B] hover:text-[#F5A300] hover:bg-[#123F82] active:bg-[#123F82] rounded-xl transition-all shrink-0 ring-1 ring-white/20"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <Menu size={22} aria-hidden="true" />
        </button>

        <Link to="/" aria-label="Loadify Market — Home" className="flex items-center gap-2.5 shrink-0 ml-0.5">
          <img src={logo} alt="" aria-hidden="true" className="h-9 w-9" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-[15px] font-bold text-white tracking-tight">Loadify</span>
            <span className="hidden sm:block font-display text-[13px] font-bold text-[#F5A300] tracking-tight">Market</span>
          </span>
        </Link>

        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-auto min-w-0">
          <div className="relative flex items-center w-full">
            <Search className="absolute left-3.5 h-4 w-4 sm:left-4 sm:h-[18px] sm:w-[18px] text-white/55 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, categories, sellers..."
              aria-label="Search marketplace"
              className="w-full h-11 sm:h-[46px] pl-9 sm:pl-11 pr-10 sm:pr-28 bg-[#0B2F6B] border border-white/15 rounded-2xl text-xs sm:text-sm text-white placeholder:text-white/55 focus:outline-none focus:border-[#F5A300]/50 focus:ring-2 focus:ring-[#F5A300]/15 transition-all duration-200"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 sm:h-[34px] px-3 sm:px-5 bg-[#F5A300] hover:bg-[#E69500] hover:-translate-y-0.5 hover:shadow-[0_0_18px_rgba(245,163,0,0.25)] text-[#0A234F] text-xs sm:text-[13px] font-bold rounded-xl transition-all duration-250"
              aria-label="Search"
            >
              <span className="hidden sm:inline">Search</span>
              <Search className="sm:hidden h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </form>

        <Link
          to="/cart"
          className="lg:hidden relative p-2.5 text-white/75 hover:text-[#F5A300] hover:-translate-y-0.5 hover:drop-shadow-[0_0_7px_rgba(245,163,0,0.30)] hover:bg-white/10 rounded-xl transition-all shrink-0"
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#F5A300] text-[#0A234F] text-[10px] font-bold flex items-center justify-center px-0.5">
              {cartCount}
            </span>
          )}
        </Link>

        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
            <Link to="/register?type=seller">Sell Stock</Link>
          </Button>
          <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
            <Link to="/shipping-policy">Shipping Policy</Link>
          </Button>
          <Link
            to="/cart"
            className="relative p-2.5 text-white/75 hover:text-[#F5A300] hover:-translate-y-0.5 hover:drop-shadow-[0_0_7px_rgba(245,163,0,0.30)] hover:bg-white/10 rounded-xl transition-all"
            aria-label="Shopping cart"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#F5A300] text-[#0A234F] text-[10px] font-bold flex items-center justify-center px-0.5">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to={dashboardPath}>
                  <LayoutDashboard className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  {user.role === "admin" ? "Admin Hub" : "Dashboard"}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/#how-it-works-buyers">For Buyers</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/#how-it-works-sellers">For Sellers</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/help">Help</Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-[#F5A300] hover:bg-white/10 font-medium rounded-xl transition-all" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                size="sm"
                className="h-9 bg-[#F5A300] hover:bg-[#E69500] border border-[#F5A300]/40 text-[#0A234F] font-bold px-5 rounded-xl shadow-[0_6px_16px_rgba(245,163,0,0.24)] hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(245,163,0,0.28),0_10px_24px_rgba(10,35,79,0.32)] transition-all duration-250 ml-1"
                asChild
              >
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Category navigation" className="hidden md:block border-t border-white/10 bg-[#0A234F]">
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
                        "nav-cat-link text-[13px] font-semibold text-white/82 hover:text-[#F5A300] hover:-translate-y-px hover:[text-shadow:0_0_8px_rgba(245,163,0,0.22)] hover:bg-white/[0.08] px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap text-center w-full",
                        isHovered ? "bg-white/[0.08] text-[#F5A300]" : "",
                      ].join(" ")}
                    >
                      {link.label}
                    </Link>
                    {hasChildren && isHovered && (
                      <div
                        className="absolute top-full left-0 z-50 min-w-[180px] rounded-xl border border-white/15 shadow-2xl overflow-hidden"
                        style={{ background: "#0B2F6B", marginTop: "2px" }}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        {catNode.children.map((child) => (
                          <Link
                            key={child.id}
                            to={`/category/${child.slug}`}
                            className="flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-white/78 hover:text-white hover:bg-[#1D57D8]/20 transition-colors"
                            onClick={() => setHoveredCat(null)}
                          >
                            {child.name}
                            {child.children?.length > 0 && (
                              <ChevronRight className="h-3.5 w-3.5 text-white/48 shrink-0" />
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
