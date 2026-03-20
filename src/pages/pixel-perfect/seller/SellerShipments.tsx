import { useState } from "react";
import { Truck, Search, Filter, MapPin, Clock, Package, ExternalLink, CheckCircle2 } from "lucide-react";
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

interface Shipment {
  id: string;
  orderId: string;
  buyer: string;
  destination: string;
  carrier: string;
  tracking: string;
  items: number;
  weight: string;
  status: "label_created" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered";
  estimatedDelivery: string;
  shippedDate: string;
  events: { date: string; description: string }[];
}

const shipments: Shipment[] = [
  {
    id: "SHP-3021", orderId: "ORD-1042", buyer: "RetailHub London", destination: "London, E14 5AB",
    carrier: "Royal Mail", tracking: "RM9281736GB", items: 3, weight: "24.5 kg",
    status: "in_transit", estimatedDelivery: "21 Mar 2026", shippedDate: "19 Mar 2026",
    events: [
      { date: "19 Mar 10:42", description: "Parcel collected from seller" },
      { date: "19 Mar 14:15", description: "Arrived at Manchester sorting facility" },
      { date: "19 Mar 22:30", description: "Departed Manchester — en route to London" },
    ],
  },
  {
    id: "SHP-3020", orderId: "ORD-1041", buyer: "BargainBox Ltd", destination: "Birmingham, B1 1BB",
    carrier: "DPD", tracking: "DPD728391UK", items: 1, weight: "8.2 kg",
    status: "out_for_delivery", estimatedDelivery: "19 Mar 2026", shippedDate: "18 Mar 2026",
    events: [
      { date: "18 Mar 15:00", description: "Parcel collected from seller" },
      { date: "18 Mar 23:10", description: "Arrived at Birmingham depot" },
      { date: "19 Mar 07:20", description: "Out for delivery" },
    ],
  },
  {
    id: "SHP-3019", orderId: "ORD-1040", buyer: "MarketStall UK", destination: "Leeds, LS1 4AP",
    carrier: "Hermes", tracking: "HME9182736", items: 5, weight: "42.0 kg",
    status: "label_created", estimatedDelivery: "22 Mar 2026", shippedDate: "—",
    events: [
      { date: "19 Mar 09:00", description: "Shipping label created" },
    ],
  },
  {
    id: "SHP-3018", orderId: "ORD-1039", buyer: "ClearanceKing", destination: "Bristol, BS1 5EH",
    carrier: "Royal Mail", tracking: "RM8172634GB", items: 2, weight: "15.8 kg",
    status: "delivered", estimatedDelivery: "18 Mar 2026", shippedDate: "16 Mar 2026",
    events: [
      { date: "16 Mar 11:00", description: "Parcel collected from seller" },
      { date: "17 Mar 06:45", description: "Arrived at Bristol depot" },
      { date: "18 Mar 10:12", description: "Delivered — signed by J. Clarke" },
    ],
  },
  {
    id: "SHP-3017", orderId: "ORD-1038", buyer: "ValueFinds Ltd", destination: "Glasgow, G1 1XQ",
    carrier: "DPD", tracking: "DPD192837UK", items: 1, weight: "6.3 kg",
    status: "picked_up", estimatedDelivery: "21 Mar 2026", shippedDate: "19 Mar 2026",
    events: [
      { date: "19 Mar 08:30", description: "Shipping label created" },
      { date: "19 Mar 13:45", description: "Parcel collected by DPD driver" },
    ],
  },
  {
    id: "SHP-3016", orderId: "ORD-1037", buyer: "QuickSell Pro", destination: "Edinburgh, EH1 3EG",
    carrier: "Royal Mail", tracking: "RM7263541GB", items: 4, weight: "31.0 kg",
    status: "delivered", estimatedDelivery: "17 Mar 2026", shippedDate: "15 Mar 2026",
    events: [
      { date: "15 Mar 14:00", description: "Parcel collected from seller" },
      { date: "16 Mar 08:00", description: "Arrived at Edinburgh depot" },
      { date: "17 Mar 11:30", description: "Delivered — left in safe place" },
    ],
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  label_created: { label: "Label Created", className: "bg-muted text-muted-foreground" },
  picked_up: { label: "Picked Up", className: "bg-blue-500/10 text-blue-700" },
  in_transit: { label: "In Transit", className: "bg-purple-500/10 text-purple-700" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-amber-500/10 text-amber-700" },
  delivered: { label: "Delivered", className: "bg-emerald-500/10 text-emerald-700" },
};

const SellerShipments = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Shipment | null>(null);

  const filtered = shipments.filter(
    (s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.buyer.toLowerCase().includes(search.toLowerCase()) ||
      s.tracking.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((s) => s.status === status);
  const activeShipments = filtered.filter((s) => s.status !== "delivered");

  const renderTable = (data: Shipment[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Shipment</TableHead>
          <TableHead className="hidden sm:table-cell">Order</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden md:table-cell">Carrier</TableHead>
          <TableHead className="hidden lg:table-cell">Tracking</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">ETA</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No shipments found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((s) => {
            const sc = statusConfig[s.status];
            return (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-sm">{s.id}</TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{s.orderId}</TableCell>
                <TableCell className="text-sm">{s.buyer}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{s.carrier}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-mono">{s.tracking}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{s.estimatedDelivery}</TableCell>
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
        <p className="text-sm text-muted-foreground mt-1">{shipments.length} shipments · {activeShipments.length} active</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Label Created", count: byStatus("label_created").length, icon: Package, color: "text-muted-foreground bg-muted" },
          { label: "In Transit", count: filtered.filter((s) => ["picked_up", "in_transit"].includes(s.status)).length, icon: Truck, color: "text-purple-600 bg-purple-500/10" },
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
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
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
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> {selected.id}
              </DialogTitle>
              <DialogDescription>{selected.carrier} · {selected.tracking}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">{selected.buyer}</p></div>
                <div><span className="text-muted-foreground">Destination</span><p className="font-medium text-foreground">{selected.destination}</p></div>
                <div><span className="text-muted-foreground">Items / Weight</span><p className="font-medium text-foreground">{selected.items} items · {selected.weight}</p></div>
                <div><span className="text-muted-foreground">ETA</span><p className="font-medium text-foreground">{selected.estimatedDelivery}</p></div>
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3">TRACKING HISTORY</p>
                <div className="space-y-3">
                  {[...selected.events].reverse().map((event, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${i === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                        {i < selected.events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm text-foreground">{event.description}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {event.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SellerShipments;
