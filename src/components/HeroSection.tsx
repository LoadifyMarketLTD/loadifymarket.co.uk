import { useState, useEffect } from "react";
import { ArrowRight, Tag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/* ─── Countdown target: 1 July 2026 23:59:59 BST ─── */
const TARGET_TIME = new Date("2026-07-01T22:59:59Z").getTime();

function getTimeLeft() {
  const diff = Math.max(0, TARGET_TIME - Date.now());
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/* ─── Right-side featured product data ─── */
const LARGE_PRODUCT = {
  title: "Sony WH-1000XM5 Headphones",
  category: "Electronics",
  price: "£249.99",
  badge: "Best Seller",
  img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80",
  stars: 5,
  reviews: 214,
};

const SMALL_PRODUCTS = [
  {
    title: "Nike Air Max 270",
    category: "Fashion",
    price: "£89.99",
    badge: "NEW",
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
  {
    title: "Apple Watch Series 9",
    category: "Electronics",
    price: "£319.00",
    badge: "HOT",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
];

/* ─── Reusable star row ─── */
const Stars = ({ count }: { count: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={`h-3 w-3 ${n <= count ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}`}
      />
    ))}
  </div>
);

const HeroSection = () => {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired =
    time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  return (
    <section
      className="relative min-h-[560px] lg:min-h-[620px] bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{
        backgroundImage:
          "url('https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1600&auto=format&fit=crop&q=80')",
      }}
    >
      {/* Overlay: heavy on left for legibility, lighter on right so products shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0D1B2A]/92 via-[#0D1B2A]/60 to-[#0D1B2A]/25" />

      {/* TOP RIGHT: badge + countdown */}
      {!expired && (
        <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-10 flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 bg-amber-400 text-[#0F172A] text-[11px] font-extrabold px-3 py-1.5 rounded-full shadow-lg">
            <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
            0% Fees Until July 1, 2026
          </div>
          <div className="bg-black/40 backdrop-blur-md border border-white/15 rounded-lg px-3.5 py-1.5 text-white text-xs font-bold tabular-nums shadow tracking-wider">
            {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
          </div>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 min-h-[560px] lg:min-h-[620px] flex items-center py-14 lg:py-20">
        <div className="w-full grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-12 items-center">

          {/* ── LEFT: title + subtext + CTAs ── */}
          <div className="space-y-6 max-w-lg">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-display font-extrabold leading-[1.06] text-white">
              Reach Real Buyers
            </h1>

            <p className="text-lg text-white/80 leading-relaxed">
              Buy and sell across the UK marketplace.{" "}
              <span className="text-amber-300 font-semibold">
                Start today with 0% commission until July 1.
              </span>
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/seller/products/new">
                <Button
                  size="lg"
                  className="h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base px-8 rounded-xl shadow-md"
                >
                  Create Listing <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="h-12 bg-white text-[#0F172A] hover:bg-slate-100 font-bold text-base px-8 rounded-xl shadow-md border-0"
                >
                  Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* ── RIGHT: product showcase (1 large + 2 small) ── */}
          <div className="hidden lg:flex flex-col gap-3">

            {/* Large product card */}
            <Link to="/catalog" className="block">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200">
                <div className="w-44 h-36 shrink-0 overflow-hidden bg-slate-50">
                  <img
                    src={LARGE_PRODUCT.img}
                    alt={LARGE_PRODUCT.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.jpg"; }}
                  />
                </div>
                <div className="flex flex-col justify-center px-4 py-3 gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wide">{LARGE_PRODUCT.category}</span>
                    <span className="text-[10px] font-extrabold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{LARGE_PRODUCT.badge}</span>
                  </div>
                  <p className="text-sm font-bold text-[#0F172A] leading-snug">{LARGE_PRODUCT.title}</p>
                  <Stars count={LARGE_PRODUCT.stars} />
                  <p className="text-[11px] text-slate-400">{LARGE_PRODUCT.reviews} reviews</p>
                  <p className="text-lg font-extrabold text-[#2563EB] mt-0.5">{LARGE_PRODUCT.price}</p>
                </div>
              </div>
            </Link>

            {/* Two small product cards side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              {SMALL_PRODUCTS.map((p) => (
                <Link key={p.title} to="/catalog" className="block">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
                    <div className="relative h-28 overflow-hidden bg-slate-50">
                      <img
                        src={p.img}
                        alt={p.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/images/placeholder-product.jpg"; }}
                      />
                      <span className={`absolute top-2 right-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${p.badge === "NEW" ? "bg-[#2563EB]" : "bg-rose-500"}`}>
                        {p.badge}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[9px] font-bold text-[#2563EB] uppercase tracking-wide">{p.category}</p>
                      <p className="text-[11px] font-bold text-[#0F172A] leading-snug mt-0.5 line-clamp-1">{p.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <Stars count={p.stars} />
                        <p className="text-xs font-extrabold text-[#2563EB]">{p.price}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
