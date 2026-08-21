import { Link } from "react-router-dom";
import { Tag, RefreshCw, TrendingUp, Clock, Package, XCircle, ShoppingBag, Store } from "lucide-react";

interface DrawerCTACardsProps {
  onClose: () => void;
}

const CTA_CARDS = [
  { icon: Tag, label: "Insights", route: "/catalog?filter=price-crunch" },
  { icon: RefreshCw, label: "Back in Stock", route: "/catalog?filter=back-in-stock" },
  { icon: TrendingUp, label: "Best Sellers", route: "/catalog?filter=best-sellers" },
  { icon: Clock, label: "Latest Products", route: "/catalog?filter=latest" },
  { icon: Package, label: "Add Products", route: "/catalog?filter=pallet-deals" },
  { icon: XCircle, label: "Inactive Products", route: "/catalog?filter=delisted" },
  { icon: ShoppingBag, label: "Multi Buy", route: "/catalog?filter=multi-buy" },
  { icon: Store, label: "Shop by Brand", route: "/catalog?filter=brand" },
] as const;

const DrawerCTACards = ({ onClose }: DrawerCTACardsProps) => (
  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
    {CTA_CARDS.map(({ icon: Icon, label, route }) => (
      <Link
        key={label}
        to={route}
        onClick={onClose}
        className="rounded-xl border border-white/10 bg-white/[0.055] p-3 flex flex-col items-start gap-1.5 h-[68px] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/[0.09] hover:border-[#F5A300]/40 active:scale-[0.97]"
      >
        <Icon className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
        <span className="text-xs font-semibold text-white/82 leading-tight">{label}</span>
      </Link>
    ))}
  </div>
);

export default DrawerCTACards;
