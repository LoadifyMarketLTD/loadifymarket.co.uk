/**
 * LatestListings — newest active listings, sorted by createdAt descending.
 * Shares the same card layout as TrendingProducts.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, BadgeCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface HomeProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  slug: string | null;
  location: string | null;
  createdAt: string;
  seller: { isVerified: boolean } | null;
}

function ProductCard({ item }: { item: HomeProduct }) {
  const img = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
  const href = item.slug ? `/product/${item.slug}` : `/product/${item.id}`;
  return (
    <Link
      to={href}
      className="flex flex-col rounded-2xl overflow-hidden border border-white/[0.07] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FBBF24]/25 hover:shadow-[0_0_18px_rgba(251,191,36,0.10)]"
      style={{ background: "#111827" }}
    >
      {/* Square image */}
      <div className="relative aspect-square bg-[#0B0F1A] overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-slate-500 text-xs">No image</span>
          </div>
        )}
        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-[#0B0F1A]">
          New
        </span>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="text-white text-[13px] font-semibold leading-snug line-clamp-2 flex-1">
          {item.title}
        </p>
        <p className="text-[#FBBF24] text-sm font-black">
          £{item.price.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <div className="flex items-center justify-between mt-0.5">
          {item.location && (
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              {item.location}
            </span>
          )}
          {item.seller?.isVerified && (
            <span className="flex items-center gap-0.5 text-[10px] text-[#FBBF24]">
              <BadgeCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
              Verified
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden border border-white/[0.07]" style={{ background: "#111827" }}>
          <div className="aspect-square bg-white/[0.04] animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LatestListings() {
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, title, price, images, slug, location, createdAt, seller:users!sellerId(isVerified)")
      .eq("isActive", true)
      .eq("isApproved", true)
      .order("createdAt", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error && data) setProducts(data as unknown as HomeProduct[]);
        setLoading(false);
      });
  }, []);

  return (
    <section aria-labelledby="latest-heading" className="px-4 py-5" style={{ background: "#0B0F1A" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 id="latest-heading" className="text-[13px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-[#FBBF24]" aria-hidden="true" />
          Latest Listings
        </h2>
        <Link to="/catalog?sort=newest" className="text-[11px] font-bold text-[#FBBF24] uppercase tracking-wide hover:underline">
          See All →
        </Link>
      </div>
      {loading ? (
        <SkeletonGrid count={4} />
      ) : products.length === 0 ? (
        <p className="text-slate-400 text-xs text-center py-6">No listings yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {products.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
