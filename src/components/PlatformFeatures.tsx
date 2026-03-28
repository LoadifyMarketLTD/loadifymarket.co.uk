import { Link } from "react-router-dom";
import { ArrowRight, Search, ShieldCheck, CreditCard, HeadphonesIcon, PackagePlus, TrendingUp, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

const buyerBenefits = [
  {
    icon: Search,
    color: "text-[#2563EB] bg-blue-50",
    title: "Browse 500+ Listings",
    desc: "Find products across all categories from registered UK sellers — retail, wholesale, clearance, handmade and more.",
  },
  {
    icon: ShieldCheck,
    color: "text-emerald-600 bg-emerald-50",
    title: "Active Seller Accounts",
    desc: "Sellers complete their profile and Stripe setup before listing on the marketplace.",
  },
  {
    icon: CreditCard,
    color: "text-violet-600 bg-violet-50",
    title: "Secure Stripe Checkout",
    desc: "Pay safely via Stripe with full transaction transparency.",
  },
  {
    icon: HeadphonesIcon,
    color: "text-sky-600 bg-sky-50",
    title: "Buyer Support",
    desc: "Dedicated support team to help resolve disputes and answer questions quickly.",
  },
];

const sellerBenefits = [
  {
    icon: PackagePlus,
    color: "text-[#2563EB] bg-blue-50",
    title: "List for Free",
    desc: "Create your seller account and list your first products at zero cost — no setup fees.",
  },
  {
    icon: Users,
    color: "text-emerald-600 bg-emerald-50",
    title: "Reach Real UK Buyers",
    desc: "Access a growing base of registered buyers actively searching for products across all categories.",
  },
  {
    icon: Banknote,
    color: "text-amber-600 bg-amber-50",
    title: "Fast Stripe Payouts",
    desc: "Payments processed securely via Stripe. 7% commission on completed sales with fast payouts.",
  },
  {
    icon: TrendingUp,
    color: "text-rose-600 bg-rose-50",
    title: "Seller Dashboard",
    desc: "Manage listings, track orders, view analytics and grow your sales — all from one dashboard.",
  },
];

const PlatformFeatures = () => {
  return (
    <section className="py-16 bg-[#F5F7FB]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            Built for UK Buyers &amp; Sellers
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Everything You Need — Whether You Buy or Sell
          </h2>
          <p className="mt-2 text-sm text-[#64748B]">
            Loadify Market is the UK's trusted multi-category marketplace for physical goods.
          </p>
        </div>

        {/* Two-column comparison */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* For Buyers */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Search className="h-5 w-5 text-[#2563EB]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">For Buyers</p>
                <h3 className="text-lg font-display font-bold text-[#0F172A]">Find What You're Looking For</h3>
              </div>
            </div>

            <ul className="space-y-4">
              {buyerBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${b.color}`}>
                    <b.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{b.title}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 leading-snug">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-2">
              <Link to="/catalog">
                <Button
                  className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold rounded-xl"
                >
                  Browse Marketplace <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* For Sellers */}
          <div className="bg-[#0F172A] rounded-3xl p-8 shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <PackagePlus className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">For Sellers</p>
                <h3 className="text-lg font-display font-bold text-white">Sell Your Products</h3>
              </div>
            </div>

            <ul className="space-y-4">
              {sellerBenefits.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <b.icon className="h-4 w-4 text-white/80" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{b.title}</p>
                    <p className="text-xs text-white/60 mt-0.5 leading-snug">{b.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-2">
              <Link to="/signup">
                <Button
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl"
                >
                  Start Selling Today <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Trust stats bar */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm py-5 px-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { value: "500+", label: "Active Listings" },
            { value: "120+", label: "Registered Sellers" },
            { value: "9", label: "Categories" },
            { value: "UK-Wide", label: "Delivery Support" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">{s.value}</p>
              <p className="text-xs text-[#64748B] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
