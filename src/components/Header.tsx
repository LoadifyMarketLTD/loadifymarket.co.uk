import { useState, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, Menu, LogOut, LayoutDashboard, ChevronRight } from "lucide-react";
import logo from "@/assets/loadify-logo-light.svg";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import MobileDrawer from "@/components/MobileDrawer";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryNode } from "@/hooks/useCategories";
import { useLiveCategoryAvailability } from "@/hooks/useLiveCategoryAvailability";
import { supabase } from "@/lib/supabase";
import { marketplaceCategorySlug, marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";

const Header = () => {
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const { liveCategoryIds, liveRootCategoryIds } = useLiveCategoryAvailability();

  const liveCategoryIdSet = new Set(liveCategoryIds);
  const liveRootCategoryIdSet = new Set(liveRootCategoryIds);

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

  const displayCategories = categories
    .filter((category) => liveRootCategoryIdSet.has(category.id))
    .slice(0, 6);

  const navLinks = [
    { to: "/", label: "Home", catSlug: null as string | null },
    { to: "/catalog", label: "Shop all", catSlug: null as string | null },
    ...displayCategories.map((cat) => ({
      to: `/category/${marketplaceCategorySlug(cat.name)}`,
      label: cat.name,
      catSlug: cat.slug,
    })),
    { to: "/catalog", label: "More categories", catSlug: null as string | null },
  ];

  const utilityLinkClass =
    "rounded-md px-2.5 py-2 text-[13px] font-medium text-[#334155] transition-colors hover:text-[#0A234F]";

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 hidden border-b border-[#0A234F]/10 bg-[#F8F7F4]/95 backdrop-blur-md md:block"
      style={{ willChange: "transform", paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-[72px] w-full items-center gap-4 px-5 lg:px-8">
        <button
          className="shrink-0 rounded-md p-2 text-[#64748B] transition-colors hover:bg-black/[0.025] hover:text-[#0A234F]"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <Menu size={21} aria-hidden="true" />
        </button>

        <Link to="/" aria-label="Loadify Market — Home" className="flex shrink-0 items-center gap-3">
          <img src={logo} alt="" aria-hidden="true" className="h-9 w-9" />
          <span className="hidden leading-none xl:block">
            <span className="block font-serif text-[19px] font-medium tracking-[-0.025em] text-[#0A234F]">Loadify</span>
            <span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.30em] text-[#7A6850]">Market</span>
          </span>
        </Link>

        <form onSubmit={handleSearch} className="mx-auto hidden min-w-0 max-w-[560px] flex-1 md:flex" role="search">
          <div className="relative w-full">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products and categories..."
              aria-label="Search products and categories"
              className="h-10 w-full rounded-lg border border-[#0A234F]/12 bg-white/90 pl-4 pr-11 text-[13px] text-[#0A234F] outline-none transition placeholder:text-[#8A94A3] focus:border-[#0A234F]/25 focus:ring-1 focus:ring-[#0A234F]/10"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 flex h-8 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.045] hover:text-[#0A234F]"
              aria-label="Search"
            >
              <Search className="h-[17px] w-[17px]" aria-hidden="true" />
            </button>
          </div>
        </form>

        <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
          <Link to="/catalog" className={utilityLinkClass}>Marketplace</Link>
          <Link to="/register?type=seller" className={utilityLinkClass}>Sell with us</Link>
          <Link to="/help" className={utilityLinkClass}>Help</Link>

          <Link
            to="/cart"
            className="relative ml-1 rounded-md p-2 text-[#5A6578] transition-colors hover:bg-black/[0.025] hover:text-[#0A234F]"
            aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
          >
            <ShoppingCart className="h-[19px] w-[19px]" aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#0A234F] px-1 text-[9px] font-semibold text-white" aria-hidden="true">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link to={dashboardPath} className={`${utilityLinkClass} ml-1 inline-flex items-center gap-1.5`}>
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                {user.role === "admin" ? "Admin Hub" : "Dashboard"}
              </Link>
              <button onClick={handleLogout} className={`${utilityLinkClass} inline-flex items-center gap-1.5`}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className={`${utilityLinkClass} ml-1`}>Sign in</Link>
              <Link
                to="/register"
                className="ml-2 inline-flex h-9 items-center rounded-md bg-[#0A234F] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#071A3C]"
              >
                Join Loadify
              </Link>
            </>
          )}
        </div>
      </div>

      <nav aria-label="Category navigation" className="border-t border-[#0A234F]/[0.07] bg-[#F8F7F4]">
        <div className="w-full px-5 lg:px-8">
          <div className="h-[50px] overflow-x-auto scrollbar-none">
            <div className="grid h-full min-w-[980px] grid-flow-col auto-cols-fr items-center gap-x-8 lg:min-w-0">
              {navLinks.map((link) => {
                const catNode: CategoryNode | undefined = link.catSlug
                  ? categories.find((c) => c.slug === link.catSlug)
                  : undefined;
                const liveChildren = catNode?.children.filter((child) => liveCategoryIdSet.has(child.id)) ?? [];
                const hasChildren = liveChildren.length > 0;
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
                      className={[
                        "w-full whitespace-nowrap border-b-2 border-transparent px-2 py-3 text-center text-[12px] font-medium text-[#5A6578] transition-colors hover:border-[#0A234F]/35 hover:text-[#0A234F]",
                        isHovered ? "border-[#0A234F]/35 text-[#0A234F]" : "",
                      ].join(" ")}
                    >
                      {link.label}
                    </Link>

                    {hasChildren && isHovered && (
                      <div
                        className="absolute left-0 top-full z-50 min-w-[190px] overflow-hidden rounded-lg border border-[#0A234F]/10 bg-[#FCFBF9] shadow-[0_12px_30px_rgba(10,35,79,0.10)]"
                        style={{ marginTop: "1px" }}
                        onMouseEnter={cancelClose}
                        onMouseLeave={scheduleClose}
                      >
                        {liveChildren.map((child) => (
                          <Link
                            key={child.id}
                            to={`/category/${marketplaceCategorySlug(catNode!.name)}?sub=${encodeURIComponent(marketplaceSubcategorySlug(catNode!.name, child.name))}`}
                            className="flex items-center justify-between px-4 py-2.5 text-[13px] font-medium text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]"
                            onClick={() => setHoveredCat(null)}
                          >
                            {child.name}
                            {child.children?.length > 0 && (
                              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#8A94A3]" aria-hidden="true" />
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
        liveCategoryIds={liveCategoryIds}
        liveRootCategoryIds={liveRootCategoryIds}
      />
    </header>
  );
};

export default Header;
