import { ArrowRight, CheckCircle2, ShieldCheck, Tag, Layers, Star, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import CountdownBanner from "@/components/CountdownBanner";

/* ─── Compact product card for hero right panel ─── */
const MiniProductCard = ({
  title,
  category,
  badge,
  badgeVariant,
  img,
  stars,
}: {
  title: string;
  category: string;
  badge: string;
  badgeVariant: "blue" | "green" | "orange" | "rose" | "violet" | "sky";
  img: string;
  stars: number;
}) => {
  const badgeClasses: Record<string, string> = {
    blue: "bg-blue-100 text-[#2563EB]",
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700",
    sky: "bg-sky-100 text-sky-700",
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative w-full h-[72px] overflow-hidden bg-slate-50">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.src = "/images/placeholder-product.jpg";
          }}
        />
        <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeClasses[badgeVariant]}`}>
          {badge}
        </span>
      </div>
      <div className="p-2">
        <p className="text-[9px] font-semibold text-[#2563EB] uppercase tracking-wide leading-none">{category}</p>
        <p className="text-[10px] font-bold text-[#0F172A] leading-snug mt-0.5 line-clamp-1">{title}</p>
        <div className="flex items-center justify-start mt-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-2 w-2 ${n <= stars ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Small product thumbnail for left-side strip ─── */
const StripThumb = ({ img, label }: { img: string; label: string }) => (
  <div className="flex flex-col items-center gap-1 shrink-0">
    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
      <img
        src={img}
        alt={label}
        className="w-full h-full object-cover"
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.src = "/images/placeholder-product.jpg";
        }}
      />
    </div>
    <span className="text-[9px] text-[#64748B] font-medium text-center leading-tight max-w-[48px] truncate">{label}</span>
  </div>
);

/* ─── Hero product data — 12 cards ─── */
const HERO_PRODUCTS = [
  {
    title: "Wireless Earbuds Pro",
    category: "Electronics",
    badge: "NEW",
    badgeVariant: "blue" as const,
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
  {
    title: "Summer Wrap Dress",
    category: "Fashion",
    badge: "HOT",
    badgeVariant: "rose" as const,
    img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
  {
    title: "Smart LED Bulb Set",
    category: "Home & Kitchen",
    badge: "SALE",
    badgeVariant: "orange" as const,
    img: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
  {
    title: "Skincare Gift Set",
    category: "Beauty",
    badge: "TOP",
    badgeVariant: "green" as const,
    img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
  {
    title: "Mechanical Keyboard",
    category: "Electronics",
    badge: "NEW",
    badgeVariant: "blue" as const,
    img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
  {
    title: "Minimalist Watch",
    category: "Fashion",
    badge: "HOT",
    badgeVariant: "violet" as const,
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
  {
    title: "Cordless Drill Kit",
    category: "Tools & DIY",
    badge: "DEAL",
    badgeVariant: "orange" as const,
    img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
  {
    title: "Yoga Mat Premium",
    category: "Health",
    badge: "NEW",
    badgeVariant: "green" as const,
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
  {
    title: "Perfume Gift Box",
    category: "Beauty",
    badge: "TOP",
    badgeVariant: "rose" as const,
    img: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
  {
    title: "Desk Organiser Set",
    category: "Office",
    badge: "SALE",
    badgeVariant: "sky" as const,
    img: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
  {
    title: "Kids Building Blocks",
    category: "Toys",
    badge: "NEW",
    badgeVariant: "violet" as const,
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&auto=format&fit=crop&q=80",
    stars: 5,
  },
  {
    title: "Car Phone Holder",
    category: "Automotive",
    badge: "HOT",
    badgeVariant: "sky" as const,
    img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=300&auto=format&fit=crop&q=80",
    stars: 4,
  },
];

/* ─── Mini strip products under left text ─── */
const STRIP_PRODUCTS = [
  { img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=120&auto=format&fit=crop&q=80", label: "Headphones" },
  { img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&auto=format&fit=crop&q=80", label: "Trainers" },
  { img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=120&auto=format&fit=crop&q=80", label: "Skincare" },
  { img: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=120&auto=format&fit=crop&q=80", label: "Office" },
  { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=120&auto=format&fit=crop&q=80", label: "Watches" },
];

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-white via-blue-50/40 to-[#EEF2FF] py-10 lg:py-14 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 lg:gap-10 items-start">

          {/* ── LEFT: headline + CTAs ── */}
          <div className="space-y-5 max-w-xl">
            <CountdownBanner variant="hero" />

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-display font-extrabold leading-[1.06] text-[#0F172A]">
              The UK Marketplace{" "}
              <span className="text-[#2563EB]">Connecting Buyers &amp; Sellers</span>
            </h1>

            <p className="text-lg text-[#334155] leading-relaxed">
              Discover thousands of products from active UK sellers — electronics, fashion, home goods, beauty and more, all on one trusted platform.
            </p>

            <ul className="space-y-2">
              {[
                "Active Sellers & Registered Buyers",
                "Thousands of Products Across 9 Categories",
                "Secure Payments via Stripe",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[#334155] font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3">
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base px-8 rounded-xl shadow-md"
                >
                  Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/register?type=seller">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-2 border-[#2563EB] text-[#2563EB] hover:bg-blue-50 font-bold text-base px-8 rounded-xl"
                >
                  Start Selling <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-[#64748B] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Registered UK Businesses • Secure Checkout • Dispute Support Available
            </p>

            {/* ── Mini product strip ── */}
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Trending now</p>
              <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {STRIP_PRODUCTS.map((p) => (
                  <Link key={p.label} to="/catalog">
                    <StripThumb img={p.img} label={p.label} />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: marketplace product showcase ── */}
          <div className="relative hidden lg:block">
            {/* Soft background glow */}
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/60 via-sky-50/40 to-indigo-50/60 rounded-3xl" />

            <div className="relative space-y-2.5">
              {/* Platform header card */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#2563EB] flex items-center justify-center shrink-0">
                    <Layers className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">Loadify Market</p>
                    <p className="text-[11px] text-[#64748B] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Live UK Marketplace
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-bold text-[#0F172A] ml-0.5">5.0</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Listings", value: "500+", icon: Tag, color: "text-[#2563EB] bg-blue-50" },
                  { label: "Sellers", value: "120+", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Categories", value: "9", icon: Layers, color: "text-sky-600 bg-sky-50" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5 text-center">
                    <div className={`w-7 h-7 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-1`}>
                      <s.icon className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm font-bold text-[#0F172A]">{s.value}</p>
                    <p className="text-[10px] text-[#64748B]">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Product cards grid — 3 columns × 4 rows = 12 cards */}
              <div className="grid grid-cols-3 gap-2">
                {HERO_PRODUCTS.map((p) => (
                  <Link key={p.title} to="/catalog">
                    <MiniProductCard {...p} />
                  </Link>
                ))}
              </div>

              {/* Bottom trust row */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-medium">Secure Checkout</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                  <MessageCircle className="h-3.5 w-3.5 text-[#2563EB]" />
                  <span className="font-medium">Live Messaging</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#334155]">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-medium">Fast Payouts</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
