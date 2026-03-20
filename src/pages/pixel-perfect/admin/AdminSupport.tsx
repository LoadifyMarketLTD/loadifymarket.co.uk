import { useState } from "react";
import { MessageSquare, Search, Filter, Clock, CheckCircle2, AlertCircle, User, Send } from "lucide-react";
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

interface Ticket {
  id: string;
  subject: string;
  user: string;
  userRole: "buyer" | "seller";
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "closed";
  created: string;
  lastUpdate: string;
  messages: { from: string; text: string; date: string }[];
}

const tickets: Ticket[] = [
  {
    id: "TKT-1024", subject: "Order not delivered after 7 days", user: "Jane Buyer", userRole: "buyer",
    category: "Delivery", priority: "high", status: "open", created: "19 Mar 2026", lastUpdate: "19 Mar 2026",
    messages: [
      { from: "Jane Buyer", text: "My order ORD-2847 was shipped 7 days ago but hasn't arrived. Royal Mail tracking shows it's stuck at Manchester sorting facility.", date: "19 Mar 10:30" },
    ],
  },
  {
    id: "TKT-1023", subject: "Unable to withdraw earnings", user: "John Doe", userRole: "seller",
    category: "Payments", priority: "urgent", status: "in_progress", created: "18 Mar 2026", lastUpdate: "19 Mar 2026",
    messages: [
      { from: "John Doe", text: "I've been trying to withdraw my earnings for 3 days now but keep getting an error. My balance shows £4,200 available.", date: "18 Mar 14:00" },
      { from: "Support Team", text: "We're investigating this with our payment provider. Your funds are safe and we'll resolve this within 24 hours.", date: "19 Mar 09:15" },
    ],
  },
  {
    id: "TKT-1022", subject: "Product listing rejected without reason", user: "Lisa Brown", userRole: "seller",
    category: "Listings", priority: "medium", status: "open", created: "17 Mar 2026", lastUpdate: "17 Mar 2026",
    messages: [
      { from: "Lisa Brown", text: "My listing for 'Home & Kitchen Mixed Pallet' was rejected but I didn't receive any explanation. The listing complied with all guidelines.", date: "17 Mar 16:45" },
    ],
  },
  {
    id: "TKT-1021", subject: "Refund not processed", user: "Mark Thompson", userRole: "buyer",
    category: "Refunds", priority: "high", status: "in_progress", created: "15 Mar 2026", lastUpdate: "18 Mar 2026",
    messages: [
      { from: "Mark Thompson", text: "I was approved for a refund on RET-498 on 12 March but haven't received the money back to my card yet.", date: "15 Mar 11:00" },
      { from: "Support Team", text: "Refunds typically take 5-7 business days. We've confirmed with Stripe that the refund was initiated. Please check again by 20 March.", date: "18 Mar 10:00" },
    ],
  },
  {
    id: "TKT-1020", subject: "How to become a verified seller?", user: "Tom Davies", userRole: "seller",
    category: "Account", priority: "low", status: "resolved", created: "14 Mar 2026", lastUpdate: "15 Mar 2026",
    messages: [
      { from: "Tom Davies", text: "What documents do I need to submit to get the verified seller badge?", date: "14 Mar 09:00" },
      { from: "Support Team", text: "You need: 1) Companies House registration, 2) VAT certificate, 3) Proof of address. Upload via Seller Profile > Verification.", date: "15 Mar 08:30" },
    ],
  },
  {
    id: "TKT-1019", subject: "Account access issue", user: "Emma Davies", userRole: "seller",
    category: "Account", priority: "medium", status: "closed", created: "12 Mar 2026", lastUpdate: "13 Mar 2026",
    messages: [
      { from: "Emma Davies", text: "I can't log in to my seller dashboard. Keep getting 'account suspended' error.", date: "12 Mar 15:00" },
      { from: "Support Team", text: "Your account was suspended due to multiple buyer complaints. Please review our seller guidelines and submit an appeal.", date: "13 Mar 09:00" },
    ],
  },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-blue-500/15 text-blue-700 border-blue-200" },
  in_progress: { label: "In Progress", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
  resolved: { label: "Resolved", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-blue-500/10 text-blue-700" },
  high: { label: "High", className: "bg-amber-500/10 text-amber-700" },
  urgent: { label: "Urgent", className: "bg-red-500/10 text-red-700" },
};

const AdminSupport = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");

  const filtered = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.user.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((t) => t.status === status);
  const openTickets = filtered.filter((t) => ["open", "in_progress"].includes(t.status));

  const renderTable = (data: Ticket[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="hidden sm:table-cell">Category</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Updated</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />No tickets found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{t.id}</p>
                <p className="text-xs text-muted-foreground max-w-[200px] truncate">{t.subject}</p>
              </TableCell>
              <TableCell>
                <p className="text-sm">{t.user}</p>
                <p className="text-xs text-muted-foreground capitalize">{t.userRole}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{t.category}</TableCell>
              <TableCell><Badge variant="outline" className={priorityConfig[t.priority].className}>{priorityConfig[t.priority].label}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={statusConfig[t.status].className}>{statusConfig[t.status].label}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{t.lastUpdate}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelected(t); setReplyText(""); }}>View</Button>
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
        <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
        <p className="text-muted-foreground text-sm mt-1">{tickets.length} total · {openTickets.length} open</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Open", count: byStatus("open").length, icon: AlertCircle, color: "text-blue-600 bg-blue-500/10" },
          { label: "In Progress", count: byStatus("in_progress").length, icon: Clock, color: "text-amber-600 bg-amber-500/10" },
          { label: "Resolved", count: byStatus("resolved").length, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
          { label: "Urgent", count: tickets.filter((t) => t.priority === "urgent" && ["open", "in_progress"].includes(t.status)).length, icon: AlertCircle, color: "text-red-600 bg-red-500/10" },
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
          <Input placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open <Badge variant="secondary" className="ml-2 text-xs">{openTickets.length}</Badge></TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="open"><Card><CardContent className="pt-4">{renderTable(openTickets)}</CardContent></Card></TabsContent>
        <TabsContent value="resolved"><Card><CardContent className="pt-4">{renderTable(filtered.filter((t) => ["resolved", "closed"].includes(t.status)))}</CardContent></Card></TabsContent>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.id} — {selected.subject}</DialogTitle>
              <DialogDescription>{selected.user} ({selected.userRole}) · {selected.category}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[400px] overflow-y-auto">
              {selected.messages.map((msg, i) => (
                <div key={i} className={`rounded-lg p-3 ${msg.from === "Support Team" ? "bg-primary/5 border border-primary/20" : "bg-muted/50 border border-border"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-foreground">{msg.from}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{msg.date}</span>
                  </div>
                  <p className="text-sm text-foreground">{msg.text}</p>
                </div>
              ))}
              {["open", "in_progress"].includes(selected.status) && (
                <div>
                  <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} />
                </div>
              )}
            </div>
            {["open", "in_progress"].includes(selected.status) && (
              <DialogFooter className="flex gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>Close Ticket</Button>
                <Button disabled={!replyText.trim()} onClick={() => setSelected(null)}>
                  <Send className="h-4 w-4 mr-1" /> Send Reply
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminSupport;
