import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ShoppingBag, MessageCircle, HelpCircle, LogOut, Zap } from "lucide-react";
import type { User } from "@/types";

interface DrawerAccountBlockProps {
  user: User | null;
  dashboardPath: string;
  onLogout: () => void;
  onClose: () => void;
}

const DrawerAccountBlock = ({
  user,
  dashboardPath,
  onLogout,
  onClose,
}: DrawerAccountBlockProps) => {
  if (user) {
    const initial = user.firstName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U";
    const ordersPath = user.role === "seller" ? "/pp/seller/orders" : "/pp/buyer/orders";

    return (
      <div className="p-4 space-y-3">
        {/* User greeting */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">
            {initial}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">
              Hi, {user.firstName ?? "there"}
            </span>
            <span className="text-[11px] text-white/40 capitalize">{user.role ?? "buyer"}</span>
          </div>
        </div>

        {/* Account nav links */}
        <nav className="space-y-0.5" aria-label="Account navigation">
          <Link
            to={dashboardPath}
            onClick={onClose}
            className="flex items-center gap-3 px-2 h-10 rounded-lg text-sm font-medium text-white/80 hover:text-green-400 hover:bg-white/[0.07] transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            {user.role === "admin" ? "Admin Hub" : "My Account"}
          </Link>
          <Link
            to={ordersPath}
            onClick={onClose}
            className="flex items-center gap-3 px-2 h-10 rounded-lg text-sm font-medium text-white/80 hover:text-green-400 hover:bg-white/[0.07] transition-colors"
          >
            <ShoppingBag className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            Orders
          </Link>
          <Link
            to={user.role === "seller" ? "/pp/seller/rfq" : "/contact"}
            onClick={onClose}
            className="flex items-center gap-3 px-2 h-10 rounded-lg text-sm font-medium text-white/80 hover:text-green-400 hover:bg-white/[0.07] transition-colors"
          >
            <MessageCircle className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            {user.role === "seller" ? "RFQ / Messages" : "Messages"}
          </Link>
          <Link
            to="/contact"
            onClick={onClose}
            className="flex items-center gap-3 px-2 h-10 rounded-lg text-sm font-medium text-white/80 hover:text-green-400 hover:bg-white/[0.07] transition-colors"
          >
            <HelpCircle className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            Contact Support
          </Link>
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full flex items-center gap-3 px-2 h-10 rounded-lg text-sm font-medium text-white/80 hover:text-red-400 hover:bg-white/[0.07] transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            Sign Out
          </button>
        </nav>

        {/* Quick Order CTA */}
        {user.role !== "admin" && (
          <Button
            size="sm"
            className="w-full h-10 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black font-semibold rounded-full shadow-lg transition-all duration-300"
            asChild
          >
            <Link to="/catalog" onClick={onClose}>
              <Zap className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Quick Order
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-widest text-white/40 mb-1">Your Account</p>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-11 text-white/80 hover:text-green-400 hover:bg-white/10 font-medium"
          asChild
        >
          <Link to="/login" onClick={onClose}>
            Sign In
          </Link>
        </Button>
        <Button
          size="sm"
          className="flex-1 h-11 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black font-semibold rounded-full shadow-lg transition-all duration-300"
          asChild
        >
          <Link to="/signup?type=seller" onClick={onClose}>
            Start Selling
          </Link>
        </Button>
      </div>
      <Link
        to="/signup"
        onClick={onClose}
        className="block text-center text-xs text-white/40 hover:text-white/60 transition-colors py-1"
      >
        Register as a buyer →
      </Link>
    </div>
  );
};

export default DrawerAccountBlock;
