import { Link } from "react-router-dom";
import { Package, Truck, Wrench, Home } from "lucide-react";

/**
 * CategoryGrid — 4 static category tiles, 2-col mobile.
 * Products | Transport | Services | Home
 */

const CATEGORIES = [
  {
    label: "Products",
    Icon: Package,
    to: "/catalog",
  },
  {
    label: "Transport",
    Icon: Truck,
    to: "/catalog?category=Transport",
  },
  {
    label: "Services",
    Icon: Wrench,
    to: "/catalog?category=Services",
  },
  {
    label: "Home & Garden",
    Icon: Home,
    to: "/catalog?category=Home+%26+Garden",
  },
];

const CategoryGrid = () => (
  <section aria-labelledby="catgrid-heading" className="px-4 py-4" style={{ background: "#0B0F1A" }}>
    <h2
      id="catgrid-heading"
      className="text-[13px] font-black text-white uppercase tracking-widest mb-3"
    >
      Categories
    </h2>
    <div className="grid grid-cols-2 gap-3">
      {CATEGORIES.map(({ label, Icon, to }) => (
        <Link
          key={label}
          to={to}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl py-5 border border-white/[0.07] transition-all duration-200 hover:border-[#FBBF24]/30 hover:shadow-[0_0_14px_rgba(251,191,36,0.10)] active:scale-95"
          style={{ background: "#111827" }}
        >
          <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#FBBF24]/10">
            <Icon className="h-5 w-5 text-[#FBBF24]" aria-hidden="true" />
          </span>
          <span className="text-[13px] font-semibold text-white">{label}</span>
        </Link>
      ))}
    </div>
  </section>
);

export default CategoryGrid;
