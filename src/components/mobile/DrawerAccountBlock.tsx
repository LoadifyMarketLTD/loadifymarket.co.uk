import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingBag, MessageSquare, LifeBuoy, LayoutDashboard, LogOut } from "lucide-react";
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
    const ordersHref =
      user.role === "seller" ? "/seller/orders" :
      user.role === "admin"  ? "/admin/orders"  :
      "/buyer/orders";

    return (
      <div className="p-4 space-y-3">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {initial}
          </div>
          <span className="text-sm font-semibold text-white">
            Hi, {user.firstName ?? "there"}
          </span>
        </div>

        {/* Primary links */}
        <div className="space-y-0.5">
          <Link
            to={dashboardPath}
            onClick={onClose}
            className="flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium text-white/80 hover:text-primary hover:bg-white/[0.07] transition-colors"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            {user.role === "admin" ? "Admin Hub" : "My Account"}
          </Link>
          <Link
            to={ordersHref}
            onClick={onClose}
            className="flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium text-white/80 hover:text-primary hover:bg-white/[0.07] transition-colors"
          >
            <ShoppingBag className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            Orders
          </Link>
          <Link
            to="/inbox"
            onClick={onClose}
            className="flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium text-white/80 hover:text-primary hover:bg-white/[0.07] transition-colors"
          >
            <MessageSquare className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            Messages
          </Link>
          <Link
            to="/contact"
            onClick={onClose}
            className="flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium text-white/80 hover:text-primary hover:bg-white/[0.07] transition-colors"
          >
            <LifeBuoy className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
            Support
          </Link>
        </div>

        {/* Action row */}
        <div className="flex gap-2 pt-1">
          {user.role !== "admin" && user.role !== "seller" && (
            <Button
              size="sm"
              className="flex-1 h-10 bg-primary hover:bg-primary-hover text-black font-semibold rounded-full shadow-lg transition-all duration-300"
              asChild
            >
              <Link to="/seller" onClick={onClose}>
                Start Selling
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-10 border-danger/30 text-danger hover:bg-danger/100/10 hover:text-red-300 bg-transparent font-semibold rounded-full"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-11 text-white/80 hover:text-primary hover:bg-white/10 font-medium"
          asChild
        >
          <Link to="/login" onClick={onClose}>
            Sign In
          </Link>
        </Button>
        <Button
          size="sm"
          className="flex-1 h-11 bg-primary hover:bg-primary-hover text-black font-semibold rounded-full shadow-lg transition-all duration-300"
          asChild
        >
          <Link to="/signup?type=seller" onClick={onClose}>
            Start Selling
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DrawerAccountBlock;
