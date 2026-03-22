import { ShieldCheck, Users, Package, Star, Truck, BadgeCheck } from "lucide-react";

const stats = [
  {
    icon: Package,
    value: "500+",
    label: "Active Listings",
    color: "text-[#1A4DBE] bg-blue-50",
  },
  {
    icon: Users,
    value: "120+",
    label: "Verified Sellers",
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    icon: Star,
    value: "5.0",
    label: "Average Rating",
    color: "text-amber-600 bg-amber-50",
  },
  {
    icon: ShieldCheck,
    value: "100%",
    label: "Secure Payments",
    color: "text-violet-600 bg-violet-50",
  },
  {
    icon: Truck,
    value: "UK-Wide",
    label: "Delivery Support",
    color: "text-sky-600 bg-sky-50",
  },
  {
    icon: BadgeCheck,
    value: "16",
    label: "Categories",
    color: "text-rose-600 bg-rose-50",
  },
];

const PlatformFeatures = () => {
  return (
    <section className="py-14 bg-[#F4F7FB]">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1A4DBE]">
            Why Loadify Market
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[#1F2937]">
            A Platform Built for UK Trade
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Trusted by buyers and sellers across the UK for wholesale, clearance and returns stock.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow duration-300"
            >
              <div className={`w-11 h-11 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <p className="text-xl font-extrabold text-[#1F2937]">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformFeatures;
