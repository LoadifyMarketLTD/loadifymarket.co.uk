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
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0A234F]/15 bg-[#0A234F]/[0.06] text-sm font-bold !text-[#0A234F]">
            {initial}
          </div>
          <span className="text-sm font-semibold !text-[#0A234F]">
            Hi, {user.firstName ?? "there"}
          </span>
        </div>

        <div className="space-y-0.5">
          <Link to={dashboardPath} onClick={onClose} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium !text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:!text-[#0A234F]">
            <LayoutDashboard className="h-4 w-4 shrink-0 !text-[#8A7351]" aria-hidden="true" />
            {user.role === "admin" ? "Admin Hub" : "My Account"}
          </Link>
          <Link to={ordersHref} onClick={onClose} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium !text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:!text-[#0A234F]">
            <ShoppingBag className="h-4 w-4 shrink-0 !text-[#8A7351]" aria-hidden="true" />
            Orders
          </Link>
          <Link to="/inbox" onClick={onClose} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium !text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:!text-[#0A234F]">
            <MessageSquare className="h-4 w-4 shrink-0 !text-[#8A7351]" aria-hidden="true" />
            Messages
          </Link>
          <Link to="/contact" onClick={onClose} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium !text-[#5A6578] transition-colors hover:bg-[#0A234F]/[0.035] hover:!text-[#0A234F]">
            <LifeBuoy className="h-4 w-4 shrink-0 !text-[#8A7351]" aria-hidden="true" />
            Support
          </Link>
        </div>

        <div className="flex gap-2 pt-1">
          {user.role !== "admin" && user.role !== "seller" && (
            <Button size="sm" className="h-10 flex-1 rounded-lg !bg-[#0A234F] font-semibold !text-white shadow-none hover:!bg-[#071A3C]" asChild>
              <Link to="/register?type=seller" onClick={onClose}>Start Selling</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 rounded-lg border-[#0A234F]/15 !bg-white font-semibold !text-[#5A6578] hover:!bg-[#0A234F]/[0.035] hover:!text-[#0A234F]"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" />
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
          variant="outline"
          size="sm"
          className="h-11 flex-1 rounded-lg border-[#0A234F]/15 !bg-white font-semibold !text-[#0A234F] hover:!bg-[#0A234F]/[0.035] hover:!text-[#0A234F]"
          asChild
        >
          <Link to="/login" onClick={onClose}>Sign In</Link>
        </Button>
        <Button size="sm" className="h-11 flex-1 rounded-lg !bg-[#0A234F] font-semibold !text-white shadow-none hover:!bg-[#071A3C]" asChild>
          <Link to="/register?type=seller" onClick={onClose}>Start Selling</Link>
        </Button>
      </div>
    </div>
  );
};

export default DrawerAccountBlock;
