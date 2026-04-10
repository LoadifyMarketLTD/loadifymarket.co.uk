import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ShowcaseProduct {
  id: string;
  title: string;
  price: number;
  images: string[] | null;
  category: { name: string; slug: string } | null;
  slug: string | null;
}

/** Static mock listings shown when no live products exist yet. */
const MOCK_PRODUCTS: ShowcaseProduct[] = [
  {
    id: "mock-1",
    title: "Wholesale Garden Tool Set — 12-Piece Bundle",
    price: 24.99,
    images: null,
    category: { name: "Garden & Outdoor", slug: "garden" },
    slug: null,
  },
  {
    id: "mock-2",
    title: "Party Bags Assorted — Pack of 100",
    price: 18.5,
    images: null,
    category: { name: "Party & Gift", slug: "party-gift" },
    slug: null,
  },
  {
    id: "mock-3",
    title: "Professional Cleaning Supplies Bundle",
    price: 32.0,
    images: null,
    category: { name: "Cleaning Products", slug: "cleaning" },
    slug: null,
  },
  {
    id: "mock-4",
    title: "Kids Educational Activity Toy Pack — 24 Units",
    price: 45.0,
    images: null,
    category: { name: "Toys & Games", slug: "toys" },
    slug: null,
  },
  {
    id: "mock-5",
    title: "Kitchen Storage Canisters — Set of 6",
    price: 28.75,
    images: null,
    category: { name: "Kitchenware", slug: "kitchenware" },
    slug: null,
  },
  {
    id: "mock-6",
    title: "LED Strip Lights 5m — RGB Colour Changing",
    price: 15.99,
    images: null,
    category: { name: "Electrical", slug: "electrical" },
    slug: null,
  },
];

/** Deterministic swatch colour per mock product for the placeholder thumbnail. */
const MOCK_SWATCHES = [
  "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
];

/**
 * Latest Products — clean B2B product grid.
 * White/grey background, bordered cards, no dark gradients or glow effects.
 * Fetches up to 6 active, approved products from Supabase.
 * Falls back to static mock product cards when no live listings exist yet.
 */
const FeaturedProducts = () => {
  const [products, setProducts] = useState<ShowcaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, title, price, images, slug, category:categories!categoryId(name, slug)")
      .eq("isActive", true)
      .eq("isApproved", true)
      .order("createdAt", { ascending: false })
      .limit(6)
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setProducts(data as unknown as ShowcaseProduct[]);
        } else {
          setProducts(MOCK_PRODUCTS);
          setIsMock(true);
        }
        setLoading(false);
      });
  }, []);

  if (loading) return null;

  return (
    <section className="bg-white border-b border-gray-200" aria-label="Latest marketplace products">
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[13px] font-black text-gray-900 uppercase tracking-widest">
              {isMock ? "Sample Listings" : "Latest Products"}
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isMock
                ? "Example product cards — live listings appear here once sellers go live"
                : "Recently listed by UK trade suppliers"}
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-[11px] font-bold text-[#0d2240] uppercase tracking-wide hover:underline flex items-center gap-1"
          >
            Browse All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Product grid — gap-px hairline borders */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-gray-200">
          {products.map((item, idx) => {
            const img =
              Array.isArray(item.images) && item.images.length > 0
                ? item.images[0]
                : null;
            const href =
              isMock
                ? "/register?type=seller"
                : item.slug
                ? `/product/${item.slug}`
                : `/product/${item.id}`;
            const swatchClass = MOCK_SWATCHES[idx % MOCK_SWATCHES.length];
            return (
              <Link
                key={item.id}
                to={href}
                className="flex flex-col bg-white hover:bg-[#f8f9fb] transition-colors group"
              >
                {/* Square thumbnail */}
                <div className="aspect-square overflow-hidden relative">
                  {img ? (
                    <img
                      src={img}
                      alt={item.title}
                      width={400}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center gap-1 ${swatchClass}`}
                    >
                      {item.category && (
                        <span className="text-[10px] font-bold uppercase tracking-wide opacity-80 px-2 text-center leading-tight">
                          {item.category.name}
                        </span>
                      )}
                      <span className="text-[9px] opacity-50">WHOLESALE</span>
                    </div>
                  )}
                  {isMock && (
                    <div className="absolute top-0 left-0 bg-[#0d2240]/80 text-white text-[8px] font-bold uppercase px-1.5 py-0.5 tracking-wide">
                      SAMPLE
                    </div>
                  )}
                </div>

                {/* Product info */}
                <div className="px-2.5 py-2.5 flex flex-col gap-0.5 flex-1 border-t border-gray-100">
                  {item.category && (
                    <span className="text-[10px] font-bold text-[#0d2240] uppercase tracking-wide line-clamp-1">
                      {item.category.name}
                    </span>
                  )}
                  <p className="text-xs font-semibold text-gray-800 leading-snug line-clamp-2 flex-1">
                    {item.title}
                  </p>
                  <p className="text-sm font-black text-[#0d2240] mt-1">
                    £{item.price.toLocaleString("en-GB", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {isMock && (
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#0d2240] text-white text-xs font-bold uppercase tracking-wide hover:bg-[#1a3a5c] transition-colors"
            >
              List Your Products <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-[11px] text-gray-400">
              Be among the first trade suppliers to go live
            </span>
          </div>
        )}

      </div>
    </section>
  );
};

export default FeaturedProducts;
