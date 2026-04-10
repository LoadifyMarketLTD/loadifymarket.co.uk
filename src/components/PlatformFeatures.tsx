import { Link } from "react-router-dom";
import { ArrowRight, Search, ShieldCheck, CreditCard, HeadphonesIcon, PackagePlus, TrendingUp, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

const buyerBenefits = [
  {
    icon: Search,
    iconBg: "rgba(124,58,237,0.20)",
    iconColor: "#A78BFA",
    title: "Browse Marketplace Listings",
    desc: "Find products across all categories from registered UK sellers — electronics, fashion, home & garden, handmade and more.",
  },
  {
    icon: ShieldCheck,
    iconBg: "rgba(34,197,94,0.20)",
    iconColor: "#4ADE80",
    title: "Active Seller Accounts",
    desc: "Sellers complete their profile and Stripe setup before listing on the marketplace.",
  },
  {
    icon: CreditCard,
    iconBg: "rgba(99,102,241,0.20)",
    iconColor: "#818CF8",
    title: "Secure Stripe Checkout",
    desc: "Pay safely via Stripe with full transaction transparency.",
  },
  {
    icon: HeadphonesIcon,
    iconBg: "rgba(14,165,233,0.20)",
    iconColor: "#38BDF8",
    title: "Buyer Support",
    desc: "Dedicated support team to help resolve disputes and answer questions quickly.",
  },
];

const sellerBenefits = [
  {
    icon: PackagePlus,
    iconBg: "rgba(34,197,94,0.20)",
    iconColor: "#4ADE80",
    title: "List for Free",
    desc: "Create your seller account and list your first products at zero cost — no setup fees.",
  },
  {
    icon: Users,
    iconBg: "rgba(52,211,153,0.20)",
    iconColor: "#34D399",
    title: "Reach Real UK Buyers",
    desc: "Access a growing base of registered buyers actively searching for products across all categories.",
  },
  {
    icon: Banknote,
    iconBg: "rgba(251,191,36,0.20)",
    iconColor: "#FCD34D",
    title: "Fast Stripe Payouts",
    desc: "Payments processed securely via Stripe. 0% Commission until 31 December 2026, then 7% on completed sales with fast payouts.",
  },
  {
    icon: TrendingUp,
    iconBg: "rgba(244,63,94,0.20)",
    iconColor: "#FB7185",
    title: "Seller Dashboard",
    desc: "Manage listings, track orders, view analytics and grow your sales — all from one dashboard.",
  },
];

const PlatformFeatures = () => {
  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 py-10 sm:py-16 lg:py-20"
      style={{ background: "linear-gradient(to bottom, #081426, #0A1930, #0F2A4A)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 20% 50%, rgba(0,255,150,0.07), transparent 40%)" }}
      />
      {/* Dot texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative max-w-[1280px] mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Built for UK Buyers &amp; Sellers
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
            Everything You Need — Whether You Buy or Sell
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Loadify Market is the UK's trusted multi-category marketplace for physical goods.
          </p>
        </div>

        {/* Two-column comparison */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* For Buyers */}
          <div className="rounded-3xl p-7 bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(124,58,237,0.20)" }}
              >
                <Search className="h-5 w-5" style={{ color: "#A78BFA" }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-400">For Buyers</p>
                <h3 className="text-lg font-display font-bold text-white">Find What You're Looking For</h3>
              </div>
            </div>

            <ul className="space-y-3.5">
              {buyerBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: b.iconBg }}
                  >
                    <b.icon className="h-4 w-4" style={{ color: b.iconColor }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-white/60 mt-0.5 leading-snug">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-1">
              <Link to="/catalog">
                <Button className="w-full h-11 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold rounded-full hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,255,150,0.3)] transition-all duration-300">
                  Browse Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* For Sellers */}
          <div className="rounded-3xl p-7 bg-white/5 backdrop-blur-md border border-emerald-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.4)] flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(34,197,94,0.20)" }}
              >
                <PackagePlus className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">For Sellers</p>
                <h3 className="text-lg font-display font-bold text-white">Sell Your Products</h3>
              </div>
            </div>

            <ul className="space-y-3.5">
              {sellerBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: b.iconBg }}
                  >
                    <b.icon className="h-4 w-4" style={{ color: b.iconColor }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-white/60 mt-0.5 leading-snug">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-1">
              <Link to="/signup">
                <Button className="w-full h-11 bg-gradient-to-r from-green-400 to-green-500 text-black font-semibold rounded-full hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(0,255,150,0.3)] transition-all duration-300">
                  Start Selling Today <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Trust stats bar */}
        <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.3)] py-4 px-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { value: "UK", label: "Marketplace" },
            { value: "Early", label: "Seller Launch" },
            { value: "9", label: "Categories" },
            { value: "24/7", label: "Access" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl sm:text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
