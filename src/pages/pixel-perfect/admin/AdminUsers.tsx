import { useState, useEffect, useCallback } from "react";
import { Users, Search, ShieldCheck, Ban, MoreHorizontal, Eye, Loader2, ExternalLink, Package, ShoppingBag, Flag, CreditCard, UserCog, Lock } from "lucide-react";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface UserDetail extends User {
  /** ISO timestamp for display */
  createdAtRaw: string;
  phone?: string | null;
  // Seller-specific
  sellerStatus?: string | null;
  stripeConnectStatus?: string | null;
  stripeAccountId?: string | null;
  storeName?: string | null;
  businessName?: string | null;
  sellerRating?: number | null;
  totalSales?: number | null;
  // Counts
  listingsCount: number;
  ordersCount: number;
  reportsCount: number;
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

const stripeStatusConfig: Record<string, { label: string; className: string }> = {
  active:     { label: "Active",      className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  pending:    { label: "Pending",     className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  restricted: { label: "Restricted",  className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const sellerStatusConfig: Record<string, { label: string; className: string }> = {
  active:    { label: "Active",      className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  submitted: { label: "Submitted",   className: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  draft:     { label: "Draft",       className: "border-slate-500/30 text-slate-400 bg-slate-500/10" },
  suspended: { label: "Suspended",   className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const AdminUsers = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, role, isActive, createdAt, phone")
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
      toast({ title: "Failed to load users", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  /** When a user row is selected, load the full expanded detail view. */
  const openDetail = useCallback(async (u: User) => {
    setSelected(u);
    setDetail(null);
    setDetailLoading(true);

    try {
      // Fetch full user row for phone
      const { data: fullUser } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, role, isActive, createdAt, phone")
        .eq("id", u.id)
        .single<{ id: string; email: string; firstName?: string; lastName?: string; role: string; isActive: boolean; createdAt: string; phone?: string }>();

      const createdAtRaw = fullUser?.createdAt
        ? new Date(fullUser.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

      // Parallel: seller profile, listings count, orders count, reports count
      const [sellerRes, listingsRes, buyerOrdersRes, sellerOrdersRes, reportsRes] = await Promise.all([
        // Seller profile (only matters for sellers)
        supabase
          .from("seller_profiles")
          .select("sellerStatus, stripeConnectStatus, stripeAccountId, storeName, businessName, rating, totalSales")
          .eq("userId", u.id)
          .maybeSingle<{
            sellerStatus: string;
            stripeConnectStatus: string | null;
            stripeAccountId: string | null;
            storeName: string | null;
            businessName: string | null;
            rating: number;
            totalSales: number;
          }>(),
        // Listings (as seller)
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("sellerId", u.id),
        // Orders as buyer
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("buyerId", u.id),
        // Orders as seller
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("sellerId", u.id),
        // Reports submitted by this user
        supabase
          .from("reported_listings")
          .select("id", { count: "exact", head: true })
          .eq("reportedBy", u.id),
      ]);

      const sp = sellerRes.data;
      const listingsCount = listingsRes.count ?? 0;
      const ordersCount = (buyerOrdersRes.count ?? 0) + (sellerOrdersRes.count ?? 0);
      const reportsCount = reportsRes.count ?? 0;

      setDetail({
        ...u,
        createdAtRaw,
        phone: fullUser?.phone ?? null,
        sellerStatus: sp?.sellerStatus ?? null,
        stripeConnectStatus: sp?.stripeConnectStatus ?? null,
        stripeAccountId: sp?.stripeAccountId ?? null,
        storeName: sp?.storeName ?? null,
        businessName: sp?.businessName ?? null,
        sellerRating: sp?.rating ?? null,
        totalSales: sp?.totalSales ?? null,
        listingsCount,
        ordersCount,
        reportsCount,
      });
    } catch (err) {
      toast({ title: "Failed to load user details", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const toggleBlock = async (userId: string, currentlyActive: boolean, targetRole: string) => {
    // Admin accounts are protected — they can never be suspended through the UI.
    if (targetRole === 'admin') {
      toast({ title: "Protected account", description: "Admin accounts cannot be suspended.", variant: "destructive" });
      return;
    }
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
      if (detail?.id === userId) setDetail((d) => d ? { ...d, isActive: !currentlyActive } : d);
      toast({ title: currentlyActive ? "User suspended" : "User reactivated" });
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to update user");
      toast({ title: "Failed to update user", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const changeRole = async (userId: string, newRole: string, currentRole: string) => {
    // Admin role is protected — it cannot be changed through the admin UI.
    // To demote an admin, update the DB directly.
    if (currentRole === 'admin') {
      toast({ title: "Protected account", description: "Admin role cannot be changed through the admin UI.", variant: "destructive" });
      return;
    }
    setRoleChanging(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      if (selected?.id === userId) setSelected((s) => s ? { ...s, role: newRole } : s);
      if (detail?.id === userId) setDetail((d) => d ? { ...d, role: newRole } : d);
      toast({ title: "Role updated", description: `User role changed to ${newRole}.` });
    } catch (err: unknown) {
      toast({ title: "Failed to change role", description: (err as Error).message, variant: "destructive" });
    } finally {
      setRoleChanging(false);
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
                      <DropdownMenuItem onClick={() => openDetail(u)}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                      </DropdownMenuItem>
                      {u.role === 'admin' ? (
                        <DropdownMenuItem disabled>
                          <Lock className="h-3.5 w-3.5 mr-2" /> Protected Account
                        </DropdownMenuItem>
                      ) : u.isActive ? (
                        <DropdownMenuItem className="text-destructive" onClick={() => toggleBlock(u.id, u.isActive, u.role)}>
                          <Ban className="h-3.5 w-3.5 mr-2" /> Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => toggleBlock(u.id, u.isActive, u.role)}>
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
              <div className="px-2 py-2 overflow-x-auto">
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

      {/* ── Expanded User Detail Dialog ─────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setDetail(null); } }}>
        {selected && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                {selected.name}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">{selected.email}</DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : detail ? (
              <div className="space-y-6 pt-2">
                {/* ── Core identity ─────────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account Details</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <DetailRow label="User ID">
                      <span className="font-mono text-xs break-all">{detail.id}</span>
                    </DetailRow>
                    <DetailRow label="Status">
                      <Badge variant="outline" className={statusConfig[detail.isActive ? "active" : "inactive"].className}>
                        {detail.isActive ? "Active" : "Suspended"}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Role">
                      <Badge variant="outline" className={(roleConfig[detail.role] ?? roleConfig.buyer).className}>
                        {(roleConfig[detail.role] ?? { label: detail.role }).label}
                      </Badge>
                    </DetailRow>
                    <DetailRow label="Joined">{detail.createdAtRaw}</DetailRow>
                    {detail.phone && <DetailRow label="Phone">{detail.phone}</DetailRow>}
                  </div>
                </section>

                {/* ── Activity counts ───────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={<Package className="h-4 w-4" />} label="Listings" value={detail.listingsCount} color="#A78BFA" />
                    <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={detail.ordersCount} color="#60A5FA" />
                    <StatCard icon={<Flag className="h-4 w-4" />} label="Reports Filed" value={detail.reportsCount} color="#F87171" />
                  </div>
                </section>

                {/* ── Seller profile (only shown for sellers) ───────────────── */}
                {(detail.role === "seller" || detail.sellerStatus) && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Seller Profile</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {(detail.storeName || detail.businessName) && (
                        <DetailRow label="Store / Business">
                          {detail.storeName || detail.businessName}
                        </DetailRow>
                      )}
                      {detail.sellerStatus && (
                        <DetailRow label="Seller Status">
                          <Badge variant="outline" className={(sellerStatusConfig[detail.sellerStatus] ?? sellerStatusConfig.draft).className}>
                            {(sellerStatusConfig[detail.sellerStatus] ?? { label: detail.sellerStatus }).label}
                          </Badge>
                        </DetailRow>
                      )}
                      <DetailRow label="Stripe Account">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {detail.stripeAccountId ? (
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={(stripeStatusConfig[detail.stripeConnectStatus ?? ""] ?? stripeStatusConfig.pending).className}>
                                {(stripeStatusConfig[detail.stripeConnectStatus ?? ""] ?? { label: detail.stripeConnectStatus ?? "Unknown" }).label}
                              </Badge>
                              <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">{detail.stripeAccountId}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Not connected</span>
                          )}
                        </div>
                      </DetailRow>
                      {detail.sellerRating !== null && detail.sellerRating !== undefined && (
                        <DetailRow label="Rating">{Number(detail.sellerRating).toFixed(2)} ★</DetailRow>
                      )}
                      {detail.totalSales !== null && detail.totalSales !== undefined && (
                        <DetailRow label="Total Sales">{detail.totalSales}</DetailRow>
                      )}
                    </div>
                  </section>
                )}

                {/* ── Admin actions ─────────────────────────────────────────── */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Admin Actions</h3>
                  {detail.role === 'admin' ? (
                    /* Admin accounts are fully protected — no destructive actions */
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg border border-red-500/20 bg-red-500/5">
                      <Lock className="h-4 w-4 text-red-500 shrink-0" />
                      <span>Admin accounts are protected. No actions can be performed through this UI.</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {/* Suspend / Reactivate */}
                      {detail.isActive ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => toggleBlock(detail.id, detail.isActive, detail.role)}
                          disabled={actionLoading === detail.id}
                        >
                          {actionLoading === detail.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
                          Suspend User
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => toggleBlock(detail.id, detail.isActive, detail.role)}
                          disabled={actionLoading === detail.id}
                        >
                          {actionLoading === detail.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                          Reactivate User
                        </Button>
                      )}

                      {/* Change Role — only for non-owner accounts; owner cannot be assigned via this UI */}
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Select
                          value={detail.role}
                          onValueChange={(val) => changeRole(detail.id, val, detail.role)}
                          disabled={roleChanging || detail.role === 'admin'}
                        >
                          <SelectTrigger className="h-9 w-36 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="buyer">Buyer</SelectItem>
                            <SelectItem value="seller">Seller</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        {roleChanging && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>

                      {/* Admin seller detail page link (if seller) */}
                      {detail.role === "seller" && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/admin/sellers/${detail.id}`} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Full Seller Record
                          </a>
                        </Button>
                      )}
                    </div>
                  )}
                </section>
              </div>
            ) : null}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

/** Small helper: label + value row for the detail grid */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

/** Small stat card for activity counts */
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20`, color }}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default AdminUsers;

