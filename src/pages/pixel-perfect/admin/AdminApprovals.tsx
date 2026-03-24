import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Eye, Building2, Mail, Calendar, Loader2, ExternalLink,
  ShieldOff, RefreshCw, Zap,
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
  active:    "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  submitted: "bg-amber-500/15 text-amber-700 border-amber-200",
  draft:     "bg-muted text-muted-foreground border-border",
  suspended: "bg-red-500/15 text-red-700 border-red-200",
};

const statusLabel: Record<string, string> = {
  active:    "Active",
  submitted: "Setup in progress",
  draft:     "Setup required",
  suspended: "Suspended",
};

const stripeStatusColor: Record<string, string> = {
  active:     "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  restricted: "bg-amber-500/15 text-amber-700 border-amber-200",
  pending:    "bg-muted text-muted-foreground border-border",
};

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
      const { data: sellerUsers, error: usersError } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, createdAt")
        .eq("role", "seller")
        .order("createdAt", { ascending: false });

      if (usersError) throw usersError;

      const { data: profiles, error: profilesError } = await supabase
        .from("seller_profiles")
        .select("userId, sellerStatus, stripeConnectStatus, storeName, businessName, fullName");

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((p) => [p.userId, p]));

      const combined: Seller[] = (sellerUsers || []).map((u) => {
        const p = profileMap.get(u.id);
        return {
          userId: u.id,
          name: p?.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
          email: u.email,
          company: p?.storeName || p?.businessName || "—",
          date: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "—",
          sellerStatus: (p?.sellerStatus ?? "draft") as Seller["sellerStatus"],
          stripeConnectStatus: p?.stripeConnectStatus ?? null,
        };
      });

      setSellers(combined);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load sellers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSellers(); }, [fetchSellers]);

  const handleSuspend = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .update({ sellerStatus: "suspended" })
        .eq("userId", userId);
      if (error) throw error;
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: "suspended" } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: "suspended" } : s);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to suspend seller");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      // Reactivation sets status back to 'submitted' (profile may be complete but
      // Stripe may not be active). tryAutoActivateSeller will re-evaluate and
      // promote to 'active' automatically if all conditions are met.
      const { error } = await supabase
        .from("seller_profiles")
        .update({ sellerStatus: "submitted" })
        .eq("userId", userId);
      if (error) throw error;
      setSellers((prev) => prev.map((s) =>
        s.userId === userId ? { ...s, sellerStatus: "submitted" } : s
      ));
      if (selectedSeller?.userId === userId) {
        setSelectedSeller((s) => s ? { ...s, sellerStatus: "submitted" } : s);
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to reactivate seller");
    } finally {
      setActionLoading(null);
    }
  };

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
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead className="hidden md:table-cell">Email</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden lg:table-cell">Stripe</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              No sellers found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => (
            <TableRow key={s.userId}>
              <TableCell>
                <p className="font-medium text-sm">{s.company}</p>
                <p className="text-xs text-muted-foreground">{s.name}</p>
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.email}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[s.sellerStatus]}>
                  {statusLabel[s.sellerStatus] ?? s.sellerStatus}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {s.stripeConnectStatus ? (
                  <Badge variant="outline" className={stripeStatusColor[s.stripeConnectStatus] ?? ""}>
                    {s.stripeConnectStatus}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSeller(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {s.sellerStatus !== "suspended" ? (
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
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
                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                      onClick={() => handleReactivate(s.userId)}
                      disabled={actionLoading === s.userId}
                      title="Reactivate seller"
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seller Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor seller accounts and manage suspensions. Sellers are activated automatically
          once their profile and Stripe setup are complete.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, business, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">
            <Zap className="h-3.5 w-3.5 mr-1" /> Active
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            Setup in Progress
            {inProgressCount > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{inProgressCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="active">
          <Card><CardContent className="pt-4">{renderTable(byStatus("active"))}</CardContent></Card>
        </TabsContent>
        <TabsContent value="in-progress">
          <Card>
            <CardContent className="pt-4">
              {renderTable(
                filtered.filter(
                  (s) => s.sellerStatus === "draft" || s.sellerStatus === "submitted"
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="suspended">
          <Card><CardContent className="pt-4">{renderTable(byStatus("suspended"))}</CardContent></Card>
        </TabsContent>
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
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="text-sm font-medium">{selectedSeller.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">{selectedSeller.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-medium">{selectedSeller.date}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Status:</span>
                  <Badge variant="outline" className={statusColor[selectedSeller.sellerStatus]}>
                    {statusLabel[selectedSeller.sellerStatus] ?? selectedSeller.sellerStatus}
                  </Badge>
                </div>
                {selectedSeller.stripeConnectStatus && (
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Stripe:</span>
                    <Badge variant="outline" className={stripeStatusColor[selectedSeller.stripeConnectStatus] ?? ""}>
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
              {selectedSeller.sellerStatus !== "suspended" ? (
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
              ) : (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleReactivate(selectedSeller.userId)}
                  disabled={actionLoading === selectedSeller.userId}
                >
                  {actionLoading === selectedSeller.userId
                    ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    : <RefreshCw className="h-4 w-4 mr-1" />}
                  Reactivate Seller
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

