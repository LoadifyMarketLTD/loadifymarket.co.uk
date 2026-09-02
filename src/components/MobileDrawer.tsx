import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronRight, Grid2X2, X } from "lucide-react";
import DrawerAccountBlock from "@/components/mobile/DrawerAccountBlock";
import logo from "@/assets/LOGO.png";
import type { User } from "@/types";
import CATEGORY_CONFIG from "@/lib/category-config";
import { marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";
import { publicNavigationGroups } from "@/data/publicNavigation";

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
  expandedSlug: string | null;
  onCategoryExpand: (slug: string | null) => void;
  categoryDirectoryOpen: boolean;
  onCategoryDirectoryToggle: () => void;
}

const MainScreen = ({
  user,
  dashboardPath,
  onLogout,
  onClose,
  closeBtnRef,
  expandedSlug,
  onCategoryExpand,
  categoryDirectoryOpen,
  onCategoryDirectoryToggle,
}: MainScreenProps) => {
  return (
    <div className="flex h-full flex-col bg-[#F8F7F4] !text-[#0A234F]">
      <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#0A234F]/10 px-5">
        <Link to="/" onClick={onClose} className="flex min-w-0 items-center" aria-label="Loadify Market — Home">
          <img src={logo} alt="" aria-hidden="true" className="h-11 w-auto max-w-[190px] object-contain" />
        </Link>
        <button ref={closeBtnRef} onClick={onClose} className="rounded-lg p-2.5 !text-[#667085] transition-colors hover:bg-[#0A234F]/5 hover:!text-[#0A234F]" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-[#0A234F]/10 bg-white/65">
          <DrawerAccountBlock user={user} dashboardPath={dashboardPath} onLogout={onLogout} onClose={onClose} />
        </div>

        <div className="px-5 pb-2 pt-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] !text-[#8A7351]">Loadify Navigation Hub</p>
          <p className="mt-2 max-w-[310px] text-[13px] leading-5 !text-[#667085]">Explore the marketplace, understand the platform, or find the right route for buyers, sellers, suppliers and partners.</p>
        </div>

        <nav aria-label="Loadify platform directory" className="px-3 pb-3">
          {publicNavigationGroups.map((group) => (
            <section key={group.label} className="border-b border-[#0A234F]/10 py-4 last:border-b-0">
              <h2 className="px-2 pb-2 text-[10px] font-black uppercase tracking-[0.16em] !text-[#8A7351]">{group.label}</h2>
              <div className="grid gap-0.5">
                {group.items.map((item) => (
                  <Link key={`${group.label}-${item.label}-${item.to}`} to={item.to} onClick={onClose} className="group flex min-h-[44px] items-center justify-between rounded-lg px-2.5 py-2 !text-[#0A234F] transition-colors hover:bg-[#0A234F]/[0.045]">
                    <div className="min-w-0 pr-3">
                      <span className="block text-[14px] font-extrabold leading-5 !text-[#0A234F]">{item.label}</span>
                      {item.description && <span className="mt-0.5 block text-[11px] leading-4 !text-[#7A8493]">{item.description}</span>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 !text-[#9AA1AC] transition-transform group-hover:translate-x-0.5 group-hover:!text-[#8A7351]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="mx-5 h-px bg-[#0A234F]/10" />

        <div className="px-4 py-5">
          <button
            type="button"
            onClick={onCategoryDirectoryToggle}
            aria-expanded={categoryDirectoryOpen}
            className="flex w-full items-center justify-between rounded-xl border border-[#0A234F]/10 bg-white px-4 py-3.5 text-left shadow-[0_6px_18px_rgba(10,35,79,0.04)] transition hover:border-[#0A234F]/20"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F8F7F4]"><Grid2X2 className="h-4 w-4 !text-[#8A7351]" aria-hidden="true" /></span>
              <span><span className="block text-[13px] font-black !text-[#0A234F]">Marketplace categories</span><span className="mt-0.5 block text-[11px] !text-[#7A8493]">Open the product directory</span></span>
            </span>
            <ChevronDown className={`h-4 w-4 !text-[#667085] transition-transform ${categoryDirectoryOpen ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>

          {categoryDirectoryOpen && (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#0A234F]/10 bg-white">
              {CATEGORY_CONFIG.map((cat) => {
                const Icon = cat.icon;
                const isOpen = expandedSlug === cat.slug;
                const categoryUrl = `/category/${cat.slug}`;
                const hasChildren = cat.subcategories.length > 0;
                return (
                  <div key={cat.slug}>
                    <div className="flex border-b border-[#0A234F]/[0.07] last:border-b-0">
                      <Link to={categoryUrl} onClick={onClose} className="flex min-h-[48px] flex-1 items-center gap-3 px-4 !text-[#0A234F] transition-colors hover:bg-[#0A234F]/[0.035]">
                        <Icon className="h-[17px] w-[17px] shrink-0 !text-[#8A7351]" aria-hidden="true" />
                        <span className="flex-1 text-left text-[13px] font-bold !text-[#0A234F]">{cat.label}</span>
                      </Link>
                      {hasChildren && (
                        <button type="button" onClick={() => onCategoryExpand(isOpen ? null : cat.slug)} aria-expanded={isOpen} aria-label={`${isOpen ? "Collapse" : "Expand"} ${cat.label}`} className="flex w-12 items-center justify-center !text-[#8A94A3] transition-colors hover:bg-[#0A234F]/[0.035] hover:!text-[#0A234F]">
                          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    {isOpen && hasChildren && (
                      <div className="border-b border-[#0A234F]/10 bg-[#F8F7F4]">
                        {cat.subcategories.map((sub) => (
                          <Link key={sub} to={`${categoryUrl}?sub=${encodeURIComponent(marketplaceSubcategorySlug(cat.label, sub))}`} onClick={onClose} className="flex min-h-[40px] items-center border-b border-[#0A234F]/[0.05] px-9 py-2 !text-[#5A6578] transition-colors last:border-b-0 hover:bg-[#0A234F]/[0.035] hover:!text-[#0A234F]">
                            <span className="text-[12px] font-medium !text-[#5A6578]">{sub}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <Link to="/catalog" onClick={onClose} className="flex min-h-[46px] items-center justify-center gap-2 bg-[#F8F7F4] px-4 text-[12px] font-extrabold !text-[#0A234F]">Browse all products <ArrowRight className="h-3.5 w-3.5 !text-[#8A7351]" aria-hidden="true" /></Link>
            </div>
          )}
        </div>

        <div className="mx-5 h-px bg-[#0A234F]/10" />
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-5 text-[11px] font-semibold !text-[#667085]">
          <Link to="/privacy" onClick={onClose} className="hover:!text-[#0A234F]">Privacy</Link>
          <Link to="/terms" onClick={onClose} className="hover:!text-[#0A234F]">Terms</Link>
          <Link to="/returns-policy" onClick={onClose} className="hover:!text-[#0A234F]">Returns</Link>
          <Link to="/shipping-policy" onClick={onClose} className="hover:!text-[#0A234F]">Shipping</Link>
        </div>
        <div style={{ height: "env(safe-area-inset-bottom, 16px)" }} />
      </div>
    </div>
  );
};

const MobileDrawer = ({ open, onClose, user, dashboardPath, onLogout }: MobileDrawerProps) => {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [categoryDirectoryOpen, setCategoryDirectoryOpen] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => { setExpandedSlug(null); setCategoryDirectoryOpen(false); }, 300);
      return () => clearTimeout(t);
    }

    const focusTimer = setTimeout(() => closeBtnRef.current?.focus(), 50);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first) return;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
        } else if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { clearTimeout(focusTimer); document.removeEventListener("keydown", handleKey); };
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return createPortal(
    <>
      <div className={["fixed inset-0 z-[9998] bg-[#0A234F]/40 backdrop-blur-[1px] transition-opacity duration-300", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"].join(" ")} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id="mobile-navigation"
        className={["fixed left-0 top-0 z-[9999] h-[100dvh] w-[88vw] max-w-[430px]", "flex flex-col border-r border-[#0A234F]/10 bg-[#F8F7F4] shadow-[0_30px_80px_rgba(10,35,79,0.28)]", "transition-transform duration-300 ease-in-out", open ? "translate-x-0" : "-translate-x-full"].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Loadify navigation hub"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <MainScreen user={user} dashboardPath={dashboardPath} onLogout={onLogout} onClose={onClose} closeBtnRef={closeBtnRef} expandedSlug={expandedSlug} onCategoryExpand={setExpandedSlug} categoryDirectoryOpen={categoryDirectoryOpen} onCategoryDirectoryToggle={() => setCategoryDirectoryOpen((value) => !value)} />
      </div>
    </>,
    document.body
  );
};

export default MobileDrawer;
