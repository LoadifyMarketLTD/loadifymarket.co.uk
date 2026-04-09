import { Link } from "react-router-dom";
import { Store, Sparkles, Star, Clock } from "lucide-react";

interface DrawerCTACardsProps {
  onClose: () => void;
}

const CTA_CARDS = [
  {
    icon: Store,
    label: "Browse Sellers",
    route: "/catalog",
    iconClass: "text-green-400",
  },
  {
    icon: Sparkles,
    label: "New Listings",
    route: "/catalog?sort=newest",
    iconClass: "text-violet-400",
  },
  {
    icon: Star,
    label: "Best Rated",
    route: "/catalog?sort=rating",
    iconClass: "text-amber-400",
  },
  {
    icon: Clock,
    label: "Just Listed",
    route: "/catalog?sort=newest",
    iconClass: "text-sky-400",
  },
] as const;

const DrawerCTACards = ({ onClose }: DrawerCTACardsProps) => (
  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
    {CTA_CARDS.map(({ icon: Icon, label, route, iconClass }) => (
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
