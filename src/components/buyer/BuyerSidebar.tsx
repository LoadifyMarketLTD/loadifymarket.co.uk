import {
  LayoutDashboard, ShoppingBag, Heart, MapPin, CreditCard,
  Star, UserCircle, Settings, LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import logo from "@/assets/loadify-logo.png";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Orders", url: "/dashboard/orders", icon: ShoppingBag },
  { title: "Wishlist", url: "/dashboard/wishlist", icon: Heart },
  { title: "Addresses", url: "/dashboard/addresses", icon: MapPin },
  { title: "Payments", url: "/dashboard/payments", icon: CreditCard },
  { title: "My Reviews", url: "/dashboard/reviews", icon: Star },
];

const accountItems = [
  { title: "Profile", url: "/dashboard/profile", icon: UserCircle },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function BuyerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) =>
    path === "/dashboard" ? currentPath === "/dashboard" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Loadify" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="font-display text-base font-bold text-foreground">
              My <span className="text-primary">Account</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Shopping</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={collapsed ? item.title : undefined}
                  >
                    <NavLink
                      to={item.url}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
              JB
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Jane Buyer</p>
              <p className="text-xs text-muted-foreground truncate">jane@email.com</p>
            </div>
            <LogOut className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer hover:text-foreground transition-colors" />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold">
              JB
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
