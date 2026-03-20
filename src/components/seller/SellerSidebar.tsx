import {
  LayoutDashboard, Package, ShoppingCart, Truck, RotateCcw,
  Star, FileText, UserCircle, Settings, LogOut, ChevronUp
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import logo from "@/assets/loadify-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/seller", icon: LayoutDashboard },
  { title: "Products", url: "/seller/products", icon: Package },
  { title: "Orders", url: "/seller/orders", icon: ShoppingCart },
  { title: "Shipments", url: "/seller/shipments", icon: Truck },
  { title: "Returns", url: "/seller/returns", icon: RotateCcw },
  { title: "Reviews", url: "/seller/reviews", icon: Star },
  { title: "RFQ / Quotes", url: "/seller/rfq", icon: FileText },
];

const accountItems = [
  { title: "Profile", url: "/seller/profile", icon: UserCircle },
  { title: "Settings", url: "/seller/settings", icon: Settings },
];

export function SellerSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) =>
    path === "/seller" ? currentPath === "/seller" : currentPath.startsWith(path);

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      {/* Header / Logo */}
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Loadify" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <span className="font-display text-base font-bold text-foreground">
              Seller <span className="text-primary">Hub</span>
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
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
                      end={item.url === "/seller"}
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

        {/* Account */}
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

      {/* Footer */}
      <SidebarFooter className="p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">John Doe</p>
              <p className="text-xs text-muted-foreground truncate">TechWholesale UK</p>
            </div>
            <LogOut className="h-4 w-4 text-muted-foreground shrink-0 cursor-pointer hover:text-foreground transition-colors" />
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center text-primary-foreground text-sm font-bold">
              JD
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
