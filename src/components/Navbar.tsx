import { Menu, X, Search, ShoppingCart, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/loadify-logo.svg";
import NavbarSearch from "@/components/NavbarSearch";
import { useCart } from "@/contexts/CartContext";
import { useAuthStore } from "@/store";
import { supabase } from "@/lib/supabase";
// Category data: src/data/categories.ts (single source of truth)
// Full UI config (icons, colours): src/lib/category-config.ts (derives from above)
import CATEGORY_CONFIG from "@/lib/category-config";
import type { CategoryConfig } from "@/lib/category-config";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const { cartCount } = useCart();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
  };

  const handleMobileLogout = () => {
    setMobileOpen(false);
    handleLogout();
  };

  const dashboardPath =
    user?.role === "seller" ? "/pp/seller" :
    user?.role === "admin" || user?.role === "owner" ? "/pp/admin" :
    "/pp/buyer";

  // Close categories dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoriesRef.current && !categoriesRef.current.contains(e.target as Node)) {
        setCategoriesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="Loadify Market" className="h-9 w-9" />
          <span className="font-display text-xl font-bold tracking-tight text-foreground whitespace-nowrap">
            Loadify <span className="text-primary">Market</span>
          </span>
        </Link>

        {/* Desktop search */}
        <NavbarSearch className="hidden lg:block w-48 xl:w-72 2xl:w-96" />

        <div className="hidden lg:flex items-center gap-5 xl:gap-8">
          <Link to="/catalog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Catalog</Link>

          {/* Categories dropdown */}
          <div ref={categoriesRef} className="relative">
            <button
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              onMouseEnter={() => setCategoriesOpen(true)}
            >
              Categories <ChevronDown className={`h-3.5 w-3.5 transition-transform ${categoriesOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Mega menu */}
            {categoriesOpen && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[640px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 grid grid-cols-3 gap-4 z-50"
                onMouseLeave={() => setCategoriesOpen(false)}
              >
                {CATEGORY_CONFIG.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.slug}>
                      <Link
                        to={`/category/${cat.slug}`}
                        className="flex items-center gap-2 mb-2 group"
                        onClick={() => setCategoriesOpen(false)}
                      >
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${cat.accentBg}`}>
                          <Icon className={`h-3.5 w-3.5 ${cat.iconColor}`} />
                        </span>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {cat.label}
                        </span>
                      </Link>
                      <ul className="space-y-1 pl-9">
                        {cat.subcategories.slice(0, 4).map((sub) => (
                          <li key={sub}>
                            <Link
                              to={`/category/${cat.slug}`}
                              className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                              onClick={() => setCategoriesOpen(false)}
                            >
                              {sub}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                <div className="col-span-3 border-t border-gray-100 pt-3 mt-1">
                  <Link
                    to="/catalog"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    onClick={() => setCategoriesOpen(false)}
                  >
                    Browse all categories →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link to="/clearance" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Deals</Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</Link>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center min-w-[18px] h-[18px]">
                {cartCount}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to={dashboardPath}>
                  <User className="h-4 w-4 mr-1" /> Dashboard
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-1" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild><Link to="/login">Sign In</Link></Button>
              <Button size="sm" className="bg-gradient-hero text-primary-foreground" asChild><Link to="/signup">Get Started</Link></Button>
            </>
          )}
        </div>

        {/* Mobile/tablet buttons */}
        <div className="flex lg:hidden items-center gap-1">
          <button
            className="text-foreground p-2"
            onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileOpen(false); }}
          >
            <Search size={20} />
          </button>
          <button
            className="text-foreground p-2"
            onClick={() => { setMobileOpen(!mobileOpen); setMobileSearchOpen(false); }}
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {mobileSearchOpen && (
        <div className="lg:hidden bg-card border-b border-border px-4 py-3">
          <NavbarSearch className="w-full" onSelect={() => setMobileSearchOpen(false)} />
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-card border-b border-border px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
          <Link to="/catalog" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground">Catalog</Link>

          {/* Mobile categories accordion */}
          <div>
            <button
              className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground"
              onClick={() => setMobileExpanded(mobileExpanded === "categories" ? null : "categories")}
            >
              Categories <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpanded === "categories" ? "rotate-180" : ""}`} />
            </button>
            {mobileExpanded === "categories" && (
              <div className="pl-3 space-y-1 pb-2">
                {CATEGORY_CONFIG.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div key={cat.slug}>
                      <button
                        className="flex items-center justify-between w-full py-1.5 text-sm font-medium text-gray-700"
                        onClick={() => setMobileExpanded(mobileExpanded === cat.slug ? "categories" : cat.slug)}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${cat.iconColor}`} />
                          {cat.label}
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileExpanded === cat.slug ? "rotate-180" : ""}`} />
                      </button>
                      {mobileExpanded === cat.slug && (
                        <div className="pl-6 space-y-1 pb-1">
                          <Link
                            to={`/category/${cat.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="block py-1 text-sm text-blue-600 font-medium"
                          >
                            All {cat.label}
                          </Link>
                          {cat.subcategories.map((sub) => (
                            <Link
                              key={sub}
                              to={`/category/${cat.slug}`}
                              onClick={() => setMobileOpen(false)}
                              className="block py-1 text-xs text-gray-500"
                            >
                              {sub}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link to="/clearance" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground">Deals</Link>
          <Link to="/contact" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-muted-foreground">Contact</Link>
          <div className="flex gap-2 pt-2 border-t border-border mt-2">
            {user ? (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild>
                  <Link to={dashboardPath} onClick={() => setMobileOpen(false)}>Dashboard</Link>
                </Button>
                <Button size="sm" className="flex-1" variant="outline" onClick={handleMobileLogout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" asChild><Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link></Button>
                <Button size="sm" className="flex-1 bg-gradient-hero text-primary-foreground" asChild><Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link></Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
