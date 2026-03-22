import { ArrowRight, ShieldCheck, CreditCard, MessageSquare, Layers, Star, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import electronicsImg from "@/assets/categories/electronics.jpg";
import clothingImg from "@/assets/categories/clothing.jpg";
import toolsImg from "@/assets/categories/tools.jpg";
import healthBeautyImg from "@/assets/categories/health-beauty.jpg";

const trustChips = [
  { icon: ShieldCheck, label: "Verified Sellers", color: "text-emerald-600 bg-emerald-50" },
  { icon: CreditCard, label: "Secure Payments", color: "text-blue-600 bg-blue-50" },
  { icon: MessageSquare, label: "Real-time Messaging", color: "text-violet-600 bg-violet-50" },
];

const MockCard = ({
  title,
  category,
  price,
  badge,
  badgeColor,
  image,
}: {
  title: string;
  category: string;
  price: string;
  badge: string;
  badgeColor: string;
  image: string;
}) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
    <div className="w-full h-20 rounded-lg overflow-hidden">
      <img
        src={image}
        alt={category}
        className="w-full h-full object-cover"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          if (img.src !== window.location.origin + "/images/placeholder-product.jpg")
            img.src = "/images/placeholder-product.jpg";
        }}
      />
    </div>
    <div className="flex items-start justify-between gap-1">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{category}</p>
      </div>
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
    </div>
    <p className="text-sm font-bold text-[#2563EB]">{price}</p>
  </div>
);

const HeroSection = () => {
  return (
    <section className="bg-white py-16 lg:py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* LEFT: text content */}
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              🇬🇧 The UK's Trusted Marketplace
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3rem] font-display font-extrabold leading-[1.08] text-[#0F172A]">
              The UK Marketplace{" "}
              <span className="text-[#2563EB]">Connecting Buyers &amp; Sellers</span>
            </h1>

            <p className="text-lg text-[#334155] leading-relaxed">
              Discover wholesale stock, clearance goods and returns pallets from verified UK sellers — all on one trusted platform.
            </p>

            {/* Trust feature chips */}
            <div className="flex flex-wrap gap-2">
              {trustChips.map((chip) => (
                <span
                  key={chip.label}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-100 bg-white shadow-sm ${chip.color}`}
                >
                  <chip.icon className="h-3.5 w-3.5 shrink-0" />
                  {chip.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-bold text-base px-8 h-12 shadow-md shadow-blue-200"
                >
                  Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signup?type=seller">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-[#2563EB] text-[#2563EB] hover:bg-blue-50 font-bold text-base px-8 h-12"
                >
                  Start Selling <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              Verified UK Businesses • Secure Payments • Buyer Protection
            </p>
          </div>

          {/* RIGHT: marketplace visual mockup */}
          <div className="relative hidden lg:flex flex-col gap-3">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-50/80 via-sky-50/60 to-slate-100/40 rounded-3xl" />

            {/* Platform header card */}
            <div className="relative bg-white rounded-2xl shadow-md border border-slate-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center">
                  <Layers className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Loadify Market</p>
                  <p className="text-[11px] text-slate-500">Live UK marketplace</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs font-bold text-slate-800">5.0</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative grid grid-cols-3 gap-3">
              {[
                { label: "Active Listings", value: "500+", icon: Tag, colorClass: "text-[#2563EB] bg-blue-50" },
                { label: "Verified Sellers", value: "120+", icon: ShieldCheck, colorClass: "text-emerald-600 bg-emerald-50" },
                { label: "Categories", value: "16", icon: Layers, colorClass: "text-sky-600 bg-sky-50" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
                  <div className={`w-8 h-8 rounded-lg ${stat.colorClass} flex items-center justify-center mx-auto mb-1.5`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <p className="text-base font-bold text-slate-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Product grid */}
            <div className="relative grid grid-cols-2 gap-3">
              <MockCard title="Mixed Electronics Pallet" category="Electronics" price="£380" badge="CLEARANCE" badgeColor="bg-red-100 text-red-700" image={electronicsImg} />
              <MockCard title="Wholesale Clothing Lot" category="Fashion" price="£240" badge="WHOLESALE" badgeColor="bg-blue-100 text-blue-700" image={clothingImg} />
              <MockCard title="Returns Pallet — Tools" category="Tools & DIY" price="£195" badge="RETURNS" badgeColor="bg-amber-100 text-amber-700" image={toolsImg} />
              <MockCard title="Health & Beauty Bundle" category="Health & Beauty" price="£165" badge="NEW" badgeColor="bg-emerald-100 text-emerald-700" image={healthBeautyImg} />
            </div>

            {/* Bottom trust row */}
            <div className="relative bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">Buyer Protection Active</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">0% Commission for New Sellers</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
