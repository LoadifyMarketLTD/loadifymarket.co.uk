import { Link } from "react-router-dom";
import { ArrowRight, Search, ShieldCheck, CreditCard, HeadphonesIcon, PackagePlus, TrendingUp, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

const buyerBenefits = [
  {
    icon: Search,
    iconBgClass: "bg-admin/20",
    iconColorClass: "text-admin",
    title: "Browse Marketplace Listings",
    desc: "Find products across all categories from registered UK sellers — electronics, fashion, home & garden, handmade and more.",
  },
  {
    icon: ShieldCheck,
    iconBgClass: "bg-primary/20",
    iconColorClass: "text-primary",
    title: "Active Seller Accounts",
    desc: "Sellers complete their profile and Stripe setup before listing on the marketplace.",
  },
  {
    icon: CreditCard,
    iconBgClass: "bg-secondary/20",
    iconColorClass: "text-secondary",
    title: "Secure Stripe Checkout",
    desc: "Pay safely via Stripe with full transaction transparency.",
  },
  {
    icon: HeadphonesIcon,
    iconBgClass: "bg-accent/20",
    iconColorClass: "text-accent",
    title: "Buyer Support",
    desc: "Dedicated support team to help resolve disputes and answer questions quickly.",
  },
];

const sellerBenefits = [
  {
    icon: PackagePlus,
    iconBgClass: "bg-primary/20",
    iconColorClass: "text-primary",
    title: "List for Free",
    desc: "Create your seller account and list your first products at zero cost — no setup fees.",
  },
  {
    icon: Users,
    iconBgClass: "bg-primary/20",
    iconColorClass: "text-primary",
    title: "Reach Real UK Buyers",
    desc: "Access a growing base of registered buyers actively searching for products across all categories.",
  },
  {
    icon: Banknote,
    iconBgClass: "bg-warning/20",
    iconColorClass: "text-warning",
    title: "Fast Stripe Payouts",
    desc: "Payments processed securely via Stripe. 0% Commission until 31 December 2026, then 7% on completed sales with fast payouts.",
  },
  {
    icon: TrendingUp,
    iconBgClass: "bg-danger/20",
    iconColorClass: "text-danger",
    title: "Seller Dashboard",
    desc: "Manage listings, track orders, view analytics and grow your sales — all from one dashboard.",
  },
];

const PlatformFeatures = () => {
  return (
    <section
      className="relative overflow-hidden px-4 sm:px-6 py-10 sm:py-16 lg:py-20 bg-background"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(circle at 20% 50%, rgba(31,138,112,0.07), transparent 40%)" }}
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
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Built for UK Buyers &amp; Sellers
          </span>
          <h2 className="mt-2 text-3xl md:text-4xl font-display font-bold text-white">
            Everything You Need — Whether You Buy or Sell
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Loadify Market is the UK's trusted multi-category marketplace for physical goods and service‑based commerce, supporting both standard listings and RFQ‑driven transactions.
          </p>
        </div>

        {/* Two-column comparison */}
        <div className="grid lg:grid-cols-2 gap-5">
          {/* For Buyers */}
          <div className="rounded-3xl p-7 flex flex-col gap-5 bg-surface" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-admin/20"
              >
                <Search className="h-5 w-5 text-admin" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-admin">For Buyers</p>
                <h3 className="text-lg font-display font-bold text-white">Find What You're Looking For</h3>
              </div>
            </div>

            <ul className="space-y-3.5">
              {buyerBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${b.iconBgClass}`}
                  >
                    <b.icon className={`h-4 w-4 ${b.iconColorClass}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-white/75 mt-0.5 leading-snug">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-1">
              <Link to="/catalog">
                <Button className="w-full h-11 bg-gradient-to-r from-primary to-warning text-black font-semibold rounded-full hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all duration-300">
                  Browse Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* For Sellers */}
          <div className="rounded-3xl p-7 flex flex-col gap-5 bg-surface" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-primary/20"
              >
                <PackagePlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">For Sellers</p>
                <h3 className="text-lg font-display font-bold text-white">Sell Your Products</h3>
              </div>
            </div>

            <ul className="space-y-3.5">
              {sellerBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${b.iconBgClass}`}
                  >
                    <b.icon className={`h-4 w-4 ${b.iconColorClass}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-white/75 mt-0.5 leading-snug">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-1">
              <Link to="/signup">
                <Button className="w-full h-11 bg-gradient-to-r from-primary to-warning text-black font-semibold rounded-full hover:scale-[1.02] hover:shadow-[0_10px_30px_rgba(212,175,55,0.3)] transition-all duration-300">
                  Start Selling Today <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Trust stats bar */}
        <div className="mt-5 rounded-2xl py-4 px-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center bg-surface" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
          {[
            { value: "UK", label: "Marketplace" },
            { value: "Early", label: "Seller Launch" },
            { value: "9", label: "Categories" },
            { value: "24/7", label: "Access" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl sm:text-2xl font-extrabold text-white">{s.value}</p>
              <p className="text-xs text-white/75 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
