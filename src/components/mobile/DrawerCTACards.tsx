import { Link } from "react-router-dom";
import { BadgePercent, RotateCcw, Trophy, Sparkles, Package, Archive, ShoppingBag, Store } from "lucide-react";

interface DrawerCTACardsProps {
  onClose: () => void;
}

const QUICK_ACTIONS = [
  {
    icon: BadgePercent,
    label: "Price Crunch",
    route: "/catalog?type=price-crunch",
    iconClass: "text-red-400",
  },
  {
    icon: RotateCcw,
    label: "Back in Stock",
    route: "/catalog?type=back-in-stock",
    iconClass: "text-sky-400",
  },
  {
    icon: Trophy,
    label: "Best Sellers",
    route: "/catalog?sort=bestsellers",
    iconClass: "text-amber-400",
  },
  {
    icon: Sparkles,
    label: "Latest Products",
    route: "/catalog?sort=newest",
    iconClass: "text-violet-400",
  },
  {
    icon: Package,
    label: "Pallet Deals",
    route: "/catalog?type=pallet-deals",
    iconClass: "text-orange-400",
  },
  {
    icon: Archive,
    label: "Delisted",
    route: "/catalog?type=delisted",
    iconClass: "text-slate-400",
  },
  {
    icon: ShoppingBag,
    label: "Multi Buy",
    route: "/catalog?type=multi-buy",
    iconClass: "text-green-400",
  },
  {
    icon: Store,
    label: "Shop by Brand",
    route: "/catalog?view=brands",
    iconClass: "text-pink-400",
  },
] as const;

const DrawerCTACards = ({ onClose }: DrawerCTACardsProps) => (
  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
    {QUICK_ACTIONS.map(({ icon: Icon, label, route, iconClass }) => (
      <Link
        key={label}
        to={route}
        onClick={onClose}
        className="bg-white/[0.06] border border-white/10 rounded-xl p-3 flex flex-col items-start gap-1.5 h-[68px] hover:bg-white/10 hover:border-green-400/30 transition-all active:scale-[0.97]"
      >
        <Icon className={`h-5 w-5 ${iconClass}`} aria-hidden="true" />
        <span className="text-xs font-semibold text-white/80 leading-tight">{label}</span>
      </Link>
    ))}
  </div>
);

export default DrawerCTACards;
