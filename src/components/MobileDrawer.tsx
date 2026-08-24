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
  liveCategoryIds: string[];
  liveRootCategoryIds: string[];
}

interface MainScreenProps {
  user: User | null;
  dashboardPath: string;
  onLogout: () => void;
  onClose: () => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  categories: CategoryNode[];
  liveCategoryIds: string[];
  liveRootCategoryIds: string[];
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

const MainScreen = ({
  user,
  dashboardPath,
  onLogout,
  onClose,
  closeBtnRef,
  categories,
  liveCategoryIds,
  liveRootCategoryIds,
  expandedSlug,
  onCategoryExpand,
}: MainScreenProps) => {
  const liveCategoryIdSet = new Set(liveCategoryIds);
  const liveRootCategoryIdSet = new Set(liveRootCategoryIds);
  const visibleCategories = categories
    .filter((category) => liveRootCategoryIdSet.has(category.id))
    .slice(0, 8);

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 shrink-0">
        <Link to="/" onClick={onClose} className="flex items-center gap-2" aria-label="Loadify Market — Home">
          <img src={logo} alt="" aria-hidden="true" className="h-7 w-7" />
          <span className="font-display text-base font-bold text-[#0A234F] leading-none">Loadify <span className="text-[#1D57D8]">Market</span></span>
        </Link>
        <button ref={closeBtnRef} onClick={onClose} className="p-2 text-slate-500 hover:text-[#0A234F] transition-colors rounded-lg hover:bg-slate-100" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DrawerAccountBlock user={user} dashboardPath={dashboardPath} onLogout={onLogout} onClose={onClose} />

        <div className="h-px bg-slate-200 mx-4" />

        <div className="pt-4">
          <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Quick Actions</p>
          <DrawerCTACards onClose={onClose} />
        </div>

        <div className="h-px bg-slate-200 mx-4" />

        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Browse Categories</p>
          <Link to="/catalog" onClick={onClose} className="flex items-center gap-1 text-[11px] font-bold text-[#1D57D8] hover:text-[#0A234F]">
            All <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <nav aria-label="Live product categories">
          {visibleCategories.map((cat) => {
            const Icon = ICON_MAP[cat.slug] ?? DEFAULT_ICON;
            const isOpen = expandedSlug === cat.slug;
            const categoryUrl = `/catalog?category=${encodeURIComponent(cat.name)}`;
            const liveChildren = cat.children.filter((child) => liveCategoryIdSet.has(child.id));
            const hasChildren = liveChildren.length > 0;

            return (
              <div key={cat.slug}>
                <div className="flex border-b border-slate-100">
                  <Link to={categoryUrl} onClick={onClose} className="flex min-h-[50px] flex-1 items-center gap-3 px-4 transition-colors hover:bg-blue-50">
                    <Icon className="h-[18px] w-[18px] shrink-0 text-[#1D57D8]" aria-hidden="true" />
                    <span className="text-[15px] font-semibold text-[#0A234F] flex-1 text-left">{cat.name}</span>
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => onCategoryExpand(isOpen ? null : cat.slug)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.name}`}
                      className="flex w-12 items-center justify-center text-slate-400 transition-colors hover:bg-blue-50 hover:text-[#0A234F]"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isOpen && hasChildren && (
                  <div className="bg-slate-50 border-b border-slate-200">
                    {liveChildren.slice(0, 6).map((sub) => (
                      <Link
                        key={sub.slug}
                        to={`/catalog?category=${encodeURIComponent(cat.name)}&q=${encodeURIComponent(sub.name)}`}
                        onClick={onClose}
                        className="flex items-center px-8 h-[42px] hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                      >
                        <span className="text-[14px] font-medium text-slate-600">{sub.name}</span>
                      </Link>
                    ))}
                    {liveChildren.length > 6 && (
                      <Link to={categoryUrl} onClick={onClose} className="flex h-[42px] items-center px-8 text-[13px] font-bold text-[#1D57D8] hover:bg-blue-50">
                        View all {cat.name}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <Link to="/catalog" onClick={onClose} className="mx-4 mt-4 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#0A234F] shadow-sm hover:bg-blue-50">
          Browse all categories <ArrowRight className="h-4 w-4 text-[#1D57D8]" aria-hidden="true" />
        </Link>

        <div className="h-px bg-slate-200 mx-4 mt-4" />

        <nav aria-label="Support links" className="flex flex-col py-2">
          <Link to="/register?type=seller" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-slate-600 hover:text-[#1D57D8] hover:bg-blue-50 transition-colors">Start Selling</Link>
          <Link to="/shipping-policy" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-slate-600 hover:text-[#1D57D8] hover:bg-blue-50 transition-colors">Shipping Policy</Link>
          <Link to="/wholesale-info" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-slate-600 hover:text-[#1D57D8] hover:bg-blue-50 transition-colors">Marketplace Information</Link>
          <Link to="/about" onClick={onClose} className="px-4 h-11 flex items-center text-sm font-medium text-slate-600 hover:text-[#1D57D8] hover:bg-blue-50 transition-colors">About Us</Link>
        </nav>

        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>
    </div>
  );
};

const MobileDrawer = ({
  open,
  onClose,
  user,
  dashboardPath,
  onLogout,
  liveCategoryIds,
  liveRootCategoryIds,
}: MobileDrawerProps) => {
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
          "bg-[#F7F9FC] border-r border-slate-200 shadow-2xl flex flex-col",
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
          liveCategoryIds={liveCategoryIds}
          liveRootCategoryIds={liveRootCategoryIds}
          expandedSlug={expandedSlug}
          onCategoryExpand={setExpandedSlug}
        />
      </div>
    </>,
    document.body
  );
};

export default MobileDrawer;
