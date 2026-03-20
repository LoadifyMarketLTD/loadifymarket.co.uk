import { useState } from "react";
import { RotateCcw, Search, Filter, AlertCircle, CheckCircle2, Clock, XCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Return {
  id: string;
  orderId: string;
  buyer: string;
  product: string;
  reason: string;
  amount: number;
  status: "requested" | "approved" | "received" | "refunded" | "rejected";
  requestedDate: string;
  notes: string;
}

const returns: Return[] = [
  { id: "RET-501", orderId: "ORD-1036", buyer: "StockDirect UK", product: "Mixed Electronics Pallet", reason: "Items not as described", amount: 1200, status: "requested", requestedDate: "19 Mar 2026", notes: "Buyer claims 30% of items were non-functional, listing stated Grade A/B." },
  { id: "RET-500", orderId: "ORD-1032", buyer: "RetailHub London", product: "Skincare & Fragrance Bundle", reason: "Damaged in transit", amount: 890, status: "approved", requestedDate: "17 Mar 2026", notes: "Packaging was visibly damaged on arrival. Photos provided by buyer." },
  { id: "RET-499", orderId: "ORD-1028", buyer: "BargainBox Ltd", product: "Designer Clothing Bundle", reason: "Wrong items received", amount: 1800, status: "received", requestedDate: "15 Mar 2026", notes: "Buyer received men's clothing instead of women's. Return parcel received at warehouse." },
  { id: "RET-498", orderId: "ORD-1025", buyer: "MarketStall UK", product: "Toy Clearance Lot", reason: "Missing items", amount: 450, status: "refunded", requestedDate: "12 Mar 2026", notes: "Manifest listed 200 units, buyer counted 165. Partial refund issued." },
  { id: "RET-497", orderId: "ORD-1020", buyer: "ClearanceKing", product: "Samsung Galaxy Mixed Lot", reason: "Changed mind", amount: 2450, status: "rejected", requestedDate: "10 Mar 2026", notes: "Return request outside 14-day window. Buyer notified." },
  { id: "RET-496", orderId: "ORD-1018", buyer: "ValueFinds Ltd", product: "Home & Kitchen Bundle", reason: "Damaged in transit", amount: 680, status: "refunded", requestedDate: "8 Mar 2026", notes: "Full refund processed after photos confirmed damage." },
];

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  requested: { label: "Requested", className: "bg-amber-500/10 text-amber-700", icon: AlertCircle },
  approved: { label: "Approved", className: "bg-blue-500/10 text-blue-700", icon: CheckCircle2 },
  received: { label: "Received", className: "bg-purple-500/10 text-purple-700", icon: Package },
  refunded: { label: "Refunded", className: "bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-700", icon: XCircle },
};

const SellerReturns = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Return | null>(null);
  const [responseText, setResponseText] = useState("");

  const filtered = returns.filter(
    (r) =>
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.buyer.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((r) => r.status === status);

  const renderTable = (data: Return[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Return ID</TableHead>
          <TableHead className="hidden sm:table-cell">Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden md:table-cell">Product</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Date</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No returns found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => {
            const sc = statusConfig[r.status];
            return (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-sm">{r.id}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{r.orderId}</TableCell>
                <TableCell className="text-sm">{r.buyer}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{r.product}</TableCell>
                <TableCell className="font-semibold text-sm">£{r.amount.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{r.requestedDate}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelected(r); setResponseText(""); }}>
                    {r.status === "requested" ? "Review" : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Returns</h1>
        <p className="text-sm text-muted-foreground mt-1">{returns.length} return requests · {byStatus("requested").length} pending review</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Review", count: byStatus("requested").length, icon: AlertCircle, color: "text-amber-600 bg-amber-500/10" },
          { label: "Approved / In Progress", count: filtered.filter((r) => ["approved", "received"].includes(r.status)).length, icon: Clock, color: "text-blue-600 bg-blue-500/10" },
          { label: "Refunded", count: byStatus("refunded").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Rejected", count: byStatus("rejected").length, icon: XCircle, color: "text-red-600 bg-red-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{stat.count}</div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search returns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="requested">Pending</TabsTrigger>
          <TabsTrigger value="approved">In Progress</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="requested"><Card><CardContent className="pt-4">{renderTable(byStatus("requested"))}</CardContent></Card></TabsContent>
        <TabsContent value="approved"><Card><CardContent className="pt-4">{renderTable(filtered.filter((r) => ["approved", "received"].includes(r.status)))}</CardContent></Card></TabsContent>
        <TabsContent value="refunded"><Card><CardContent className="pt-4">{renderTable(byStatus("refunded"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Return Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id}</DialogTitle>
              <DialogDescription>Return request for {selected.orderId}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">{selected.buyer}</p></div>
                <div><span className="text-muted-foreground">Product</span><p className="font-medium text-foreground">{selected.product}</p></div>
                <div><span className="text-muted-foreground">Reason</span><p className="font-medium text-foreground">{selected.reason}</p></div>
                <div><span className="text-muted-foreground">Refund Amount</span><p className="font-semibold text-foreground">£{selected.amount.toLocaleString()}</p></div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">BUYER NOTES</p>
                <p className="text-sm text-foreground">{selected.notes}</p>
              </div>
              {selected.status === "requested" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Response</p>
                  <Textarea placeholder="Add notes about this return..." value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={3} />
                </div>
              )}
            </div>
            {selected.status === "requested" && (
              <DialogFooter className="flex gap-2">
                <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setSelected(null)}>
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => setSelected(null)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Approve Return
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SellerReturns;
