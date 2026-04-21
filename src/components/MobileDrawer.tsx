import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  X,
  ArrowLeft,
  ChevronRight,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import DrawerAccountBlock from "@/components/mobile/DrawerAccountBlock";
import DrawerCTACards from "@/components/mobile/DrawerCTACards";
import logo from "@/assets/loadify-logo.svg";
import type { User } from "@/types";
import { GLOBAL_CATEGORY_TREE } from "@/data/globalCategoryTree";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  onCategorySelect: (categoryKey: string) => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
}

interface CategoryScreenProps {
  categoryKey: string;
  onBack: () => void;
  onClose: () => void;
}

interface HamburgerCategory {
  key: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  subcategories: string[];
}

const HAMBURGER_CATEGORIES: readonly HamburgerCategory[] = [
  {
    key: "electronics",
    label: "Electronics",
    icon: Smartphone,
    iconColor: "text-cyan-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "electronics")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "home-garden",
    label: "Home & Garden",
    icon: Home,
    iconColor: "text-green-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "home-garden")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "clothing-fashion",
    label: "Clothing & Fashion",
    icon: Shirt,
    iconColor: "text-blue-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "clothing-fashion")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "toys-games",
    label: "Toys & Games",
    icon: Gamepad2,
    iconColor: "text-purple-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "toys-games")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "sports-fitness",
    label: "Sports & Fitness",
    icon: Dumbbell,
    iconColor: "text-yellow-300",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "sports-fitness")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "automotive",
    label: "Automotive",
    icon: Car,
    iconColor: "text-slate-300",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "automotive")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "health-beauty",
    label: "Health & Beauty",
    icon: HeartPulse,
    iconColor: "text-rose-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "health-beauty")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "pets",
    label: "Pets",
    icon: PawPrint,
    iconColor: "text-orange-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "pets")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "food-drink",
    label: "Food & Drink",
    icon: UtensilsCrossed,
    iconColor: "text-red-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "food-drink")?.children?.map((c) => c.name) ?? [],
  },
  {
    key: "office-business",
    label: "Office & Business",
    icon: Briefcase,
    iconColor: "text-sky-400",
    subcategories: GLOBAL_CATEGORY_TREE.find((c) => c.slug === "office-business")?.children?.map((c) => c.name) ?? [],
  },
];

const getHamburgerCategory = (key: string) =>
  HAMBURGER_CATEGORIES.find((cat) => cat.key === key);

// ── Main screen (Level 1) ─────────────────────────────────────────────────────

const MainScreen = ({
  user,
  dashboardPath,
  onLogout,
  onClose,
  onCategorySelect,
  closeBtnRef,
}: MainScreenProps) => (
  <div className="flex flex-col h-full">
    {/* Header bar */}
    <div className="h-14 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
      <Link to="/" onClick={onClose} className="flex items-center gap-2" aria-label="Loadify Market — Home">
        <img src={logo} alt="" aria-hidden="true" className="h-7 w-7" />
        <span className="font-display text-base font-bold text-white leading-none">
          Loadify <span className="text-[#22C55E]">Market</span>
        </span>
      </Link>
      <button
        ref={closeBtnRef}
        onClick={onClose}
        className="p-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        aria-label="Close menu"
      >
        <X className="h-5 w-5" />
      </button>
    </div>

    {/* Scrollable body */}
    <div className="flex-1 overflow-y-auto">
      {/* Account block */}
      <DrawerAccountBlock
        user={user}
        dashboardPath={dashboardPath}
        onLogout={onLogout}
        onClose={onClose}
      />

      {/* Divider */}
      <div className="h-px bg-white/10 mx-4" />

      {/* Quick Actions */}
      <div className="pt-4">
        <p className="px-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
          Quick Actions
        </p>
        <DrawerCTACards onClose={onClose} />
      </div>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-4" />

      {/* Categories */}
      <p className="px-4 pt-4 pb-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
        Browse Categories
      </p>
      <nav aria-label="Product categories">
        {HAMBURGER_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => onCategorySelect(cat.key)}
              className="w-full flex items-center gap-3 px-4 h-[52px] hover:bg-white/[0.07] active:bg-white/10 transition-colors border-b border-white/[0.05]"
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${cat.iconColor}`} aria-hidden="true" />
              <span className="text-[15px] font-semibold text-white/90 flex-1 text-left">
                {cat.label}
              </span>
              <ChevronRight className="h-4 w-4 text-white/30 shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="h-px bg-white/10 mx-4 mt-2" />

      {/* Footer links */}
      <nav aria-label="Support links" className="flex flex-col py-2">
        <Link
          to="/wholesale-info"
          onClick={onClose}
          className="px-4 h-11 flex items-center text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          UK Wholesale Information and Support
        </Link>
        <Link
          to="/blog"
          onClick={onClose}
          className="px-4 h-11 flex items-center text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          Blog
        </Link>
        <Link
          to="/about"
          onClick={onClose}
          className="px-4 h-11 flex items-center text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          About Us
        </Link>
      </nav>

      {/* Safe-area spacer for iOS */}
      <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
    </div>
  </div>
);

// ── Category screen (Level 2 — shows chips as subcategory links) ──────────────

const CategoryScreen = ({ categoryKey, onBack, onClose }: CategoryScreenProps) => {
  const cat = getHamburgerCategory(categoryKey);
  if (!cat) return null;
  const categoryUrl = `/catalog?category=${encodeURIComponent(cat.label)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-white/10 shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          aria-label="Back to main menu"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-semibold text-white/90">{cat.label}</span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* View All row */}
        <Link
          to={categoryUrl}
          onClick={onClose}
          className="flex items-center gap-2 px-4 h-14 border-b border-white/10 hover:bg-white/[0.07] active:bg-white/10 transition-colors"
        >
          <span className="text-[15px] font-semibold text-[#22C55E]">
            View All {cat.label}
          </span>
          <ChevronRight className="h-4 w-4 text-[#22C55E]/60 ml-auto" aria-hidden="true" />
        </Link>

        {/* Chip rows — direct links */}
        <nav aria-label={`${cat.label} subcategories`}>
          {cat.subcategories.map((subcategory) => (
            <Link
              key={subcategory}
              to={`/catalog?category=${encodeURIComponent(cat.label)}&q=${encodeURIComponent(subcategory)}`}
              onClick={onClose}
              className="flex items-center px-4 h-[52px] hover:bg-white/[0.07] active:bg-white/10 transition-colors border-b border-white/[0.05]"
            >
              <span className="text-[15px] font-medium text-white/80 flex-1 text-left">
                {subcategory}
              </span>
            </Link>
          ))}
        </nav>

        {/* Safe-area spacer for iOS */}
        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>
    </div>
  );
};

// ── Drawer shell ──────────────────────────────────────────────────────────────

const MobileDrawer = ({ open, onClose, user, dashboardPath, onLogout }: MobileDrawerProps) => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset sub-screens and handle focus / Escape key
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setActiveCategory(null);
      }, 300);
      return () => clearTimeout(t);
    }

    // Focus close button when drawer opens
    const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 50);

    // Escape closes drawer
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Focus trap — keep Tab / Shift+Tab cycling within the panel
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handleKey);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleCategorySelect = (categoryKey: string) => {
    setActiveCategory(categoryKey);
  };

  const handleBackToMain = () => {
    setActiveCategory(null);
  };

  // Determine which screen to render
  const screen = activeCategory === null ? "main" : "category";

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className={[
          "fixed inset-0 z-[9998] bg-black/60 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides from LEFT */}
      <div
        ref={panelRef}
        className={[
          "fixed top-0 left-0 z-[9999] h-[100dvh] w-[85vw] max-w-[380px]",
          "bg-[#0A1930] border-r border-white/10 shadow-2xl flex flex-col",
          "transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        {screen === "main" && (
          <MainScreen
            user={user}
            dashboardPath={dashboardPath}
            onLogout={onLogout}
            onClose={onClose}
            onCategorySelect={handleCategorySelect}
            closeBtnRef={closeBtnRef}
          />
        )}
        {screen === "category" && activeCategory !== null && (
          <CategoryScreen
            categoryKey={activeCategory}
            onBack={handleBackToMain}
            onClose={onClose}
          />
        )}
      </div>
    </>,
    document.body
  );
};

export default MobileDrawer;
