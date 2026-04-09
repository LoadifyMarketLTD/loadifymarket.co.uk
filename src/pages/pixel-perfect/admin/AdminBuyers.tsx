import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, ShieldCheck, Ban, MoreHorizontal, Eye,
  Loader2, Package, ShoppingBag, Flag, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface Buyer {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

interface BuyerDetail extends Buyer {
  createdAtRaw: string;
  phone?: string | null;
  ordersCount: number;
  reportsCount: number;
  wishlistCount: number;
}

const statusConfig = {
  active:   { label: "Active",    className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
  inactive: { label: "Suspended", className: "border-red-500/30 text-red-400 bg-red-500/10" },
};

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    <div className="text-sm font-medium text-foreground">{children}</div>
  </div>
);

const StatCard = ({
  icon, label, value, color,
}: { icon: React.ReactNode; label: string; value: number; color: string }) => (
  <div
    className="rounded-xl p-4 flex flex-col gap-1"
    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
  >
    <div className="flex items-center gap-2 mb-1" style={{ color }}>
      {icon}
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
  </div>
);

const AdminBuyers = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Buyer | null>(null);
  const [detail, setDetail] = useState<BuyerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchBuyers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, isActive, createdAt")
        .eq("role", "buyer")
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const mapped: Buyer[] = (data || []).map((u) => ({
        id: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        email: u.email,
        isActive: u.isActive !== false,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
          : "—",
      }));

      setBuyers(mapped);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to load buyers";
      setError(msg);
      toast({ title: "Failed to load buyers", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBuyers(); }, [fetchBuyers]);

  const openDetail = useCallback(async (u: Buyer) => {
    setSelected(u);
    setDetail(null);
    setDetailLoading(true);
    try {
      const { data: fullUser } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, isActive, createdAt, phone")
        .eq("id", u.id)
        .single<{ id: string; email: string; firstName?: string; lastName?: string; isActive: boolean; createdAt: string; phone?: string }>();

      const createdAtRaw = fullUser?.createdAt
        ? new Date(fullUser.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        : "—";

      const [ordersRes, reportsRes, wishlistRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyerId", u.id),
        supabase.from("reported_listings").select("id", { count: "exact", head: true }).eq("reportedBy", u.id),
        supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("userId", u.id),
      ]);

      setDetail({
        ...u,
        createdAtRaw,
        phone: fullUser?.phone ?? null,
        ordersCount: ordersRes.count ?? 0,
        reportsCount: reportsRes.count ?? 0,
        wishlistCount: wishlistRes.count ?? 0,
      });
    } catch (err) {
      toast({ title: "Failed to load buyer details", description: (err as Error).message, variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const toggleBlock = async (userId: string, currentlyActive: boolean) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("users")
        .update({ isActive: !currentlyActive })
        .eq("id", userId);
      if (error) throw error;
      setBuyers((prev) => prev.map((b) => b.id === userId ? { ...b, isActive: !currentlyActive } : b));
      if (selected?.id === userId) setSelected((s) => s ? { ...s, isActive: !currentlyActive } : s);
      if (detail?.id === userId) setDetail((d) => d ? { ...d, isActive: !currentlyActive } : d);
      toast({ title: currentlyActive ? "Buyer suspended" : "Buyer reactivated" });
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to update buyer";
      setError(msg);
      toast({ title: "Failed to update buyer", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = buyers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.email.toLowerCase().includes(search.toLowerCase())
  );

  const suspended = filtered.filter((b) => !b.isActive);
  const active = filtered.filter((b) => b.isActive);

  return (
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "#0A0B1A", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Buyer Management</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          {buyers.length} registered buyer{buyers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{ border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Buyers", count: buyers.length, color: "#60A5FA", bg: "rgba(96,165,250,0.12)" },
          { label: "Active",       count: active.length, color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
          { label: "Suspended",   count: suspended.length, color: "#F87171", bg: "rgba(248,113,113,0.12)" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: stat.bg }}
            >
              <Users className="h-5 w-5" style={{ color: stat.color }} />
            </div>
            <div className="text-3xl font-bold text-white">{loading ? "—" : stat.count}</div>
            <p className="text-xs mt-1.5 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
        <Input
          placeholder="Search buyers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
        />
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}
      >
        <div className="px-2 py-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Buyer</TableHead>
                <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Joined</TableHead>
                <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Status</TableHead>
                <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No buyers found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => {
                  const statusKey = b.isActive ? "active" : "inactive";
                  return (
                    <TableRow key={b.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}
                          >
                            {b.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{b.name}</p>
                            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{b.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{b.createdAt}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusConfig[statusKey].className}>
                          {statusConfig[statusKey].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
                              disabled={actionLoading === b.id}
                            >
                              {actionLoading === b.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(b)}>
                              <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                            </DropdownMenuItem>
                            {b.isActive ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => toggleBlock(b.id, b.isActive)}
                              >
                                <Ban className="h-3.5 w-3.5 mr-2" /> Suspend Buyer
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => toggleBlock(b.id, b.isActive)}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Unsuspend Buyer
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
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) { setSelected(null); setDetail(null); }
        }}
      >
        {selected && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "rgba(96,165,250,0.15)", color: "#60A5FA" }}
                >
                  {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
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
                    <DetailRow label="Joined">{detail.createdAtRaw}</DetailRow>
                    {detail.phone && <DetailRow label="Phone">{detail.phone}</DetailRow>}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={<ShoppingBag className="h-4 w-4" />} label="Orders" value={detail.ordersCount} color="#60A5FA" />
                    <StatCard icon={<Package className="h-4 w-4" />} label="Wishlist" value={detail.wishlistCount} color="#A78BFA" />
                    <StatCard icon={<Flag className="h-4 w-4" />} label="Reports Filed" value={detail.reportsCount} color="#F87171" />
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Admin Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    {detail.isActive ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => toggleBlock(detail.id, detail.isActive)}
                        disabled={actionLoading === detail.id}
                      >
                        {actionLoading === detail.id
                          ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          : <Ban className="h-4 w-4 mr-1" />}
                        Suspend Buyer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => toggleBlock(detail.id, detail.isActive)}
                        disabled={actionLoading === detail.id}
                      >
                        {actionLoading === detail.id
                          ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          : <Lock className="h-4 w-4 mr-1" />}
                        Unsuspend Buyer
                      </Button>
                    )}
                  </div>
                </section>
              </div>
            ) : null}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminBuyers;
