import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Package, Eye, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface OrderRow {
  id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  sellerId: string | null;
  products: { title: string } | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  paid: "bg-amber-500/15 text-amber-700 border-amber-200",
  packed: "bg-amber-500/15 text-amber-700 border-amber-200",
  shipped: "bg-blue-500/15 text-blue-700 border-blue-200",
  delivered: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  cancelled: "bg-destructive/15 text-destructive border-destructive/20",
  refunded: "bg-destructive/15 text-destructive border-destructive/20",
};

const RETURN_REASONS = [
  { value: "damaged", label: "Item arrived damaged" },
  { value: "wrong_item", label: "Wrong item received" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

const BuyerOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Return request dialog state
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnDescription, setReturnDescription] = useState("");
  const [returnLoading, setReturnLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, orderNumber, total, status, createdAt, sellerId, products(title)")
          .eq("buyerId", user.id)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        setOrders((data as unknown as OrderRow[]) || []);
      } catch (err) {
        console.error("Error fetching orders:", err);
        toast({ title: "Failed to load orders", description: "Please refresh the page.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const filtered = orders.filter(
    (o) =>
      (o.orderNumber || o.id).toLowerCase().includes(search.toLowerCase()) ||
      (o.products?.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((o) => o.status === status);

  const handleReturnSubmit = async () => {
    if (!returnOrder || !user || !returnReason || !returnDescription.trim()) return;
    if (!returnOrder.sellerId) {
      toast({ title: "Cannot submit return", description: "Seller information is unavailable for this order. Please contact support for assistance.", variant: "destructive" });
      return;
    }
    setReturnLoading(true);
    try {
      const { error } = await supabase.from("returns").insert({
        orderId: returnOrder.id,
        buyerId: user.id,
        sellerId: returnOrder.sellerId,
        reason: returnReason,
        description: returnDescription.trim(),
        status: "requested",
      });
      if (error) throw error;
      toast({ title: "Return requested", description: "Your return request has been submitted. We'll be in touch shortly." });
      setReturnOrder(null);
      setReturnReason("");
      setReturnDescription("");
    } catch (err) {
      toast({ title: "Failed to submit return", description: (err as Error).message, variant: "destructive" });
    } finally {
      setReturnLoading(false);
    }
  };

  const renderTable = (data: OrderRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order ID</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              Loading…
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No orders found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((o) => (
            <TableRow key={o.id}>
              <TableCell className="font-medium text-sm">
                {o.orderNumber || o.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[200px] truncate">
                {o.products?.title ?? "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(o.createdAt).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell className="font-semibold text-sm">
                £{(o.total ?? 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[o.status] ?? ""}>{o.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={["shipped", "delivered"].includes(o.status) ? "Track shipment" : "Tracking not yet available"}
                    disabled={!["shipped", "delivered"].includes(o.status)}
                    onClick={() => navigate(`/tracking/${o.orderNumber || o.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={o.status === "delivered" ? "Request return" : "Returns available after delivery"}
                    disabled={o.status !== "delivered"}
                    onClick={() => {
                      setReturnOrder(o);
                      setReturnReason("");
                      setReturnDescription("");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
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
        <h1 className="text-2xl font-bold text-foreground">My Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">Track and manage your purchases.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order ID or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="shipped">Shipped</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>

        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="processing"><Card><CardContent className="pt-4">{renderTable(filtered.filter((o) => ["pending","paid","packed"].includes(o.status)))}</CardContent></Card></TabsContent>
        <TabsContent value="shipped"><Card><CardContent className="pt-4">{renderTable(byStatus("shipped"))}</CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="pt-4">{renderTable(byStatus("delivered"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Return Request Dialog */}
      <Dialog open={!!returnOrder} onOpenChange={(open) => { if (!open) setReturnOrder(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Return</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Order: <span className="font-medium text-foreground">{returnOrder?.orderNumber || returnOrder?.id?.slice(0, 8).toUpperCase()}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="return-reason">Reason for Return</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger id="return-reason">
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="return-description">Description</Label>
              <Textarea
                id="return-description"
                placeholder="Please describe the issue in detail…"
                value={returnDescription}
                onChange={(e) => setReturnDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnOrder(null)} disabled={returnLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleReturnSubmit}
              disabled={returnLoading || !returnReason || !returnDescription.trim()}
            >
              {returnLoading ? "Submitting…" : "Submit Return Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerOrders;
