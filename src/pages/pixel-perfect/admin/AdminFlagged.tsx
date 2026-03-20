import { useState } from "react";
import { Flag, Search, Filter, Eye, CheckCircle2, Ban, AlertTriangle, MoreHorizontal } from "lucide-react";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FlaggedItem {
  id: number;
  type: "product" | "review" | "seller" | "message";
  title: string;
  reportedBy: string;
  reason: string;
  details: string;
  status: "pending" | "resolved" | "dismissed";
  date: string;
  severity: "low" | "medium" | "high";
}

const flaggedItems: FlaggedItem[] = [
  { id: 1, type: "product", title: "Counterfeit Nike Trainers", reportedBy: "Mark Thompson", reason: "Counterfeit goods", details: "Product appears to be selling counterfeit Nike trainers. Images show poor quality branding inconsistent with authentic Nike products.", status: "pending", date: "19 Mar 2026", severity: "high" },
  { id: 2, type: "review", title: "Fake 5-star review on TechWholesale", reportedBy: "System (auto-detect)", reason: "Suspicious review pattern", details: "Multiple 5-star reviews from newly created accounts within 24 hours. Review text appears templated.", status: "pending", date: "18 Mar 2026", severity: "medium" },
  { id: 3, type: "seller", title: "ShadyDeals Ltd — Unverified business", reportedBy: "Jane Buyer", reason: "Fraudulent seller", details: "Seller claims to be VAT registered but provided invalid VAT number. Multiple buyers reported items not as described.", status: "pending", date: "17 Mar 2026", severity: "high" },
  { id: 4, type: "product", title: "Expired Supplements Bundle", reportedBy: "David Chen", reason: "Safety concern", details: "Product listing does not disclose that supplements are past their expiry date. Potential health risk to buyers.", status: "resolved", date: "15 Mar 2026", severity: "high" },
  { id: 5, type: "message", title: "Spam messages to multiple sellers", reportedBy: "System (auto-detect)", reason: "Spam / abuse", details: "User sending identical bulk-buy enquiry messages to 50+ sellers within 1 hour. Messages contain external links.", status: "resolved", date: "14 Mar 2026", severity: "low" },
  { id: 6, type: "review", title: "Defamatory review of HomeGoods Direct", reportedBy: "HomeGoods Direct", reason: "Defamation", details: "Review contains false claims about the seller with no evidence. Seller believes this is from a competitor.", status: "dismissed", date: "12 Mar 2026", severity: "medium" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  dismissed: { label: "Dismissed", className: "bg-muted text-muted-foreground" },
};

const severityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-blue-500/10 text-blue-700" },
  medium: { label: "Medium", className: "bg-amber-500/10 text-amber-700" },
  high: { label: "High", className: "bg-red-500/10 text-red-700" },
};

const typeConfig: Record<string, string> = {
  product: "bg-purple-500/10 text-purple-700",
  review: "bg-blue-500/10 text-blue-700",
  seller: "bg-red-500/10 text-red-700",
  message: "bg-muted text-muted-foreground",
};

const AdminFlagged = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FlaggedItem | null>(null);

  const filtered = flaggedItems.filter(
    (f) =>
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.reason.toLowerCase().includes(search.toLowerCase()) ||
      f.reportedBy.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((f) => f.status === status);

  const renderTable = (data: FlaggedItem[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="hidden sm:table-cell">Reported By</TableHead>
          <TableHead className="hidden md:table-cell">Reason</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <Flag className="h-8 w-8 mx-auto mb-2 opacity-40" />No flagged items.
            </TableCell>
          </TableRow>
        ) : (
          data.map((f) => (
            <TableRow key={f.id}>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.date}</p>
              </TableCell>
              <TableCell><Badge variant="outline" className={typeConfig[f.type]}>{f.type}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{f.reportedBy}</TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{f.reason}</TableCell>
              <TableCell><Badge variant="outline" className={severityConfig[f.severity].className}>{severityConfig[f.severity].label}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={statusConfig[f.status].className}>{statusConfig[f.status].label}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelected(f)}><Eye className="h-3.5 w-3.5 mr-2" /> View Details</DropdownMenuItem>
                    <DropdownMenuItem><CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Resolve</DropdownMenuItem>
                    <DropdownMenuItem><AlertTriangle className="h-3.5 w-3.5 mr-2" /> Dismiss</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive"><Ban className="h-3.5 w-3.5 mr-2" /> Take Action</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
        <h1 className="text-2xl font-bold text-foreground">Flagged Content</h1>
        <p className="text-muted-foreground text-sm mt-1">{flaggedItems.length} reports · {byStatus("pending").length} pending review</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending", count: byStatus("pending").length, icon: AlertTriangle, color: "text-amber-600 bg-amber-500/10" },
          { label: "High Severity", count: flaggedItems.filter((f) => f.severity === "high" && f.status === "pending").length, icon: Flag, color: "text-red-600 bg-red-500/10" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Dismissed", count: byStatus("dismissed").length, icon: Ban, color: "text-muted-foreground bg-muted" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}><stat.icon className="h-5 w-5" /></div>
            <div className="font-display text-2xl font-bold text-foreground">{stat.count}</div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search flagged items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending <Badge variant="secondary" className="ml-2 text-xs">{byStatus("pending").length}</Badge></TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="pending"><Card><CardContent className="pt-4">{renderTable(byStatus("pending"))}</CardContent></Card></TabsContent>
        <TabsContent value="resolved"><Card><CardContent className="pt-4">{renderTable(byStatus("resolved"))}</CardContent></Card></TabsContent>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.title}</DialogTitle>
              <DialogDescription>Flagged {selected.type} report</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Reported By</span><p className="font-medium text-foreground">{selected.reportedBy}</p></div>
                <div><span className="text-muted-foreground">Reason</span><p className="font-medium text-foreground">{selected.reason}</p></div>
                <div><span className="text-muted-foreground">Severity</span><p><Badge variant="outline" className={severityConfig[selected.severity].className}>{severityConfig[selected.severity].label}</Badge></p></div>
                <div><span className="text-muted-foreground">Date</span><p className="font-medium text-foreground">{selected.date}</p></div>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">DETAILS</p>
                <p className="text-sm text-foreground">{selected.details}</p>
              </div>
            </div>
            {selected.status === "pending" && (
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Dismiss</Button>
                <Button onClick={() => setSelected(null)}><CheckCircle2 className="h-4 w-4 mr-1" /> Resolve</Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminFlagged;
