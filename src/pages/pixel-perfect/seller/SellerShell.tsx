import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, ShoppingBag, Truck,
  RotateCcw, Star, Settings, ChevronRight, Store,
  LogOut, Menu, Bell, MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { useUnreadNotificationsCount } from "@/hooks/useUnreadNotificationsCount";

type SellerNavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
};

const navGroups: Array<{ label: string; items: SellerNavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { to: "/seller", label: "Home", icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: "Sell",
    items: [
      { to: "/seller/products", label: "Listings", icon: Package },
    ],
  },
  {
    label: "Orders",
    items: [
      { to: "/seller/orders", label: "Orders", icon: ShoppingCart },
      { to: "/seller/shipments", label: "Shipping", icon: Truck },
      { to: "/seller/returns", label: "Returns & issues", icon: RotateCcw },
    ],
  },
  {
    label: "Customers",
    items: [
      { to: "/seller/messages", label: "Inbox", icon: MessageSquare },
      { to: "/seller/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Shop",
    items: [
      { to: "/seller/profile", label: "My Shop", icon: Store },
      { to: "/seller/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Essentials keeps the four highest-frequency destinations one tap away. */
const mobileTabItems: SellerNavItem[] = [
  { to: "/seller", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/seller/products", label: "Listings", icon: Package },
  { to: "/seller/orders", label: "Orders", icon: ShoppingCart },
  { to: "/seller/messages", label: "Inbox", icon: MessageSquare },
];

interface SidebarContentProps {
  displayName: string;
  onNavClick: () => void;
  onLogout: () => void;
}

const SidebarContent = ({ displayName, onNavClick, onLogout }: SidebarContentProps) => (
  <div className="flex flex-col h-full">
    <div className="p-5 border-b border-border">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover flex items-center justify-center shrink-0">
          <Store className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground leading-none">Seller Workspace</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary">Essentials</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[160px]">{displayName}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-0.5">Simple tools to run your shop</p>
        </div>
      </div>
    </div>

    <nav className="flex-1 overflow-y-auto py-3 px-2">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-3 last:mb-0">
          <p className="px-3 pb-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group ${
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
          </div>
        </div>
      ))}
    </nav>

    <div className="p-3 border-t border-border space-y-1">
      <NavLink
        to="/buyer"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <ShoppingBag className="h-4 w-4 shrink-0" />
        <span>Buyer Space</span>
      </NavLink>

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

const SellerShell = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const unreadNotifications = useUnreadNotificationsCount(user?.id);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login", { replace: true });
  };

  const displayName =
    user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`
      : user?.email ?? "Seller";

  const headerHeight = "calc(var(--shell-offset-h, 0px) + env(safe-area-inset-top, 0px))";

  return (
    <div className="market-workspace-light flex bg-[#F7F9FC] overflow-hidden" style={{ height: `calc(100dvh - ${headerHeight})`, marginTop: headerHeight }}>
      <aside className="hidden lg:flex w-60 border-r border-border bg-card shrink-0 flex-col">
        <SidebarContent displayName={displayName} onNavClick={() => setSidebarOpen(false)} onLogout={handleLogout} />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border flex flex-col">
            <SidebarContent displayName={displayName} onNavClick={() => setSidebarOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center px-2 pt-header-safe pb-2 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 flex flex-col items-center justify-center">
            <span className="font-bold text-foreground text-[15px] leading-tight">Seller Workspace</span>
            <span className="text-[10px] text-primary font-semibold leading-tight">Essentials</span>
            <span className="text-[10px] text-muted-foreground leading-tight truncate max-w-[160px]">{displayName}</span>
          </div>
          <NavLink to="/seller/notifications" aria-label="Notifications" className="h-10 w-10 shrink-0 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <span className="relative inline-flex">
              <Bell className="h-5 w-5" />
              {unreadNotifications > 0 && (
                <span className="absolute -right-1.5 -top-1.5 min-w-[1rem] rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
                  {unreadNotifications > 99 ? "99+" : unreadNotifications}
                </span>
              )}
            </span>
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0 bg-background">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Seller navigation"
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

export default SellerShell;
