import {
  LayoutDashboard, Users, ShieldCheck, Package, ShoppingCart,
  BarChart3, Settings, LogOut, Flag, MessageSquare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/loadify-logo.png";
import { useAuthStore } from "@/store";
import { supabase } from "@/lib/supabase";

import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Overview", url: "/admin", icon: LayoutDashboard },
  { title: "Seller Approvals", url: "/admin/approvals", icon: ShieldCheck },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Flagged Content", url: "/admin/flagged", icon: Flag },
  { title: "Support Tickets", url: "/admin/support", icon: MessageSquare },
];

const systemItems = [
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login", { replace: true });
  };

  const initials = user
    ? `${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}` || "A"
    : "A";
  const displayName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Admin"
    : "Admin";

  const isActive = (path: string) =>
    path === "/admin" ? currentPath === "/admin" : currentPath.startsWith(path);

  const sidebarBg = "#0F1023";
  const sidebarBorder = "rgba(255,255,255,0.07)";

  return (
    <Sidebar
      collapsible="icon"
      style={{ background: sidebarBg, borderRight: `1px solid ${sidebarBorder}` }}
      className="border-r-0"
    >
      <SidebarHeader className="px-4 py-5" style={{ borderBottom: `1px solid ${sidebarBorder}` }}>
        <div className="flex items-center gap-3">
          <img src={logo} alt="Loadify" className="h-8 w-8 shrink-0" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold text-white tracking-wide">Loadify</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: "#22C55E" }}>Admin Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel
              className="px-4 py-2 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Management
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {mainItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        end={item.url === "/admin"}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 group"
                        style={
                          active
                            ? {
                                background: "rgba(34,197,94,0.12)",
                                color: "#22C55E",
                                fontWeight: 600,
                              }
                            : {
                                color: "rgba(255,255,255,0.6)",
                              }
                        }
                        activeClassName=""
                      >
                        <item.icon
                          className="h-4 w-4 shrink-0 transition-colors"
                          style={active ? { color: "#22C55E" } : { color: "rgba(255,255,255,0.45)" }}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel
              className="px-4 py-2 text-[10px] font-semibold tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              System
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {systemItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={collapsed ? item.title : undefined}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150"
                        style={
                          active
                            ? {
                                background: "rgba(34,197,94,0.12)",
                                color: "#22C55E",
                                fontWeight: 600,
                              }
                            : {
                                color: "rgba(255,255,255,0.6)",
                              }
                        }
                        activeClassName=""
                      >
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          style={active ? { color: "#22C55E" } : { color: "rgba(255,255,255,0.45)" }}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter
        className="p-3"
        style={{ borderTop: `1px solid ${sidebarBorder}` }}
      >
        {!collapsed ? (
          <div
            className="flex items-center gap-3 rounded-xl p-3"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #22C55E 100%)", color: "#fff" }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-[11px] truncate" style={{ color: "#22C55E" }}>Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="rounded-md p-1.5 transition-colors hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button onClick={handleLogout} aria-label="Sign out" className="rounded-full">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #7C3AED 0%, #22C55E 100%)", color: "#fff" }}
              >
                {initials}
              </div>
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
