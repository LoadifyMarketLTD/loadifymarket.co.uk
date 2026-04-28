/**
 * BottomNav — fixed bottom navigation bar for mobile.
 * Home | Categories | Sell | Messages | Profile
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Grid2X2, PlusCircle, MessageSquare, User } from "lucide-react";

const NAV_ITEMS = [
  { to: "/",            label: "Home",       Icon: Home },
  { to: "/catalog",     label: "Categories", Icon: Grid2X2 },
  { to: "/seller/products/new", label: "Sell", Icon: PlusCircle, accent: true },
  { to: "/buyer/messages", label: "Messages", Icon: MessageSquare },
  { to: "/buyer",       label: "Profile",    Icon: User },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around h-16 border-t border-white/[0.08]"
      style={{
        background: "#0B0F1A",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Bottom navigation"
    >
      {NAV_ITEMS.map(({ to, label, Icon, accent }) => {
        const isActive = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-opacity duration-150"
          >
            {accent ? (
              <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#FBBF24] shadow-[0_0_14px_rgba(251,191,36,0.35)] -mt-5">
                <Icon className="h-5 w-5 text-[#0B0F1A]" aria-hidden="true" />
              </span>
            ) : (
              <Icon
                className={`h-5 w-5 ${isActive ? "text-[#FBBF24]" : "text-slate-400"}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`text-[10px] font-medium leading-none ${
                accent ? "text-[#FBBF24]" : isActive ? "text-[#FBBF24]" : "text-slate-400"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
