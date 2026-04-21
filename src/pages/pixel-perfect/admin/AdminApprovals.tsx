import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Eye, Building2, Mail, Calendar, Loader2, ExternalLink,
  ShieldOff, RefreshCw, Zap, CheckCircle, AlertTriangle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";

interface Seller {
  userId: string;
  name: string;
  email: string;
  company: string;
  date: string;
  sellerStatus: "draft" | "submitted" | "active" | "suspended";
  stripeConnectStatus: string | null;
}

const statusColor: Record<string, string> = {
  active:    "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  submitted: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  draft:     "border-white/10 text-slate-400",
  suspended: "border-red-500/30 text-red-400 bg-red-500/10",
};

const statusLabel: Record<string, string> = {
  active:    "Active",
  submitted: "Setup in Progress",
  draft:     "Setup required",
  suspended: "Suspended",
};

const stripeStatusColor: Record<string, string> = {
  active:     "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  restricted: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  pending:    "border-white/10 text-slate-400",
};

async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(path, { ...init, headers });
}

async function handleJson<T>(res: Response): Promise<T> {
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // fall through — will be handled below
  }
  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload &&
        typeof (payload as { error: unknown }).error === "string")
        ? (payload as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return payload as T;
}

const AdminSellerManagement = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "GET",
      });
      const json = await handleJson<{ sellers: Seller[] }>(res);
      setSellers(Array.isArray(json.sellers) ? json.sellers : []);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load sellers");
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const changeStatus = async (
    userId: string,
    op: "suspend" | "reactivate",
  ) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op, userId }),
      });
      const json = await handleJson<{ sellerStatus: Seller["sellerStatus"] }>(res);
      const nextStatus = json.sellerStatus;
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: nextStatus } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: nextStatus } : s);
      }
    } catch (err: unknown) {
      setError(
        (err as Error).message ||
          (op === "suspend" ? "Failed to suspend seller" : "Failed to reactivate seller"),
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = (userId: string) => changeStatus(userId, "suspend");
  const handleReactivate = (userId: string) => changeStatus(userId, "reactivate");

  // Force-activates a seller whose Stripe is confirmed active but sellerStatus
  // is still stuck at 'submitted' or 'draft'. The DB trigger
  // sync_seller_approval_from_status automatically sets activatedAt and
  // isApproved when sellerStatus transitions to 'active'.
  const handleForceActivate = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .update({ sellerStatus: "active" })
        .eq("userId", userId);
      if (error) throw error;
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: "active" } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: "active" } : s);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to activate seller");
    } finally {
      setActionLoading(null);
    }
  };

  /** True when the seller's Stripe is confirmed active but their account is stuck before activation. */
  const canForceActivate = (s: Pick<Seller, "stripeConnectStatus" | "sellerStatus">) =>
    s.stripeConnectStatus === "active" && s.sellerStatus !== "active" && s.sellerStatus !== "suspended";

  const filtered = sellers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (tab: string) =>
    tab === "all"
      ? filtered
      : filtered.filter((s) => s.sellerStatus === tab);

  const inProgressCount = filtered.filter(
    (s) => s.sellerStatus === "draft" || s.sellerStatus === "submitted"
  ).length;

  const renderTable = (data: Seller[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Business</TableHead>
          <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Email</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Joined</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Status</TableHead>
          <TableHead className="hidden lg:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Stripe</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(255,255,255,0.3)" }} />
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button size="sm" variant="outline" onClick={fetchSellers}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8" style={{ color: "rgba(255,255,255,0.3)" }}>
              No sellers found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => (
            <TableRow key={s.userId} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <TableCell>
                <p className="font-medium text-sm text-white">{s.company}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{s.name}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{s.email}</TableCell>
              <TableCell className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{s.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[s.sellerStatus]}>
                  {statusLabel[s.sellerStatus] ?? s.sellerStatus}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {s.stripeConnectStatus ? (
                  <Badge variant="outline" className={stripeStatusColor[s.stripeConnectStatus] ?? "border-white/10 text-slate-400"}>
                    {s.stripeConnectStatus}
                  </Badge>
                ) : (
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setSelectedSeller(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* Force-activate: shown when Stripe is active but seller is stuck in draft/submitted */}
                  {canForceActivate(s) && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => handleForceActivate(s.userId)}
                      disabled={actionLoading === s.userId}
                      title="Force activate (Stripe is ready)"
                    >
                      {actionLoading === s.userId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle className="h-4 w-4" />}
                    </Button>
                  )}
                  {s.sellerStatus !== "suspended" ? (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleSuspend(s.userId)}
                      disabled={actionLoading === s.userId}
                      title="Suspend seller"
                    >
                      {actionLoading === s.userId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <ShieldOff className="h-4 w-4" />}
                    </Button>
                  ) : (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => handleReactivate(s.userId)}
                      disabled={actionLoading === s.userId}
                      title="Lift suspension (returns to submitted)"
                    >
                      {actionLoading === s.userId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "#0A0B1A", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">Seller Management</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Monitor seller accounts and manage suspensions. Sellers are activated automatically
          once their profile and Stripe setup are complete.
        </p>
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchSellers}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <Input
            placeholder="Search by name, business, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">All</TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">
            <Zap className="h-3.5 w-3.5 mr-1" /> Active
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">
            Setup in Progress
            {inProgressCount > 0 && (
              <Badge variant="outline" className="ml-2 text-xs border-white/20 text-white/60">{inProgressCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suspended" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-white/50">Suspended</TabsTrigger>
        </TabsList>

        {(["all", "active", "in-progress", "suspended"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
              <div className="px-2 py-2 overflow-x-auto">
                {renderTable(
                  tab === "all" ? filtered :
                  tab === "in-progress" ? filtered.filter((s) => s.sellerStatus === "draft" || s.sellerStatus === "submitted") :
                  byStatus(tab)
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={() => setSelectedSeller(null)}>
        {selectedSeller && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedSeller.company}</DialogTitle>
              <DialogDescription>Seller account details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Contact</p>
                    <p className="text-sm font-medium text-white">{selectedSeller.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Email</p>
                    <p className="text-sm font-medium text-white">{selectedSeller.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <div>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Joined</p>
                    <p className="text-sm font-medium text-white">{selectedSeller.date}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-xs mr-2" style={{ color: "rgba(255,255,255,0.4)" }}>Status:</span>
                  <Badge variant="outline" className={statusColor[selectedSeller.sellerStatus]}>
                    {statusLabel[selectedSeller.sellerStatus] ?? selectedSeller.sellerStatus}
                  </Badge>
                </div>
                {selectedSeller.stripeConnectStatus && (
                  <div>
                    <span className="text-xs mr-2" style={{ color: "rgba(255,255,255,0.4)" }}>Stripe:</span>
                    <Badge variant="outline" className={stripeStatusColor[selectedSeller.stripeConnectStatus] ?? "border-white/10 text-slate-400"}>
                      {selectedSeller.stripeConnectStatus}
                    </Badge>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setSelectedSeller(null); navigate(`/admin/sellers/${selectedSeller.userId}`); }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Full Profile
              </Button>
            </div>

            <DialogFooter className="gap-2">
              {/* Force-activate when Stripe is confirmed ready but status is stuck */}
              {canForceActivate(selectedSeller) && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleForceActivate(selectedSeller.userId)}
                  disabled={actionLoading === selectedSeller.userId}
                >
                  {actionLoading === selectedSeller.userId
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : <CheckCircle className="h-4 w-4 mr-1" />}
                  Activate Seller
                </Button>
              )}
              {selectedSeller.sellerStatus !== "suspended" ? (
                <>
                  {selectedSeller.sellerStatus !== "active" && (
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleForceActivate(selectedSeller.userId)}
                      disabled={actionLoading === selectedSeller.userId}
                      title="Bypass auto-activation checks and activate this seller immediately"
                    >
                      {actionLoading === selectedSeller.userId
                        ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        : <Zap className="h-4 w-4 mr-1" />}
                      Force Activate
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => handleSuspend(selectedSeller.userId)}
                    disabled={actionLoading === selectedSeller.userId}
                  >
                    {actionLoading === selectedSeller.userId
                      ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      : <ShieldOff className="h-4 w-4 mr-1" />}
                    Suspend Seller
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleReactivate(selectedSeller.userId)}
                  disabled={actionLoading === selectedSeller.userId}
                >
                  {actionLoading === selectedSeller.userId
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : <RefreshCw className="h-4 w-4 mr-1" />}
                  Lift Suspension
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminSellerManagement;
