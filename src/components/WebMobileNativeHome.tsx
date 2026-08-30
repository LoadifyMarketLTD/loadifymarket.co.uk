import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import MobileAppHeader from "@/components/MobileAppHeader";
import MobileGridCard from "@/components/MobileGridCard";
import { useCategories } from "@/hooks/useCategories";
import { useLiveCategoryAvailability } from "@/hooks/useLiveCategoryAvailability";
import { useMobileGrid } from "@/hooks/useMobileGrid";
import { marketplaceCategorySlug } from "@/data/marketplaceTaxonomy";
import { hasSellerAccess } from "@/lib/roleUtils";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";

const NAVY = "#0A234F";
const GOLD = "#F5A300";

function AppCategoryShortcuts() {
  const { pathname } = useLocation();
  const { categories } = useCategories();
  const { liveRootCategoryIds } = useLiveCategoryAvailability();
  const liveRootCategoryIdSet = new Set(liveRootCategoryIds);

  const visibleCategories = categories
    .filter((category) => liveRootCategoryIdSet.has(category.id))
    .slice(0, 8);

  const items = [
    { id: "all", label: "All", to: "/catalog" },
    ...visibleCategories.map((category) => ({
      id: category.id,
      label: category.name,
      to: `/category/${marketplaceCategorySlug(category.name)}`,
    })),
  ];

  return (
    <section aria-label="Browse categories" className="bg-background pb-1 pt-3">
      <div
        className="scrollbar-hide overflow-x-auto"
        style={{ paddingLeft: "var(--mob-side,16px)", scrollPaddingInlineStart: "var(--mob-side,16px)" }}
      >
        <div className="flex w-max gap-2">
          {items.map((item) => {
            const active = item.id === "all"
              ? pathname === "/" || pathname === "/catalog"
              : pathname === item.to || pathname.startsWith(`${item.to}/`);

            return (
              <Link
                key={item.id}
                to={item.to}
                className={[
                  "flex min-h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-[12px] font-semibold no-underline transition-colors",
                  active
                    ? "border-[#F5A300] bg-[#F5A300] text-[#0A234F]"
                    : "border-white/10 bg-white/[0.05] text-foreground/75",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="w-[var(--mob-side,16px)] shrink-0" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function CompactSellerAction() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);

  const handleSell = () => {
    if (!user) {
      promptAuth("sell");
      return;
    }

    if (hasSellerAccess(user)) {
      navigate("/sell");
      return;
    }

    navigate("/register?type=seller");
  };

  return (
    <section className="bg-background px-[var(--mob-side,16px)] pb-2 pt-3" aria-label="Seller action">
      <div className="rounded-2xl border border-white/10 bg-[#0A234F] px-4 py-4 shadow-[0_10px_28px_rgba(10,35,79,0.20)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#F5A300]">
              Sell on Loadify
            </p>
            <p className="mt-1.5 text-[15px] font-bold leading-5 text-white">
              List products and manage sales from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSell}
            className="min-h-10 shrink-0 rounded-xl bg-[#F5A300] px-4 text-[12px] font-extrabold text-[#0A234F]"
          >
            Sell
          </button>
        </div>
      </div>
    </section>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square w-full rounded-xl bg-white/[0.07]" />
      <div className="mt-2 h-3 w-4/5 rounded bg-white/[0.07]" />
      <div className="mt-2 h-3.5 w-2/5 rounded bg-white/[0.07]" />
    </div>
  );
}

export default function WebMobileNativeHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "220px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileAppHeader />
      <AppCategoryShortcuts />
      <CompactSellerAction />

      <section
        aria-label="Marketplace products"
        className="bg-background px-[var(--mob-side,16px)] pb-6 pt-4"
      >
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#F5A300]">
              Live marketplace
            </p>
            <h1 className="mt-1 text-[20px] font-extrabold leading-tight text-foreground">
              Explore products
            </h1>
          </div>
          <Link to="/catalog" className="pb-0.5 text-[12px] font-bold text-[#F5A300] no-underline">
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-[clamp(10px,3vw,14px)]">
          {loading
            ? Array.from({ length: 10 }).map((_, index) => <SkeletonCard key={index} />)
            : products.map((product, index) => (
                <MobileGridCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  location={product.location}
                  priority={index < 4}
                />
              ))}

          {loadingMore && Array.from({ length: 4 }).map((_, index) => <SkeletonCard key={`more-${index}`} />)}
        </div>

        {!loading && hasMore && <div ref={sentinelRef} className="h-px" aria-hidden="true" />}
      </section>
    </div>
  );
}
