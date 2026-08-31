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
import logo from "@/assets/loadify-logo-light.svg";
import type { User } from "@/types";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryNode } from "@/hooks/useCategories";
import { marketplaceCategorySlug, marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";

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
  const hasLiveRootData = liveRootCategoryIds.length > 0;
  const hasLiveCategoryData = liveCategoryIds.length > 0;

  const visibleCategories = (hasLiveRootData
    ? categories.filter((category) => liveRootCategoryIdSet.has(category.id))
    : categories
  ).slice(0, 8);

  return (
    <div className="flex h-full flex-col bg-[#F8F7F4] text-[#0A234F]">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#0A234F]/10 px-4">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5" aria-label="Loadify Market — Home">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0A234F]/10 bg-white shadow-sm">
            <img src={logo} alt="" aria-hidden="true" className="h-7 w-7" />
          </span>
          <span className="font-serif text-[17px] font-semibold leading-none text-[#0A234F]">
            Loadify <span className="text-[#8A7351]">Market</span>
          </span>
        </Link>
        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="rounded-lg p-2 text-[#667085] transition-colors hover:bg-[#0A234F]/5 hover:text-[#0A234F]"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <DrawerAccountBlock user={user} dashboardPath={dashboardPath} onLogout={onLogout} onClose={onClose} />

        <div className="mx-4 h-px bg-[#0A234F]/10" />

        <div className="pt-4">
          <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-[#667085]">Quick Actions</p>
          <DrawerCTACards onClose={onClose} />
        </div>

        <div className="mx-4 h-px bg-[#0A234F]/10" />

        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#667085]">Browse Categories</p>
          <Link to="/catalog" onClick={onClose} className="flex items-center gap-1 text-[11px] font-bold text-[#8A7351] hover:text-[#0A234F]">
            All <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        <nav aria-label="Marketplace categories">
          {visibleCategories.map((cat) => {
            const Icon = ICON_MAP[cat.slug] ?? DEFAULT_ICON;
            const isOpen = expandedSlug === cat.slug;
            const categoryUrl = `/category/${marketplaceCategorySlug(cat.name)}`;
            const visibleChildren = hasLiveCategoryData
              ? cat.children.filter((child) => liveCategoryIdSet.has(child.id))
              : cat.children;
            const hasChildren = visibleChildren.length > 0;

            return (
              <div key={cat.slug}>
                <div className="flex border-b border-[#0A234F]/[0.07]">
                  <Link
                    to={categoryUrl}
                    onClick={onClose}
                    className="flex min-h-[50px] flex-1 items-center gap-3 px-4 transition-colors hover:bg-[#0A234F]/[0.035]"
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0 text-[#8A7351]" aria-hidden="true" />
                    <span className="flex-1 text-left text-[15px] font-semibold text-[#0A234F]">{cat.name}</span>
                  </Link>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => onCategoryExpand(isOpen ? null : cat.slug)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.name}`}
                      className="flex w-12 items-center justify-center text-[#8A94A3] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                  )}
                </div>

                {isOpen && hasChildren && (
                  <div className="border-b border-[#0A234F]/10 bg-white/60">
                    {visibleChildren.slice(0, 6).map((sub) => (
                      <Link
                        key={sub.slug}
                        to={`${categoryUrl}?sub=${encodeURIComponent(marketplaceSubcategorySlug(cat.name, sub.name))}`}
                        onClick={onClose}
                        className="flex h-[42px] items-center border-b border-[#0A234F]/[0.06] px-8 transition-colors last:border-b-0 hover:bg-[#0A234F]/[0.035]"
                      >
                        <span className="text-[14px] font-medium text-[#5A6578]">{sub.name}</span>
                      </Link>
                    ))}
                    {visibleChildren.length > 6 && (
                      <Link
                        to={categoryUrl}
                        onClick={onClose}
                        className="flex h-[42px] items-center px-8 text-[13px] font-bold text-[#8A7351] hover:bg-[#0A234F]/[0.035]"
                      >
                        View all {cat.name}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <Link
          to="/catalog"
          onClick={onClose}
          className="mx-4 mt-4 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#0A234F]/10 bg-white px-4 text-sm font-semibold text-[#0A234F] shadow-sm transition-colors hover:bg-[#0A234F]/[0.035]"
        >
          Browse all categories <ArrowRight className="h-4 w-4 text-[#8A7351]" aria-hidden="true" />
        </Link>

        <div className="mx-4 mt-4 h-px bg-[#0A234F]/10" />

        <nav aria-label="Support links" className="flex flex-col py-2">
          <Link to="/register?type=seller" onClick={onClose} className="flex h-11 items-center px-4 text-sm font-medium text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]">Start Selling</Link>
          <Link to="/shipping-policy" onClick={onClose} className="flex h-11 items-center px-4 text-sm font-medium text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]">Shipping Policy</Link>
          <Link to="/wholesale-info" onClick={onClose} className="flex h-11 items-center px-4 text-sm font-medium text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]">Marketplace Information</Link>
          <Link to="/about" onClick={onClose} className="flex h-11 items-center px-4 text-sm font-medium text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:text-[#0A234F]">About Us</Link>
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
      <div
        className={["fixed inset-0 z-[9998] bg-[#0A234F]/35 transition-opacity duration-300", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        className={[
          "fixed left-0 top-0 z-[9999] h-[100dvh] w-[85vw] max-w-[380px]",
          "flex flex-col border-r border-[#0A234F]/10 bg-[#F8F7F4] shadow-2xl",
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
