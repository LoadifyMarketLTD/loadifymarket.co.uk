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
  Search, CheckCircle2, XCircle, Eye, Building2, Mail, Calendar, Loader2, ExternalLink,
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
  status: "pending" | "verified" | "rejected" | "suspended";
  isApproved: boolean;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  verified: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
  suspended: "bg-red-500/15 text-red-700 border-red-200",
};

const AdminApprovals = () => {
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
        .select("userId, isApproved, verificationStatus, storeName, businessName, fullName");

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((p) => [p.userId, p]));

      const combined: Seller[] = (sellerUsers || []).map((u) => {
        const p = profileMap.get(u.id);
        const company = p?.storeName || p?.businessName || "—";
        const name = p?.fullName || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email;
        const status: Seller["status"] = p?.verificationStatus ?? (p?.isApproved ? "verified" : "pending");
        return {
          userId: u.id,
          name,
          email: u.email,
          company,
          date: u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : "—",
          status,
          isApproved: p?.isApproved ?? false,
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

  const handleApprove = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .update({ isApproved: true, verificationStatus: "verified" })
        .eq("userId", userId);
      if (error) throw error;
      setSellers((prev) => prev.map((s) => s.userId === userId ? { ...s, status: "verified", isApproved: true } : s));
      if (selectedSeller?.userId === userId) setSelectedSeller((s) => s ? { ...s, status: "verified", isApproved: true } : s);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to approve seller");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .update({ isApproved: false, verificationStatus: "rejected" })
        .eq("userId", userId);
      if (error) throw error;
      setSellers((prev) => prev.map((s) => s.userId === userId ? { ...s, status: "rejected", isApproved: false } : s));
      if (selectedSeller?.userId === userId) setSelectedSeller((s) => s ? { ...s, status: "rejected", isApproved: false } : s);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to reject seller");
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

  const byStatus = (status: string) =>
    status === "pending"
      ? filtered.filter((s) => !s.isApproved && s.status !== "rejected" && s.status !== "suspended")
      : filtered.filter((s) => s.status === status);

  const renderTable = (data: Seller[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Business</TableHead>
          <TableHead className="hidden md:table-cell">Contact</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              No applications found.
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
                <Badge variant="outline" className={statusColor[s.status] ?? statusColor["pending"]}>{s.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedSeller(s)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!s.isApproved && s.status !== "rejected" && s.status !== "suspended" && (
                    <>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        onClick={() => handleApprove(s.userId)}
                        disabled={actionLoading === s.userId}
                      >
                        {actionLoading === s.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(s.userId)}
                        disabled={actionLoading === s.userId}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const pendingList = byStatus("pending");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Seller Approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review and manage seller registration requests.
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
            placeholder="Search by name, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2 text-xs">{pendingList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="verified">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card><CardContent className="pt-4">{renderTable(pendingList)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="verified">
          <Card><CardContent className="pt-4">{renderTable(byStatus("verified"))}</CardContent></Card>
        </TabsContent>
        <TabsContent value="rejected">
          <Card><CardContent className="pt-4">{renderTable(byStatus("rejected"))}</CardContent></Card>
        </TabsContent>
        <TabsContent value="all">
          <Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={() => setSelectedSeller(null)}>
        {selectedSeller && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedSeller.company}</DialogTitle>
              <DialogDescription>Seller application details</DialogDescription>
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
                    <p className="text-xs text-muted-foreground">Applied</p>
                    <p className="text-sm font-medium">{selectedSeller.date}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Current Status:</span>
                <Badge variant="outline" className={statusColor[selectedSeller.status] ?? statusColor["pending"]}>
                  {selectedSeller.status}
                </Badge>
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

            {!selectedSeller.isApproved && selectedSeller.status !== "rejected" && selectedSeller.status !== "suspended" && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleReject(selectedSeller.userId)}
                  disabled={actionLoading === selectedSeller.userId}
                >
                  {actionLoading === selectedSeller.userId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                  Reject
                </Button>
                <Button
                  onClick={() => handleApprove(selectedSeller.userId)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={actionLoading === selectedSeller.userId}
                >
                  {actionLoading === selectedSeller.userId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                  Approve
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminApprovals;
