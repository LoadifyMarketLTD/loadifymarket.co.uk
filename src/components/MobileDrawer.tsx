import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  ChevronDown,
  Shirt,
  Smartphone,
  Gamepad2,
  HeartPulse,
  PawPrint,
  UtensilsCrossed,
  Briefcase,
  Home,
  Car,
  Dumbbell,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import DrawerAccountBlock from "@/components/mobile/DrawerAccountBlock";
import DrawerCTACards from "@/components/mobile/DrawerCTACards";
import logo from "@/assets/loadify-logo.svg";
import type { User } from "@/types";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryNode } from "@/hooks/useCategories";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  dashboardPath: string;
  onLogout: () => void;
}

interface MainScreenProps {
  user: User | null;
  dashboardPath: string;
  onLogout: () => void;
  onClose: () => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  categories: CategoryNode[];
  expandedSlug: string | null;
  onCategoryExpand: (slug: string | null) => void;
}

const ICON_MAP: Record<string, LucideIcon> = {
  electronics: Smartphone,
  "home-garden": Home,
  "clothing-fashion": Shirt,
  "toys-games": Gamepad2,
  toys: Gamepad2,
  "sports-fitness": Dumbbell,
  automotive: Car,
  "health-beauty": HeartPulse,
  pets: PawPrint,
  "pet-supplies": PawPrint,
  "food-drink": UtensilsCrossed,
  "office-business": Briefcase,
};

const DEFAULT_ICON = Briefcase;
const FEATURED_SLUGS = ["handmade", "toys-games", "toys", "health-beauty", "electronics", "clothing-fashion", "home-garden", "sports-fitness", "automotive"];

function chooseDrawerCategories(categories: CategoryNode[]) {
  const preferred = FEATURED_SLUGS
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is CategoryNode => Boolean(category));
  const used = new Set(preferred.map((category) => category.id));
  const fallback = categories.filter((category) => !used.has(category.id));
  return [...preferred, ...fallback].slice(0, 8);
}

const MainScreen = ({ user, dashboardPath, onLogout, onClose, closeBtnRef, categories, expandedSlug, onCategoryExpand }: MainScreenProps) => {
  const visibleCategories = chooseDrawerCategories(categories);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.12] shrink-0">
        <Link to="/" onClick={onClose} className="flex items-center gap-2" aria-label="Loadify Market — Home">
          <img src={logo} alt="" aria-hidden="true" className="h-7 w-7" />
          <span className="font-display text-base font-bold text-white leading-none">Loadify <span className="text-[#F5A300]">Market</span></span>
        </Link>
        <button ref={closeBtnRef} onClick={onClose} className="p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DrawerAccountBlock user={user} dashboardPath={dashboardPath} onLogout={onLogout} onClose={onClose} />

        <div className="h-px bg-white/10 mx-4" />

        <div className="pt-4">
          <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-white/45">Quick Actions</p>
          <DrawerCTACards onClose={onClose} />
        </div>

        <div className="h-px bg-white/10 mx-4" />

        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/45">Browse Categories</p>
          <Link to="/catalog" onClick={onClose} className="flex items-center gap-1 text-[11px] font-bold text-[#F5A300] hover:text-white">
            All <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <nav aria-label="Featured product categories">
          {visibleCategories.map((cat) => {
            const Icon = ICON_MAP[cat.slug] ?? DEFAULT_ICON;
            const isOpen = expandedSlug === cat.slug;
            const categoryUrl = `/catalog?category=${encodeURIComponent(cat.name)}`;
            const hasChildren = cat.children.length > 0;

            return (
              <div key={cat.slug}>
                <div className="flex border-b border-white/[0.06]">
                  <Link to={categoryUrl} onClick={onClose} className="flex min-h-[50px] flex-1 items-center gap-3 px-4 transition-colors hover:bg-white/[0.07]">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-[#F5A300]" aria-hidden="true" />
                    <span className="text-[15px] font-semibold text-white/90 flex-1 text-left">{cat.name}</span>
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => onCategoryExpand(isOpen ? null : cat.slug)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.name}`}
                      className="flex w-12 items-center justify-center text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isOpen && hasChildren && (
                  <div className="bg-white/[0.045] border-b border-white/[0.07]">
                    {cat.children.slice(0, 6).map((sub) => (
                      <Link
                        key={sub.slug}
                        to={`/catalog?category=${encodeURIComponent(cat.name)}&q=${encodeURIComponent(sub.name)}`}
                        onClick={onClose}
                        className="flex items-center px-8 h-[42px] hover:bg-white/[0.07] active:bg-white/10 transition-colors border-b border-white/[0.04] last:border-b-0"
                      >
                        <span className="text-[14px] font-medium text-white/75">{sub.name}</span>
                      </Link>
                    ))}
                    {cat.children.length > 6 && (
                      <Link to={categoryUrl} onClick={onClose} className="flex h-[42px] items-center px-8 text-[13px] font-bold text-[#F5A300] hover:bg-white/[0.07]">
                        View all {cat.name}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <Link to="/catalog" onClick={onClose} className="mx-4 mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.055] px-4 text-sm font-semibold text-white/85 hover:bg-white/[0.09]">
          Browse all categories <ArrowRight className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
        </Link>

        <div className="h-px bg-white/10 mx-4 mt-4" />

        <nav aria-label="Support links" className="flex flex-col py-2">
          <Link to="/register?type=seller" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-white/70 hover:text-[#F5A300] hover:bg-white/[0.055] transition-colors">Start Selling</Link>
          <Link to="/shipping-policy" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-white/70 hover:text-[#F5A300] hover:bg-white/[0.055] transition-colors">Shipping Policy</Link>
          <Link to="/wholesale-info" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-white/70 hover:text-[#F5A300] hover:bg-white/[0.055] transition-colors">Marketplace Information</Link>
          <Link to="/about" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-white/70 hover:text-[#F5A300] hover:bg-white/[0.055] transition-colors">About Us</Link>
        </nav>

        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>
    </div>
  );
};

const MobileDrawer = ({ open, onClose, user, dashboardPath, onLogout }: MobileDrawerProps) => {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { categories } = useCategories();

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setExpandedSlug(null), 300);
      return () => clearTimeout(t);
    }

    const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return createPortal(
    <>
      <div className={["fixed inset-0 z-[9998] bg-black/40 transition-opacity duration-300", open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"].join(" ")} onClick={onClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className={[
          "fixed top-0 left-0 z-[9999] h-[100dvh] w-[85vw] max-w-[380px]",
          "bg-[#0A234F] border-r border-white/[0.12] shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <MainScreen
          user={user}
          dashboardPath={dashboardPath}
          onLogout={onLogout}
          onClose={onClose}
          closeBtnRef={closeBtnRef}
          categories={categories}
          expandedSlug={expandedSlug}
          onCategoryExpand={setExpandedSlug}
        />
      </div>
    </>,
    document.body
  );
};

export default MobileDrawer;
