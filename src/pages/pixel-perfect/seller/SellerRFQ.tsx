import { useState } from "react";
import { FileText, Search, Filter, Clock, CheckCircle2, XCircle, MessageSquare, PoundSterling, Send } from "lucide-react";
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
import { Label } from "@/components/ui/label";

interface Quote {
  id: string;
  buyer: string;
  company: string;
  product: string;
  quantity: string;
  budget: string;
  message: string;
  status: "new" | "quoted" | "accepted" | "declined" | "expired";
  receivedDate: string;
  expiresDate: string;
  quotedPrice?: string;
}

const quotes: Quote[] = [
  { id: "RFQ-210", buyer: "Mark Thompson", company: "RetailHub London", product: "iPhone 15 Pro Max — Grade A", quantity: "100 units", budget: "£45,000 – £50,000", message: "We're looking for a bulk lot of iPhone 15 Pro Max in Grade A condition. Must include chargers. Can do repeat orders monthly.", status: "new", receivedDate: "19 Mar 2026", expiresDate: "26 Mar 2026" },
  { id: "RFQ-209", buyer: "Sarah Williams", company: "BargainBox Ltd", product: "Mixed Clothing Pallets", quantity: "10 pallets", budget: "£8,000 – £12,000", message: "Need branded clothing pallets for our retail stores. Prefer mix of Nike, Adidas, Under Armour. Seasonal mix OK.", status: "quoted", receivedDate: "17 Mar 2026", expiresDate: "24 Mar 2026", quotedPrice: "£11,500" },
  { id: "RFQ-208", buyer: "James Cooper", company: "MarketStall UK", product: "Amazon Returns — Electronics", quantity: "5 pallets", budget: "£3,000 – £5,000", message: "Looking for Amazon electronics returns. Any grade acceptable. Need manifest included.", status: "accepted", receivedDate: "14 Mar 2026", expiresDate: "21 Mar 2026", quotedPrice: "£4,200" },
  { id: "RFQ-207", buyer: "Emma Davies", company: "ClearanceKing", product: "Power Tools Lot", quantity: "200 units", budget: "£6,000 – £8,000", message: "Need DeWalt, Makita, or Bosch power tools in working condition for our trade customers.", status: "declined", receivedDate: "10 Mar 2026", expiresDate: "17 Mar 2026" },
  { id: "RFQ-206", buyer: "David Chen", company: "ValueFinds Ltd", product: "Health & Beauty Bundle", quantity: "3 pallets", budget: "£2,000 – £3,500", message: "Interested in branded skincare and fragrance pallets. Need retail-ready packaging.", status: "expired", receivedDate: "1 Mar 2026", expiresDate: "8 Mar 2026" },
  { id: "RFQ-205", buyer: "Lisa Brown", company: "QuickSell Pro", product: "Home & Kitchen Mixed", quantity: "8 pallets", budget: "£5,000 – £7,000", message: "Looking for home goods pallets — cookware, small appliances, storage. Grade A/B preferred.", status: "new", receivedDate: "18 Mar 2026", expiresDate: "25 Mar 2026" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-blue-500/10 text-blue-700" },
  quoted: { label: "Quoted", className: "bg-amber-500/10 text-amber-700" },
  accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-700" },
  declined: { label: "Declined", className: "bg-red-500/10 text-red-700" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
};

const SellerRFQ = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Quote | null>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteNote, setQuoteNote] = useState("");

  const filtered = quotes.filter(
    (q) =>
      q.id.toLowerCase().includes(search.toLowerCase()) ||
      q.buyer.toLowerCase().includes(search.toLowerCase()) ||
      q.product.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((q) => q.status === status);

  const renderTable = (data: Quote[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RFQ ID</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead className="hidden md:table-cell">Qty</TableHead>
          <TableHead className="hidden lg:table-cell">Budget</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Received</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No quote requests found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((q) => {
            const sc = statusConfig[q.status];
            return (
              <TableRow key={q.id}>
                <TableCell className="font-medium text-sm">{q.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium text-foreground">{q.buyer}</p>
                    <p className="text-xs text-muted-foreground">{q.company}</p>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{q.product}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{q.quantity}</TableCell>
                <TableCell className="hidden lg:table-cell text-xs font-medium text-foreground">{q.budget}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{q.receivedDate}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelected(q); setQuotePrice(q.quotedPrice || ""); setQuoteNote(""); }}>
                    {q.status === "new" ? "Quote" : "View"}
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
        <h1 className="font-display text-2xl font-bold text-foreground">RFQ / Quotes</h1>
        <p className="text-sm text-muted-foreground mt-1">{quotes.length} quote requests · {byStatus("new").length} awaiting response</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "New Requests", count: byStatus("new").length, icon: MessageSquare, color: "text-blue-600 bg-blue-500/10" },
          { label: "Quoted", count: byStatus("quoted").length, icon: PoundSterling, color: "text-amber-600 bg-amber-500/10" },
          { label: "Accepted", count: byStatus("accepted").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Declined / Expired", count: filtered.filter((q) => ["declined", "expired"].includes(q.status)).length, icon: XCircle, color: "text-red-600 bg-red-500/10" },
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
          <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="quoted">Quoted</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="new"><Card><CardContent className="pt-4">{renderTable(byStatus("new"))}</CardContent></Card></TabsContent>
        <TabsContent value="quoted"><Card><CardContent className="pt-4">{renderTable(byStatus("quoted"))}</CardContent></Card></TabsContent>
        <TabsContent value="accepted"><Card><CardContent className="pt-4">{renderTable(byStatus("accepted"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Quote Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id}</DialogTitle>
              <DialogDescription>Quote request from {selected.company}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Buyer</span><p className="font-medium text-foreground">{selected.buyer}</p></div>
                <div><span className="text-muted-foreground">Company</span><p className="font-medium text-foreground">{selected.company}</p></div>
                <div><span className="text-muted-foreground">Product</span><p className="font-medium text-foreground">{selected.product}</p></div>
                <div><span className="text-muted-foreground">Quantity</span><p className="font-medium text-foreground">{selected.quantity}</p></div>
                <div><span className="text-muted-foreground">Budget</span><p className="font-semibold text-foreground">{selected.budget}</p></div>
                <div><span className="text-muted-foreground">Expires</span><p className="font-medium text-foreground">{selected.expiresDate}</p></div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">BUYER MESSAGE</p>
                <p className="text-sm text-foreground">{selected.message}</p>
              </div>
              {selected.quotedPrice && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">YOUR QUOTE</p>
                  <p className="text-lg font-bold text-foreground">{selected.quotedPrice}</p>
                </div>
              )}
              {selected.status === "new" && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Your Quote Price</Label>
                    <Input placeholder="£0.00" value={quotePrice} onChange={(e) => setQuotePrice(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Notes for Buyer</Label>
                    <Textarea placeholder="Include delivery terms, lead time, etc." value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} rows={3} className="mt-1" />
                  </div>
                </div>
              )}
            </div>
            {selected.status === "new" && (
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                <Button disabled={!quotePrice.trim()} onClick={() => setSelected(null)}>
                  <Send className="h-4 w-4 mr-1" /> Send Quote
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SellerRFQ;
