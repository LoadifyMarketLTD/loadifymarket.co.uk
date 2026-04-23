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
import { useCategories } from "@/hooks/useCategories";

// ── Types ─────────────────────────────────────────────────────────────────────

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
  onCategorySelect: (categorySlug: string) => void;
  closeBtnRef: React.RefObject<HTMLButtonElement | null>;
  categories: CategoryNode[];
}

interface CategoryScreenProps {
  category: CategoryNode | null;
  onBack: () => void;
  onClose: () => void;
}

/** Icon / colour overrides for known category slugs. */
const ICON_MAP: Record<string, { icon: LucideIcon; iconColor: string }> = {
  "electronics":       { icon: Smartphone,    iconColor: "text-cyan-400"   },
  "home-garden":       { icon: Home,          iconColor: "text-green-400"  },
  "clothing-fashion":  { icon: Shirt,         iconColor: "text-blue-400"   },
  "toys-games":        { icon: Gamepad2,      iconColor: "text-purple-400" },
  "sports-fitness":    { icon: Dumbbell,      iconColor: "text-yellow-300" },
  "automotive":        { icon: Car,           iconColor: "text-slate-300"  },
  "health-beauty":     { icon: HeartPulse,    iconColor: "text-rose-400"   },
  "pets":              { icon: PawPrint,      iconColor: "text-orange-400" },
  "pet-supplies":      { icon: PawPrint,      iconColor: "text-amber-400"  },
  "food-drink":        { icon: UtensilsCrossed, iconColor: "text-red-400"  },
  "office-business":   { icon: Briefcase,     iconColor: "text-sky-400"    },
};

const DEFAULT_ICON = { icon: Briefcase, iconColor: "text-white/50" };

// ── Main screen (Level 1) ─────────────────────────────────────────────────────

const MainScreen = ({
  user,
  dashboardPath,
  onLogout,
  onClose,
  onCategorySelect,
  closeBtnRef,
  categories,
}: MainScreenProps) => (
  <div className="flex flex-col h-full">
    {/* Header bar */}
    <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 shrink-0">
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
        {categories.map((cat) => {
          const { icon: Icon, iconColor } = ICON_MAP[cat.slug] ?? DEFAULT_ICON;
          return (
            <button
              key={cat.slug}
              onClick={() => onCategorySelect(cat.slug)}
              className="w-full flex items-center gap-3 px-4 h-[52px] hover:bg-white/[0.07] active:bg-white/10 transition-colors border-b border-white/[0.05]"
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${iconColor}`} aria-hidden="true" />
              <span className="text-[15px] font-semibold text-white/90 flex-1 text-left">
                {cat.name}
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
          Marketplace Information
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

const CategoryScreen = ({ category, onBack, onClose }: CategoryScreenProps) => {
  if (!category) return null;
  const categoryUrl = `/catalog?category=${encodeURIComponent(category.name)}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-gray-200 shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          aria-label="Back to main menu"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-[15px] font-semibold text-white/90">{category.name}</span>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* View All row */}
        <Link
          to={categoryUrl}
          onClick={onClose}
          className="flex items-center gap-2 px-4 h-14 border-b border-gray-200 hover:bg-white/[0.07] active:bg-white/10 transition-colors"
        >
          <span className="text-[15px] font-semibold text-[#22C55E]">
            View All {category.name}
          </span>
          <ChevronRight className="h-4 w-4 text-[#22C55E]/60 ml-auto" aria-hidden="true" />
        </Link>

        {/* Chip rows — direct links */}
        <nav aria-label={`${category.name} subcategories`}>
          {category.children.map((sub) => (
            <Link
              key={sub.slug}
              to={`/catalog?category=${encodeURIComponent(category.name)}&q=${encodeURIComponent(sub.name)}`}
              onClick={onClose}
              className="flex items-center px-4 h-[52px] hover:bg-white/[0.07] active:bg-white/10 transition-colors border-b border-white/[0.05]"
            >
              <span className="text-[15px] font-medium text-white/80 flex-1 text-left">
                {sub.name}
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
  const { categories } = useCategories();

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
          "fixed inset-0 z-[9998] bg-transparent transition-opacity duration-300",
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
          "bg-white border-r border-gray-200 shadow-2xl flex flex-col",
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
            categories={categories}
          />
        )}
        {screen === "category" && activeCategory !== null && (
          <CategoryScreen
            category={categories.find((c) => c.slug === activeCategory) ?? null}
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
