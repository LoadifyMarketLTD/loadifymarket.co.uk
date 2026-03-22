import { ArrowRight, CheckCircle2, ShieldCheck, Tag, TrendingDown, Layers, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import electronicsImg from "@/assets/categories/electronics.jpg";
import clothingImg from "@/assets/categories/clothing.jpg";
import toolsImg from "@/assets/categories/tools.jpg";
import healthBeautyImg from "@/assets/categories/health-beauty.jpg";

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
  <div className="bg-white rounded-xl shadow-md border border-slate-100 p-3 flex flex-col gap-2 hover:shadow-lg transition-shadow">
    <div className="w-full h-20 rounded-lg overflow-hidden">
      <img
        src={image}
        alt={category}
        className="w-full h-full object-cover"
        onError={(e) => { const img = e.target as HTMLImageElement; if (img.src !== window.location.origin + '/images/placeholder-product.jpg') img.src = '/images/placeholder-product.jpg'; }}
      />
    </div>
    <div className="flex items-start justify-between gap-1">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{category}</p>
      </div>
      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
    </div>
    <p className="text-sm font-bold text-primary">{price}</p>
  </div>
);

const HeroSection = () => {
  return (
    <section
      className="relative min-h-[88vh] flex items-center overflow-hidden"
      style={{
        backgroundImage: "url('/images/hero.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(rgba(10,34,57,0.7), rgba(10,34,57,0.9))" }} />

      <div className="relative z-10 container mx-auto px-4 py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* LEFT SIDE */}
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-emerald-900/50 border border-emerald-500/50 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              UK's Trusted B2B Marketplace
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-display font-bold leading-[1.08] text-white">
              The UK Marketplace for{" "}
              <span className="text-emerald-400">Wholesale, Clearance &amp; Returns</span>
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed">
              Connect with verified UK sellers and buyers. List your stock, discover suppliers, and trade securely — all in one place.
            </p>

            <ul className="space-y-2.5">
              {[
                "Verified Sellers & Real Buyers",
                "Wholesale, Clearance & Returns Listings",
                "Secure Payments via Stripe",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-slate-200 font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 shadow-lg shadow-emerald-600/25"
                >
                  Browse Listings <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link to="/register?type=seller">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white hover:bg-slate-50 text-slate-900 border-slate-300 font-bold text-base px-8 shadow-sm"
                >
                  Start Selling <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              Verified UK Businesses • Secure Payments • Buyer Protection
            </p>
          </div>

          {/* RIGHT SIDE — marketplace visual mockup */}
          <div className="relative hidden lg:flex flex-col gap-3">
            {/* Decorative gradient blob */}
            <div className="absolute -inset-8 bg-gradient-to-br from-primary/5 via-emerald-500/5 to-blue-500/5 rounded-3xl blur-2xl pointer-events-none" />

            {/* Platform header bar */}
            <div className="relative bg-white rounded-2xl shadow-xl border border-slate-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-hero flex items-center justify-center">
                  <Layers className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Loadify Market</p>
                  <p className="text-[11px] text-slate-500">Live marketplace</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                </div>
                <span className="text-xs font-bold text-slate-800">5.0</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="relative grid grid-cols-3 gap-3">
              {[
                { label: "Active Listings", value: "500+", icon: Tag, color: "text-primary bg-primary/10" },
                { label: "Verified Sellers", value: "120+", icon: ShieldCheck, color: "text-emerald-600 bg-emerald-50" },
                { label: "Categories", value: "16", icon: Layers, color: "text-blue-600 bg-blue-50" },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center">
                  <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-1.5`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <p className="text-base font-bold text-slate-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Product card grid */}
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
                <TrendingDown className="h-4 w-4 text-primary" />
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