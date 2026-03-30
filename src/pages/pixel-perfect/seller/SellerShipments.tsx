import { useState, useEffect } from "react";
import { Truck, Search, MapPin, Clock, Package, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import type { Shipment } from "@/types/shipping";
import type { User } from "@/types";

type BuyerData = Pick<User, "id" | "firstName" | "lastName">;

interface ShipmentRow extends Shipment {
  orders?: {
    orderNumber?: string;
    products?: { title?: string } | null;
  } | null;
}

/** Map DB status to the display config keys */
function mapStatus(status: string): string {
  const s = status.toLowerCase().replace(/ /g, "_");
  if (s === "dispatched" || s === "in_transit") return "in_transit";
  if (s === "out_for_delivery") return "out_for_delivery";
  if (s === "delivered") return "delivered";
  if (s === "pending" || s === "processing") return "label_created";
  if (s === "picked_up") return "picked_up";
  return "label_created";
}

const statusConfig: Record<string, { label: string; className: string }> = {
  label_created: { label: "Label Created", className: "bg-muted text-muted-foreground" },
  picked_up: { label: "Picked Up", className: "bg-blue-500/10 text-blue-700" },
  in_transit: { label: "In Transit", className: "bg-purple-500/10 text-purple-700" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-amber-500/10 text-amber-700" },
  delivered: { label: "Delivered", className: "bg-emerald-500/10 text-emerald-700" },
};

const SellerShipments = () => {
  const { user } = useAuthStore();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [buyerNames, setBuyerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ShipmentRow | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data } = await supabase
          .from("shipments")
          .select(`*, orders(orderNumber, products(title))`)
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });
        const rows = (data ?? []) as ShipmentRow[];
        setShipments(rows);

        // Resolve buyer names via secondary query
        const uniqueBuyerIds = [...new Set(rows.map((s) => s.buyer_id).filter(Boolean))];
        if (uniqueBuyerIds.length > 0) {
          const { data: buyers } = await supabase
            .from("users")
            .select("id, firstName, lastName")
            .in("id", uniqueBuyerIds);
          const names: Record<string, string> = {};
          (buyers ?? []).forEach((buyer: BuyerData) => {
            const name = [buyer.firstName, buyer.lastName].filter(Boolean).join(" ").trim();
            names[buyer.id] = name || "Customer";
          });
          setBuyerNames(names);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      (s.tracking_number ?? "").toLowerCase().includes(q) ||
      (s.orders?.orderNumber ?? "").toLowerCase().includes(q)
    );
  });

  const byStatus = (status: string) => filtered.filter((s) => mapStatus(s.status) === status);
  const activeShipments = filtered.filter((s) => mapStatus(s.status) !== "delivered");

  const renderTable = (data: ShipmentRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead className="hidden sm:table-cell">Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden md:table-cell">Carrier</TableHead>
          <TableHead className="hidden lg:table-cell">Tracking</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              Loading shipments…
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No shipments found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => {
            const displayStatus = mapStatus(s.status);
            const sc = statusConfig[displayStatus];
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-sm">{s.id.slice(0, 8).toUpperCase()}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  {s.orders?.orderNumber ?? s.order_id.slice(0, 8)}
                </TableCell>
                <TableCell className="text-sm">{buyerNames[s.buyer_id] ?? "Customer"}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.courier_name ?? "—"}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">{s.tracking_number ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelected(s)}>Track</Button>
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
        <h1 className="font-display text-2xl font-bold text-foreground">Shipments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${shipments.length} shipments · ${activeShipments.length} active`}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Label Created", count: byStatus("label_created").length, icon: Package, color: "text-muted-foreground bg-muted" },
          { label: "In Transit", count: filtered.filter((s) => ["picked_up", "in_transit"].includes(mapStatus(s.status))).length, icon: Truck, color: "text-purple-600 bg-purple-500/10" },
          { label: "Out for Delivery", count: byStatus("out_for_delivery").length, icon: MapPin, color: "text-amber-600 bg-amber-500/10" },
          { label: "Delivered", count: byStatus("delivered").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
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
          <Input placeholder="Search shipments or tracking..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="active"><Card><CardContent className="pt-4">{renderTable(activeShipments)}</CardContent></Card></TabsContent>
        <TabsContent value="delivered"><Card><CardContent className="pt-4">{renderTable(byStatus("delivered"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Tracking Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (() => {
          const displayStatus = mapStatus(selected.status);
          const sc = statusConfig[displayStatus];
          return (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> {selected.id.slice(0, 8).toUpperCase()}
                </DialogTitle>
                <DialogDescription>{selected.courier_name ?? "Carrier"} · {selected.tracking_number ?? "No tracking"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">Customer</p></div>
                  <div><span className="text-muted-foreground">Status</span><p className="font-medium text-foreground"><Badge variant="outline" className={sc.className}>{sc.label}</Badge></p></div>
                  <div><span className="text-muted-foreground">Order</span><p className="font-medium text-foreground">{selected.orders?.orderNumber ?? selected.order_id.slice(0, 8)}</p></div>
                  <div><span className="text-muted-foreground">Dispatched</span><p className="font-medium text-foreground">{selected.dispatched_at ? new Date(selected.dispatched_at).toLocaleDateString("en-GB") : "—"}</p></div>
                </div>
                {selected.proof_of_delivery_url && (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">PROOF OF DELIVERY</p>
                    <a href={selected.proof_of_delivery_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View document</a>
                  </div>
                )}
                <div className="rounded-lg bg-muted/50 border border-border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">SHIPMENT CREATED</p>
                  <p className="text-sm text-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(selected.created_at).toLocaleString("en-GB")}</p>
                </div>
              </div>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
};

export default SellerShipments;
