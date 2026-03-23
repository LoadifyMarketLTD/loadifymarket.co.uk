import { ArrowRight, CheckCircle2, ShieldCheck, Tag, Layers, Star, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/* ─── Marketplace product card shown in hero right panel ─── */
const ProductCard = ({
  title,
  category,
  price,
  badge,
  badgeVariant,
  img,
  stars,
}: {
  title: string;
  category: string;
  price: string;
  badge: string;
  badgeVariant: "blue" | "green" | "orange" | "rose";
  img: string;
  stars: number;
}) => {
  const badgeClasses = {
    blue: "bg-blue-100 text-[#2563EB]",
    green: "bg-emerald-100 text-emerald-700",
    orange: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  }[badgeVariant];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative w-full h-24 overflow-hidden">
        <img
          src={img}
          alt={title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.src = "/images/placeholder-product.jpg";
          }}
        />
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeClasses}`}>
          {badge}
        </span>
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wide">{category}</p>
        <p className="text-xs font-bold text-[#0F172A] leading-snug mt-0.5 line-clamp-1">{title}</p>
        <div className="flex items-center justify-between mt-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className={`h-2.5 w-2.5 ${n <= stars ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} />
            ))}
          </div>
          <p className="text-sm font-extrabold text-[#0F172A]">{price}</p>
        </div>
      </div>
    </div>
  );
};

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-white via-blue-50/40 to-[#EEF2FF] py-16 lg:py-24 overflow-hidden">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT: headline + CTAs ── */}
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-[#2563EB] text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
              🇬🇧 The UK's Trusted Marketplace
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-display font-extrabold leading-[1.06] text-[#0F172A]">
              The UK Marketplace{" "}
              <span className="text-[#2563EB]">Connecting Buyers &amp; Sellers</span>
            </h1>

            <p className="text-lg text-[#334155] leading-relaxed">
              Discover thousands of products from verified UK sellers — electronics, fashion, home goods, beauty and more, all on one trusted platform.
            </p>

            <ul className="space-y-2.5">
              {[
                "Verified Sellers & Real Buyers",
                "Thousands of Products Across 16 Categories",
                "Secure Payments via Stripe",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[#334155] font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-1">
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
              Verified UK Businesses • Secure Payments • Buyer Protection
            </p>
          </div>

          {/* ── RIGHT: marketplace product showcase ── */}
          <div className="relative hidden lg:block">
            {/* Soft background glow */}
            <div className="absolute -inset-8 bg-gradient-to-br from-blue-100/60 via-sky-50/40 to-indigo-50/60 rounded-3xl" />

            <div className="relative space-y-3">
              {/* Platform header card */}
              <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center">
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
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="text-xs font-bold text-[#0F172A] ml-0.5">5.0</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Listings", value: "500+", icon: Tag, color: "text-[#2563EB] bg-blue-50" },
                  { label: "Sellers", value: "120+", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
                  { label: "Categories", value: "16", icon: Layers, color: "text-sky-600 bg-sky-50" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
                    <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-1.5`}>
                      <s.icon className="h-4 w-4" />
                    </div>
                    <p className="text-base font-bold text-[#0F172A]">{s.value}</p>
                    <p className="text-[10px] text-[#64748B]">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Product cards — consumer goods (no pallet/warehouse language) */}
              <div className="grid grid-cols-2 gap-3">
                <ProductCard
                  title="Sony WH-1000XM5 Earbuds"
                  category="Electronics"
                  price="£49.99"
                  badge="NEW"
                  badgeVariant="blue"
                  img="https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop"
                  stars={5}
                />
                <ProductCard
                  title="Summer Dress Collection"
                  category="Fashion"
                  price="£29.99"
                  badge="HOT"
                  badgeVariant="rose"
                  img="https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&auto=format&fit=crop"
                  stars={4}
                />
                <ProductCard
                  title="Smart Home Starter Kit"
                  category="Home & Kitchen"
                  price="£64.99"
                  badge="SALE"
                  badgeVariant="orange"
                  img="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&auto=format&fit=crop"
                  stars={4}
                />
                <ProductCard
                  title="Beauty Essentials Set"
                  category="Beauty"
                  price="£34.99"
                  badge="TOP"
                  badgeVariant="green"
                  img="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&auto=format&fit=crop"
                  stars={5}
                />
              </div>

              {/* Bottom trust row */}
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-[#334155]">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">Buyer Protection Active</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#334155]">
                  <MessageCircle className="h-4 w-4 text-[#2563EB]" />
                  <span className="font-medium">Real-time Messaging</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#334155]">
                  <Zap className="h-4 w-4 text-amber-500" />
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
