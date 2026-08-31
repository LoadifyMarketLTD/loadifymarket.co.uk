import { Link } from "react-router-dom";
import { Tag, RefreshCw, TrendingUp, Clock, Package, XCircle, ShoppingBag, Store } from "lucide-react";

interface DrawerCTACardsProps {
  onClose: () => void;
}

const CTA_CARDS = [
  { icon: Tag, label: "Price Deals", route: "/catalog?filter=price-crunch" },
  { icon: RefreshCw, label: "Back in Stock", route: "/catalog?filter=back-in-stock" },
  { icon: TrendingUp, label: "Best Sellers", route: "/catalog?filter=best-sellers" },
  { icon: Clock, label: "Latest Products", route: "/catalog?filter=latest" },
  { icon: Package, label: "Pallet Deals", route: "/catalog?filter=pallet-deals" },
  { icon: XCircle, label: "Seller Products", route: "/seller/products" },
  { icon: ShoppingBag, label: "Multi Buy", route: "/catalog?filter=multi-buy" },
  { icon: Store, label: "Browse All", route: "/catalog" },
] as const;

const DrawerCTACards = ({ onClose }: DrawerCTACardsProps) => (
  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
    {CTA_CARDS.map(({ icon: Icon, label, route }) => (
      <Link
        key={label}
        to={route}
        onClick={onClose}
        className="flex h-[68px] flex-col items-start gap-1.5 rounded-lg border border-[#0A234F]/10 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8A7351]/35 hover:bg-[#0A234F]/[0.025] active:scale-[0.98]"
      >
        <Icon className="h-5 w-5 text-[#8A7351]" aria-hidden="true" />
        <span className="text-xs font-semibold leading-tight text-[#0A234F]">{label}</span>
      </Link>
    ))}
  </div>
);

export default DrawerCTACards;
