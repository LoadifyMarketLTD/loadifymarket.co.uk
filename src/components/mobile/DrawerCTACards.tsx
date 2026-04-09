import { Link } from "react-router-dom";
import { QUICK_ACTIONS } from "@/data/category-tree";

interface DrawerCTACardsProps {
  onClose: () => void;
}

const DrawerCTACards = ({ onClose }: DrawerCTACardsProps) => (
  <div className="px-4 pb-4 grid grid-cols-2 gap-2">
    {QUICK_ACTIONS.map(({ label, href }) => (
      <Link
        key={label}
        to={href}
        onClick={onClose}
        className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2.5 flex items-center h-11 hover:bg-white/10 hover:border-green-400/30 transition-all active:scale-[0.97]"
      >
        <span className="text-[13px] font-semibold text-white/85 leading-tight">{label}</span>
      </Link>
    ))}
  </div>
);

export default DrawerCTACards;
