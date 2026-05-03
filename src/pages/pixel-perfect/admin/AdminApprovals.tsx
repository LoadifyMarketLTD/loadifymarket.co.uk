import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Eye, Building2, Mail, Calendar, Loader2, Phone, Package, ShoppingBag, Flag,
  ShieldOff, RefreshCw, Zap, CheckCircle, AlertTriangle, AlertCircle, Send, CreditCard, MapPin,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { toast } from "@/hooks/use-toast";

interface Seller {
  userId: string;
  name: string;
  email: string;
  company: string;
  date: string;
  sellerStatus: "draft" | "submitted" | "active" | "suspended";
  stripeConnectStatus: string | null;
}

/** Extended seller detail loaded from the Netlify function on dialog open. */
interface SellerDetail extends Seller {
  phone: string | null;
  role: string;
  isActive: boolean;
  stripeAccountId: string | null;
  storeName: string | null;
  businessName: string | null;
  businessAddress: Record<string, string> | null;
  contactPhone: string | null;
  sellerRating: number | null;
  totalSales: number | null;
  listingsCount: number;
  ordersCount: number;
  reportsCount: number;
  createdAtFormatted: string;
}

const statusColor: Record<string, string> = {
  active:    "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  submitted: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  draft:     "border-slate-200 text-slate-400",
  suspended: "border-red-500/30 text-red-400 bg-red-500/10",
};

const statusLabel: Record<string, string> = {
  active:    "Verified",
  submitted: "Pending Verification",
  draft:     "Setup Required",
  suspended: "Restricted",
};

const stripeStatusColor: Record<string, string> = {
  active:     "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  restricted: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  pending:    "border-amber-500/30 text-amber-400 bg-amber-500/10",
};

const stripeStatusLabel: Record<string, string> = {
  active:     "Verified",
  restricted: "Pending",
  pending:    "Pending",
  "":         "Not Connected",
};

function stripeLabel(status: string | null): string {
  return status ? (stripeStatusLabel[status] ?? status) : "Not Connected";
}

function stripeClass(status: string | null): string {
  if (!status) return "border-slate-200 text-slate-400";
  return stripeStatusColor[status] ?? "border-slate-200 text-slate-400";
}

async function handleJson<T>(res: Response): Promise<T> {
  let payload: unknown = null;
  let parseError = false;
  try {
    payload = await res.json();
  } catch {
    parseError = true;
  }
  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload &&
        typeof (payload as { error: unknown }).error === "string")
        ? (payload as { error: string }).error
        : `Request failed (${res.status})`;
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (parseError || payload === null) {
    const err = new Error(`Empty or non-JSON response from server (${res.status})`) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return payload as T;
}

/** Returns false for auth errors (401/403) where retrying the same request won't help. */
function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status;
    if (status === 401 || status === 403) return false;
  }
  return true;
}

const AdminSellerManagement = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [sellerDetail, setSellerDetail] = useState<SellerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const setApiError = (err: unknown, fallback: string) => {
    setError(err instanceof Error ? err.message : fallback);
    setErrorRetryable(isRetryableError(err));
  };

  const fetchSellers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorRetryable(true);
    try {
      console.log('Calling admin-sellers API');
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "GET",
      });
      const json = await handleJson<{ sellers: Seller[] }>(res);
      setSellers(Array.isArray(json.sellers) ? json.sellers : []);
    } catch (err: unknown) {
      setApiError(err, "Failed to load sellers");
      setSellers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  /** Open the detail dialog and load extended seller data from the server. */
  const openSellerDetail = useCallback(async (s: Seller) => {
    setSelectedSeller(s);
    setSellerDetail(null);
    setDetailLoading(true);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op: "get_seller_detail", userId: s.userId }),
      });
      const json = await handleJson<{ detail: {
        phone: string | null;
        role: string;
        isActive: boolean;
        createdAt: string | null;
        stripeAccountId: string | null;
        storeName: string | null;
        businessName: string | null;
        businessAddress: Record<string, string> | null;
        contactPhone: string | null;
        sellerRating: number | null;
        totalSales: number | null;
        listingsCount: number;
        ordersCount: number;
        reportsCount: number;
      } }>(res);
      const d = json.detail;
      setSellerDetail({
        ...s,
        phone: d.phone,
        role: d.role,
        isActive: d.isActive,
        stripeAccountId: d.stripeAccountId,
        storeName: d.storeName,
        businessName: d.businessName,
        businessAddress: d.businessAddress ?? null,
        contactPhone: d.contactPhone ?? null,
        sellerRating: d.sellerRating,
        totalSales: d.totalSales,
        listingsCount: d.listingsCount,
        ordersCount: d.ordersCount,
        reportsCount: d.reportsCount,
        createdAtFormatted: d.createdAt
          ? new Date(d.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "—",
      });
    } catch (err: unknown) {
      // Non-fatal — show basic info from the table row
      toast({
        title: "Could not load full profile",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

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
        setSellerDetail((d) => d ? { ...d, sellerStatus: nextStatus } : d);
      }
      toast({ title: op === "suspend" ? "Seller suspended" : "Seller reactivated" });
    } catch (err: unknown) {
      const msg = (err as Error).message ||
        (op === "suspend" ? "Failed to suspend seller" : "Failed to reactivate seller");
      setApiError(err, op === "suspend" ? "Failed to suspend seller" : "Failed to reactivate seller");
      toast({ title: op === "suspend" ? "Suspend failed" : "Reactivate failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = (userId: string) => changeStatus(userId, "suspend");
  const handleReactivate = (userId: string) => changeStatus(userId, "reactivate");

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op: "approve", userId }),
      });
      await handleJson<{ success: boolean }>(res);
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: "active" } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: "active" } : s);
        setSellerDetail((d) => d ? { ...d, sellerStatus: "active" } : d);
      }
      toast({ title: "Seller approved ✅", description: "Seller status set to Verified." });
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to approve seller";
      setApiError(err, "Failed to approve seller");
      toast({ title: "Approval failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op: "reject", userId }),
      });
      await handleJson<{ success: boolean }>(res);
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: "suspended" } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: "suspended" } : s);
        setSellerDetail((d) => d ? { ...d, sellerStatus: "suspended" } : d);
      }
      toast({ title: "Seller rejected", description: "Seller application has been rejected." });
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to reject seller";
      setApiError(err, "Failed to reject seller");
      toast({ title: "Rejection failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendWarning = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op: "warn", userId }),
      });
      await handleJson<{ success: boolean }>(res);
      toast({ title: "Warning sent", description: "A warning email has been sent to the seller." });
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to send warning";
      setApiError(err, "Failed to send warning");
      toast({ title: "Send warning failed", description: msg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendOnboardingReminders = async () => {
    setOnboardingLoading(true);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op: "onboarding_reminder" }),
      });
      const json = await handleJson<{ sent: number }>(res);
      if (json.sent === 0) {
        toast({ title: "No reminders needed", description: "No sellers need an onboarding reminder right now." });
      } else {
        toast({ title: "Reminders sent", description: `Onboarding reminder sent to ${json.sent} seller${json.sent === 1 ? "" : "s"}.` });
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to send reminders";
      setApiError(err, "Failed to send reminders");
      toast({ title: "Reminders failed", description: msg, variant: "destructive" });
    } finally {
      setOnboardingLoading(false);
    }
  };

  // Force-activates a seller via the Netlify function (service-role key bypasses RLS entirely).
  // The DB trigger sync_seller_approval_from_status sets activatedAt / isApproved automatically.
  const handleForceActivate = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/admin-sellers", {
        method: "POST",
        body: JSON.stringify({ op: "force_activate", userId }),
      });
      await handleJson<{ success: boolean }>(res);
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: "active" } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: "active" } : s);
        setSellerDetail((d) => d ? { ...d, sellerStatus: "active" } : d);
      }
      toast({ title: "Seller activated", description: "Seller status set to Active." });
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to activate seller";
      setApiError(err, "Failed to activate seller");
      toast({ title: "Activation failed", description: msg, variant: "destructive" });
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
        <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Business</TableHead>
          <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Email</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Joined</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Status</TableHead>
          <TableHead className="hidden lg:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Stripe</TableHead>
          <TableHead className="text-right text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(148,163,184,0.85)" }}>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" style={{ color: "rgba(100,116,139,0.65)" }} />
            </TableCell>
          </TableRow>
        ) : error ? (
          <TableRow>
            <TableCell colSpan={6} className="py-8">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                {errorRetryable && (
                  <Button size="sm" variant="outline" onClick={fetchSellers}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8" style={{ color: "rgba(100,116,139,0.65)" }}>
              No sellers found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => (
            <TableRow
              key={s.userId}
              className="cursor-pointer hover:bg-white/5 transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
              onClick={() => openSellerDetail(s)}
            >
              <TableCell>
                <p className="font-medium text-sm text-white">{s.company}</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{s.name}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{s.email}</TableCell>
              <TableCell className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{s.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[s.sellerStatus]}>
                  {statusLabel[s.sellerStatus] ?? s.sellerStatus}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="outline" className={stripeClass(s.stripeConnectStatus)}>
                  {stripeLabel(s.stripeConnectStatus)}
                </Badge>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10" onClick={() => openSellerDetail(s)} title="View full profile">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {/* Send Warning */}
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-amber-400 hover:bg-amber-500/10"
                    onClick={() => handleSendWarning(s.userId)}
                    disabled={actionLoading === s.userId}
                    title="Send warning email"
                  >
                    {actionLoading === s.userId
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <AlertCircle className="h-4 w-4" />}
                  </Button>
                  {/* Approve: shown for submitted/draft sellers who are not yet active */}
                  {(s.sellerStatus === "submitted" || s.sellerStatus === "draft") && (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => handleApprove(s.userId)}
                      disabled={actionLoading === s.userId}
                      title="Approve seller"
                    >
                      {actionLoading === s.userId
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle className="h-4 w-4" />}
                    </Button>
                  )}
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
    <div className="p-4 sm:p-6 space-y-6" style={{ background: "transparent", minHeight: "100%" }}>
      <div className="pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Seller Management</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>
              Monitor seller accounts and manage suspensions. Sellers are activated automatically
              once their profile and Stripe setup are complete.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSendOnboardingReminders}
            disabled={onboardingLoading}
            className="shrink-0"
            title="Send Stripe onboarding reminder to sellers who registered 48h+ ago without connecting Stripe"
          >
            {onboardingLoading
              ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              : <Send className="h-3.5 w-3.5 mr-1.5" />}
            Send Onboarding Reminder
          </Button>
        </div>
      </div>

      {error && !loading && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive flex items-center justify-between gap-3">
          <span>{error}</span>
          {errorRetryable && (
            <Button size="sm" variant="outline" onClick={fetchSellers}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "rgba(100,116,139,0.65)" }} />
          <Input
            placeholder="Search by name, business, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">All</TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            <Zap className="h-3.5 w-3.5 mr-1" /> Active
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">
            Pending Verification
            {inProgressCount > 0 && (
              <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{inProgressCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suspended" className="data-[state=active]:text-white data-[state=active]:bg-white/10 text-slate-500">Restricted</TabsTrigger>
        </TabsList>

        {(["all", "active", "in-progress", "suspended"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(145deg, #0B1220, #0F172A)", border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}>
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

      {/* Full Profile Dialog */}
      <Dialog
        open={!!selectedSeller}
        onOpenChange={(open) => {
          if (!open) { setSelectedSeller(null); setSellerDetail(null); }
        }}
      >
        {selectedSeller && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-purple-100 text-purple-700">
                  {selectedSeller.name.split(" ").filter((n) => n).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "S"}
                </div>
                {selectedSeller.company || selectedSeller.name}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">{selectedSeller.email}</DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6 pt-2">
                {/* Account Details */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account Details</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                      <p className="font-medium">{sellerDetail?.name ?? selectedSeller.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="font-medium text-xs break-all">{selectedSeller.email}</p>
                      </div>
                    </div>
                    {sellerDetail?.phone && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="font-medium">{sellerDetail.phone}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Joined</p>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <p className="font-medium">{sellerDetail?.createdAtFormatted ?? selectedSeller.date}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Account Status</p>
                      <Badge variant="outline" className={sellerDetail?.isActive !== false ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"}>
                        {sellerDetail?.isActive !== false ? "Active" : "Suspended"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Role</p>
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10">
                        Seller
                      </Badge>
                    </div>
                  </div>
                </section>

                {/* Activity */}
                {sellerDetail && (
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Activity</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-100 text-purple-600">
                          <Package className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold text-white mt-1">{sellerDetail.listingsCount}</div>
                        <p className="text-xs text-muted-foreground">Listings</p>
                      </div>
                      <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                          <ShoppingBag className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold text-white mt-1">{sellerDetail.ordersCount}</div>
                        <p className="text-xs text-muted-foreground">Orders</p>
                      </div>
                      <div className="rounded-xl p-4 flex flex-col gap-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-100 text-red-600">
                          <Flag className="h-3.5 w-3.5" />
                        </div>
                        <div className="text-xl font-bold text-white mt-1">{sellerDetail.reportsCount}</div>
                        <p className="text-xs text-muted-foreground">Reports</p>
                      </div>
                    </div>
                  </section>
                )}

                {/* Seller Profile */}
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Seller Profile</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {(sellerDetail?.storeName || sellerDetail?.businessName || selectedSeller.company) && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Store / Business</p>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="font-medium">{sellerDetail?.storeName || sellerDetail?.businessName || selectedSeller.company}</p>
                        </div>
                      </div>
                    )}
                    {/* UK Business Address */}
                    {sellerDetail?.businessAddress && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Business Address</p>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            {sellerDetail.businessAddress.address && <p className="font-medium text-sm">{sellerDetail.businessAddress.address}</p>}
                            {sellerDetail.businessAddress.city && <p className="text-muted-foreground text-xs">{sellerDetail.businessAddress.city}</p>}
                            {sellerDetail.businessAddress.postcode && <p className="font-mono text-xs text-white">{sellerDetail.businessAddress.postcode}</p>}
                          </div>
                        </div>
                      </div>
                    )}
                    {sellerDetail?.contactPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Contact Phone</p>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <p className="font-medium">{sellerDetail.contactPhone}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Seller Status</p>
                      <Badge variant="outline" className={statusColor[selectedSeller.sellerStatus]}>
                        {statusLabel[selectedSeller.sellerStatus] ?? selectedSeller.sellerStatus}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Stripe Account</p>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        {sellerDetail?.stripeAccountId ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={stripeClass(selectedSeller.stripeConnectStatus)}>
                              {stripeLabel(selectedSeller.stripeConnectStatus)}
                            </Badge>
                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">
                              {sellerDetail.stripeAccountId}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className={stripeClass(selectedSeller.stripeConnectStatus)}>
                            {stripeLabel(selectedSeller.stripeConnectStatus)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {sellerDetail?.sellerRating != null && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Rating</p>
                        <p className="font-medium">{Number(sellerDetail.sellerRating).toFixed(2)} ★</p>
                      </div>
                    )}
                    {sellerDetail?.totalSales != null && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Total Sales</p>
                        <p className="font-medium">{sellerDetail.totalSales}</p>
                      </div>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Admin Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    {/* Approve — available for non-active sellers */}
                    {selectedSeller.sellerStatus !== "active" && selectedSeller.sellerStatus !== "suspended" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprove(selectedSeller.userId)}
                        disabled={actionLoading === selectedSeller.userId}
                      >
                        {actionLoading === selectedSeller.userId
                          ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          : <CheckCircle className="h-4 w-4 mr-1.5" />}
                        Approve Seller
                      </Button>
                    )}
                    {/* Reject — available for pending/draft sellers */}
                    {(selectedSeller.sellerStatus === "submitted" || selectedSeller.sellerStatus === "draft") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleReject(selectedSeller.userId)}
                        disabled={actionLoading === selectedSeller.userId}
                      >
                        {actionLoading === selectedSeller.userId
                          ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          : <ShieldOff className="h-4 w-4 mr-1.5" />}
                        Reject Application
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSendWarning(selectedSeller.userId)}
                      disabled={actionLoading === selectedSeller.userId}
                    >
                      {actionLoading === selectedSeller.userId
                        ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        : <AlertCircle className="h-4 w-4 mr-1.5" />}
                      Send Warning
                    </Button>
                    {selectedSeller.sellerStatus !== "active" && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleForceActivate(selectedSeller.userId)}
                        disabled={actionLoading === selectedSeller.userId}
                        title="Force-activate this seller immediately (bypasses Stripe check)"
                      >
                        {actionLoading === selectedSeller.userId
                          ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          : <Zap className="h-4 w-4 mr-1.5" />}
                        Force Activate
                      </Button>
                    )}
                    {selectedSeller.sellerStatus !== "suspended" ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleSuspend(selectedSeller.userId)}
                        disabled={actionLoading === selectedSeller.userId}
                      >
                        {actionLoading === selectedSeller.userId
                          ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          : <ShieldOff className="h-4 w-4 mr-1.5" />}
                        Restrict Seller
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReactivate(selectedSeller.userId)}
                        disabled={actionLoading === selectedSeller.userId}
                      >
                        {actionLoading === selectedSeller.userId
                          ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          : <RefreshCw className="h-4 w-4 mr-1.5" />}
                        Lift Restriction
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => { setSelectedSeller(null); setSellerDetail(null); }}
                    >
                      Close
                    </Button>
                  </div>
                </section>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminSellerManagement;
