import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, ShoppingBag, Heart, MapPin, CreditCard,
  Star, Settings, UserCircle, ChevronRight, LogOut, Menu, Bell, MessageSquare, ShieldAlert, Store,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { hasSellerAccess } from "@/lib/roleUtils";

const navItems = [
  { to: "/buyer", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/buyer/orders", label: "My Orders", icon: ShoppingBag },
  { to: "/buyer/wishlist", label: "Wishlist", icon: Heart },
  { to: "/buyer/disputes", label: "Disputes", icon: ShieldAlert },
  { to: "/buyer/addresses", label: "Addresses", icon: MapPin },
  { to: "/buyer/payments", label: "Payments", icon: CreditCard },
  { to: "/buyer/reviews", label: "Reviews", icon: Star },
  { to: "/buyer/notifications", label: "Notifications", icon: Bell },
  { to: "/buyer/messages", label: "Messages", icon: MessageSquare },
  { to: "/buyer/profile", label: "Profile", icon: UserCircle },
  { to: "/buyer/settings", label: "Settings", icon: Settings },
];

/** The 4 most important buyer pages shown in the mobile bottom tab bar */
const mobileTabItems = [
  { to: "/buyer", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/buyer/orders", label: "Orders", icon: ShoppingBag },
  { to: "/buyer/wishlist", label: "Wishlist", icon: Heart },
  { to: "/buyer/settings", label: "Settings", icon: Settings },
];

interface SidebarContentProps {
  displayName: string;
  sellerCapable: boolean;
  onNavClick: () => void;
  onLogout: () => void;
}

const SidebarContent = ({ displayName, sellerCapable, onNavClick, onLogout }: SidebarContentProps) => (
  <div className="flex flex-col h-full">
    <div className="p-5 border-b border-border">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover flex items-center justify-center shrink-0">
          <ShoppingBag className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-none">Buyer Hub</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]">{displayName}</p>
        </div>
      </div>
    </div>
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
    <div className="p-3 border-t border-border space-y-1">
      {sellerCapable && (
        <NavLink
          to="/seller"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Store className="h-4 w-4 shrink-0" />
          <span>Seller Workspace</span>
        </NavLink>
      )}

      <NavLink
        to="/"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <LayoutDashboard className="h-4 w-4 shrink-0" />
        <span>Marketplace</span>
      </NavLink>
      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <span>Sign Out</span>
      </button>
    </div>
  </div>
);

const BuyerShell = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sellerCapable = hasSellerAccess(user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
      : user?.email ?? "Buyer";

  // On mobile the global Header is hidden (see Header.tsx) so the shell
  // starts at the top with only safe-area-inset-top clearance.
  // On desktop the shell must sit below the full global header (--shell-offset-h = 7.625rem).
  const headerHeight = "calc(var(--shell-offset-h, 0px) + env(safe-area-inset-top, 0px))";

  return (
    <div className="flex bg-transparent overflow-hidden" style={{ height: `calc(100dvh - ${headerHeight})`, marginTop: headerHeight }}>
      <aside className="hidden lg:flex w-56 border-r border-border bg-card shrink-0 flex-col">
        <SidebarContent displayName={displayName} sellerCapable={sellerCapable} onNavClick={() => setSidebarOpen(false)} onLogout={handleLogout} />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
            <SidebarContent displayName={displayName} sellerCapable={sellerCapable} onNavClick={() => setSidebarOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 pt-header-safe pb-3 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold text-foreground text-sm">Buyer Hub</span>
        </header>
        {/* Page content — add bottom padding on mobile so content isn't hidden behind tab bar */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 bg-background">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Buyer navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {mobileTabItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium text-muted-foreground"
          onClick={() => setSidebarOpen(true)}
          aria-label="More navigation options"
        >
          <Menu className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};

export default BuyerShell;
