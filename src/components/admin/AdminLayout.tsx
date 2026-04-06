import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";

const AdminLayout = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" style={{ background: "#0A0B1A" }}>
        <AdminSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header
            className="h-14 flex items-center justify-between px-5 shrink-0"
            style={{
              background: "rgba(15,16,35,0.95)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-slate-400 hover:text-white transition-colors" />
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell href="/admin/notifications" />
              <Button
                size="sm"
                className="text-xs hidden sm:inline-flex font-medium transition-all"
                style={{
                  background: "linear-gradient(135deg, #22C55E 0%, #16A34A 100%)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 0 12px rgba(34,197,94,0.25)",
                }}
                asChild
              >
                <a href="/" target="_blank" rel="noreferrer">View Storefront ↗</a>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto" style={{ background: "#0A0B1A" }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
