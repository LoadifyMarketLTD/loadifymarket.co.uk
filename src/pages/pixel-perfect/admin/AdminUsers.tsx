import { useState, useEffect, useCallback } from "react";
import { Users, Search, ShieldCheck, Ban, MoreHorizontal, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  inactive: { label: "Suspended", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const roleConfig: Record<string, { label: string; className: string }> = {
  buyer: { label: "Buyer", className: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  seller: { label: "Seller", className: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  admin: { label: "Admin", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, role, isActive, createdAt")
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const mapped: User[] = (data || []).map((u) => ({
        id: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        email: u.email,
        role: u.role ?? "buyer",
        isActive: u.isActive !== false,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
          : "—",
      }));

      setUsers(mapped);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleBlock = async (userId: string, currentlyActive: boolean) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("users")
        .update({ isActive: !currentlyActive })
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentlyActive } : u));
      if (selected?.id === userId) setSelected((s) => s ? { ...s, isActive: !currentlyActive } : s);
      toast({ title: currentlyActive ? "User suspended" : "User reactivated" });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const byRole = (role: string) => filtered.filter((u) => u.role === role);
  const suspended = filtered.filter((u) => !u.isActive);

  const renderTable = (data: User[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>User</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Role</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Joined</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Status</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No users found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((u) => {
            const roleCfg = roleConfig[u.role] ?? { label: u.role, className: "border-white/10 text-slate-400" };
            const statusKey = u.isActive ? "active" : "inactive";
            return (
              <TableRow key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{u.name}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className={roleCfg.className}>{roleCfg.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{u.createdAt}</TableCell>
                <TableCell><Badge variant="outline" className={statusConfig[statusKey].className}>{statusConfig[statusKey].label}</Badge></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" disabled={actionLoading === u.id}>
                        {actionLoading === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelected(u)}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                      </DropdownMenuItem>
                      {u.isActive ? (
                        <DropdownMenuItem className="text-destructive" onClick={() => toggleBlock(u.id, u.isActive)}>
                          <Ban className="h-3.5 w-3.5 mr-2" /> Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => toggleBlock(u.id, u.isActive)}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Unsuspend User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "#0A0B1A", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Management</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>{users.length} registered users</p>
      </div>

      {error && (
        <div className="rounded-xl border p-4 text-sm" style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", count: users.length, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
          { label: "Buyers", count: users.filter((u) => u.role === "buyer").length, color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
          { label: "Sellers", count: users.filter((u) => u.role === "seller").length, color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
          { label: "Suspended", count: users.filter((u) => !u.isActive).length, color: "#F87171", bg: "rgba(248,113,113,0.12)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: stat.bg }}>
              <Users className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div className="text-3xl font-bold text-white">{stat.count}</div>
            <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">All <Badge variant="outline" className="ml-2 text-xs border-white/20 text-white/60">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="buyer" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Buyers</TabsTrigger>
          <TabsTrigger value="seller" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Sellers</TabsTrigger>
          <TabsTrigger value="admin" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Admins</TabsTrigger>
          <TabsTrigger value="suspended" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Suspended</TabsTrigger>
        </TabsList>
        {(["all", "buyer", "seller", "admin", "suspended"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <div className="px-2 py-2">
                {renderTable(
                  tab === "all" ? filtered :
                  tab === "suspended" ? suspended :
                  byRole(tab)
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>{selected.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Role</span><p className="font-medium text-white capitalize">{selected.role}</p></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Status</span><p className="font-medium text-white capitalize">{selected.isActive ? "Active" : "Suspended"}</p></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)" }}>Joined</span><p className="font-medium text-white">{selected.createdAt}</p></div>
              </div>
              <div className="flex justify-end">
                {selected.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => toggleBlock(selected.id, selected.isActive)}
                    disabled={actionLoading === selected.id}
                  >
                    {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
                    Suspend User
                  </Button>
                ) : (
                  <Button
                    onClick={() => toggleBlock(selected.id, selected.isActive)}
                    disabled={actionLoading === selected.id}
                  >
                    {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Unsuspend User
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminUsers;
