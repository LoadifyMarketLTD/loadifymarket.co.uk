import { Link } from "react-router-dom";
import { Tag, RefreshCw, TrendingUp, Clock, Package, XCircle, ShoppingBag, Store } from "lucide-react";

interface DrawerCTACardsProps {
  onClose: () => void;
}

const CTA_CARDS = [
  {
    icon: Tag,
    label: "Price Crunch",
    route: "/catalog?filter=price-crunch",
    iconClass: "text-[#D4AF37]",
  },
  {
    icon: RefreshCw,
    label: "Back in Stock",
    route: "/catalog?filter=back-in-stock",
    iconClass: "text-sky-400",
  },
  {
    icon: TrendingUp,
    label: "Best Sellers",
    route: "/catalog?filter=best-sellers",
    iconClass: "text-primary",
  },
  {
    icon: Clock,
    label: "Latest Products",
    route: "/catalog?filter=latest",
    iconClass: "text-violet-400",
  },
  {
    icon: Package,
    label: "Bulk Listings",
    route: "/catalog?filter=pallet-deals",
    iconClass: "text-orange-400",
  },
  {
    icon: XCircle,
    label: "Delisted",
    route: "/catalog?filter=delisted",
    iconClass: "text-red-400",
  },
  {
    icon: ShoppingBag,
    label: "Multi Buy",
    route: "/catalog?filter=multi-buy",
    iconClass: "text-pink-400",
  },
  {
    icon: Store,
    label: "Shop by Brand",
    route: "/catalog?filter=brand",
    iconClass: "text-teal-400",
  },
] as const;

const DrawerCTACards = ({ onClose }: DrawerCTACardsProps) => (
  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
    {CTA_CARDS.map(({ icon: Icon, label, route, iconClass }) => (
      <Link
        key={label}
        to={route}
        onClick={onClose}
        className="bg-[linear-gradient(145deg,#121A2B,#0A0E1A)] border border-white/5 rounded-xl p-3 flex flex-col items-start gap-1.5 h-[68px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(251,191,36,0.15)] hover:border-primary/40 active:scale-[0.97]"
      >
        <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
        <span className="text-xs font-semibold text-white/80 leading-tight">{label}</span>
      </Link>
    ))}
  </div>
);

export default DrawerCTACards;
