import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, ShoppingCart } from "lucide-react";
import logo from "@/assets/LOGO.png";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import MobileDrawer from "@/components/MobileDrawer";
import { supabase } from "@/lib/supabase";
import { marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";
import CATEGORY_CONFIG from "@/lib/category-config";
import { businessNavigation } from "@/data/publicNavigation";

const Header = () => {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [businessOpen, setBusinessOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const businessCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setHoveredCat(null), 80);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }, []);

  const scheduleBusinessClose = useCallback(() => {
    businessCloseTimerRef.current = setTimeout(() => setBusinessOpen(false), 100);
  }, []);

  const cancelBusinessClose = useCallback(() => {
    if (businessCloseTimerRef.current) clearTimeout(businessCloseTimerRef.current);
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

  const displayCategories = CATEGORY_CONFIG.slice(0, 5);
  const categoryLinks = [
    { to: "/catalog", label: "Shop all", category: null },
    ...displayCategories.map((category) => ({
      to: `/category/${category.slug}`,
      label: category.label,
      category,
    })),
    { to: "/catalog", label: "More categories", category: null },
  ];

  const primaryNavClass =
    "inline-flex h-10 items-center rounded-md px-2.5 text-[12px] font-semibold tracking-[0.01em] text-white/76 transition-colors hover:bg-white/[0.07] hover:text-white xl:px-3 xl:text-[13px]";
  const utilityLinkClass =
    "rounded-md px-2 py-2 text-[12px] font-medium text-white/68 transition-colors hover:bg-white/[0.07] hover:text-white";

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 hidden border-b border-[#0A234F]/10 bg-[#F8F7F4]/95 backdrop-blur-md md:block"
      style={{ willChange: "transform", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-[72px] w-full items-center gap-3 bg-[#0A234F] px-5 lg:px-7 xl:gap-4 xl:px-8">
        <button
          className="shrink-0 rounded-md p-2 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
          onClick={() => setMobileOpen(true)}
          aria-label="Open Loadify navigation"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <Menu size={21} aria-hidden="true" />
        </button>

        <Link
          to="/"
          aria-label="Loadify Market — Home"
          className="flex h-12 shrink-0 items-center rounded-lg bg-[#F8F7F4] px-3 shadow-[0_2px_10px_rgba(0,0,0,0.12)] ring-1 ring-white/15"
        >
          <img src={logo} alt="" aria-hidden="true" className="h-9 w-auto max-w-[145px] object-contain" />
        </Link>

        <nav aria-label="Platform navigation" className="ml-1 hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          <Link to="/platform" className={primaryNavClass}>Platform</Link>
          <Link to="/buyers" className={primaryNavClass}>Buyers</Link>
          <Link to="/sellers" className={primaryNavClass}>Sellers</Link>
          <div
            className="relative"
            onMouseEnter={() => { cancelBusinessClose(); setBusinessOpen(true); }}
            onMouseLeave={scheduleBusinessClose}
          >
            <button
              type="button"
              className={`${primaryNavClass} gap-1`}
              aria-expanded={businessOpen}
              aria-haspopup="menu"
              onClick={() => setBusinessOpen((value) => !value)}
            >
              Business <ChevronDown className={`h-3.5 w-3.5 transition-transform ${businessOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {businessOpen && (
              <div
                className="absolute left-1/2 top-full z-50 mt-2 w-[310px] -translate-x-1/2 overflow-hidden rounded-xl border border-[#0A234F]/10 bg-[#FCFBF9] p-2 shadow-[0_18px_45px_rgba(10,35,79,0.16)]"
                role="menu"
                onMouseEnter={cancelBusinessClose}
                onMouseLeave={scheduleBusinessClose}
              >
                <div className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Business with Loadify</div>
                {businessNavigation.map((item) => (
                  <Link
                    key={`${item.label}-${item.to}`}
                    to={item.to}
                    role="menuitem"
                    onClick={() => setBusinessOpen(false)}
                    className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-[#0A234F]/[0.045]"
                  >
                    <span className="block text-[13px] font-extrabold text-[#0A234F]">{item.label}</span>
                    {item.description && <span className="mt-0.5 block text-[11px] leading-4 text-[#667085]">{item.description}</span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link to="/integrations" className={primaryNavClass}>Integrations</Link>
          <Link to="/partners" className={primaryNavClass}>Partners</Link>
        </nav>

        <div className="hidden shrink-0 items-center gap-0.5 xl:flex">
          <Link to="/trust" className={utilityLinkClass}>Trust</Link>
          <Link to="/help" className={utilityLinkClass}>Help</Link>
          <Link
            to="/cart"
            className="relative ml-0.5 rounded-md p-2 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
          >
            <ShoppingCart className="h-[19px] w-[19px]" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#F5A300] px-1 text-[9px] font-bold text-[#0A234F]" aria-hidden="true">{cartCount}</span>
            )}
          </Link>
          {user ? (
            <>
              <Link to={dashboardPath} className={`${utilityLinkClass} ml-1 inline-flex items-center gap-1.5`}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                {user.role === "admin" ? "Admin Hub" : "Dashboard"}
              </Link>
              <button onClick={handleLogout} className={`${utilityLinkClass} inline-flex items-center gap-1.5`}>
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${utilityLinkClass} ml-1`}>Sign in</Link>
              <Link to="/register" className="ml-1.5 inline-flex h-9 items-center rounded-md bg-[#F8F7F4] px-3.5 text-[12px] font-extrabold text-[#0A234F] transition-colors hover:bg-white">Join Loadify</Link>
            </>
          )}
        </div>
      </div>

      <div className="flex h-[50px] items-center gap-5 border-t border-[#0A234F]/[0.07] bg-[#F8F7F4] px-5 lg:px-7 xl:px-8">
        <form onSubmit={handleSearch} className="w-[300px] shrink-0 lg:w-[340px] xl:w-[380px]" role="search">
          <div className="relative w-full">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products and categories..."
              aria-label="Search products and categories"
              className="h-9 w-full rounded-lg border border-[#0A234F]/10 bg-white pl-3.5 pr-10 text-[12px] text-[#0A234F] outline-none transition placeholder:text-[#8A94A3] focus:border-[#0A234F]/25 focus:ring-2 focus:ring-[#0A234F]/[0.06]"
            />
            <button type="submit" className="absolute right-1 top-1/2 flex h-7 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#667085] transition-colors hover:bg-[#0A234F]/[0.04] hover:text-[#0A234F]" aria-label="Search">
              <Search className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        <nav aria-label="Marketplace category navigation" className="min-w-0 flex-1">
          <div className="h-[50px] overflow-x-auto scrollbar-none">
            <div className="grid h-full min-w-[760px] grid-flow-col auto-cols-fr items-center gap-x-2 xl:min-w-0 xl:gap-x-4">
              {categoryLinks.map((link) => {
                const category = link.category;
                const children = category?.subcategories ?? [];
                const hasChildren = children.length > 0;
                const isHovered = hoveredCat === link.to;
                return (
                  <div
                    key={`${link.to}-${link.label}`}
                    className="relative flex h-full items-center"
                    onMouseEnter={() => { cancelClose(); if (hasChildren) setHoveredCat(link.to); }}
                    onMouseLeave={scheduleClose}
                  >
                    <Link
                      to={link.to}
                      className={["w-full whitespace-nowrap border-b-2 border-transparent px-2 py-3 text-center text-[11px] font-semibold text-[#5A6578] transition-colors hover:border-[#0A234F]/35 hover:text-[#0A234F] xl:text-[12px]", isHovered ? "border-[#0A234F]/35 text-[#0A234F]" : ""].join(" ")}
                    >
                      {link.label}
                    </Link>
                    {hasChildren && isHovered && category && (
                      <div className="absolute left-0 top-full z-50 min-w-[220px] overflow-hidden rounded-lg border border-[#0A234F]/10 bg-[#FCFBF9] shadow-[0_12px_30px_rgba(10,35,79,0.10)]" style={{ marginTop: "1px" }} onMouseEnter={cancelClose} onMouseLeave={scheduleClose}>
                        {children.map((child) => (
                          <Link key={child} to={`/category/${category.slug}?sub=${encodeURIComponent(marketplaceSubcategorySlug(category.label, child))}`} className="flex items-center px-4 py-2.5 text-[13px] font-medium text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]" onClick={() => setHoveredCat(null)}>{child}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </nav>
      </div>

      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} user={user} dashboardPath={dashboardPath} onLogout={handleLogout} />
    </header>
  );
};

export default Header;
