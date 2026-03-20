import { useState } from "react";
import { Users, Search, Filter, ShieldCheck, Ban, MoreHorizontal, Eye, Mail } from "lucide-react";
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface User {
  id: number;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  status: "active" | "suspended" | "pending";
  joined: string;
  orders: number;
  spent: string;
  lastActive: string;
}

const users: User[] = [
  { id: 1, name: "Jane Buyer", email: "jane@email.com", role: "buyer", status: "active", joined: "Jan 2024", orders: 24, spent: "£18,450", lastActive: "Today" },
  { id: 2, name: "John Doe", email: "john@techwholesale.co.uk", role: "seller", status: "active", joined: "Mar 2021", orders: 486, spent: "£245,000", lastActive: "Today" },
  { id: 3, name: "Sarah Williams", email: "sarah@homegoods.com", role: "seller", status: "pending", joined: "Mar 2026", orders: 0, spent: "£0", lastActive: "Yesterday" },
  { id: 4, name: "Mark Thompson", email: "mark@retailhub.co.uk", role: "buyer", status: "active", joined: "Jun 2024", orders: 18, spent: "£42,300", lastActive: "2 days ago" },
  { id: 5, name: "Emma Davies", email: "emma@luxebeauty.com", role: "seller", status: "suspended", joined: "Sep 2024", orders: 12, spent: "£8,200", lastActive: "1 week ago" },
  { id: 6, name: "David Chen", email: "david@valuefinds.co.uk", role: "buyer", status: "active", joined: "Nov 2024", orders: 8, spent: "£6,800", lastActive: "Today" },
  { id: 7, name: "Lisa Brown", email: "lisa@quicksell.co.uk", role: "seller", status: "active", joined: "Feb 2025", orders: 64, spent: "£78,500", lastActive: "Today" },
  { id: 8, name: "Tom Wilson", email: "tom@toolking.com", role: "seller", status: "pending", joined: "Mar 2026", orders: 0, spent: "£0", lastActive: "3 days ago" },
  { id: 9, name: "Admin User", email: "admin@loadify.co.uk", role: "admin", status: "active", joined: "Jan 2021", orders: 0, spent: "—", lastActive: "Today" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  suspended: { label: "Suspended", className: "bg-red-500/15 text-red-700 border-red-200" },
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-700 border-amber-200" },
};

const roleConfig: Record<string, { label: string; className: string }> = {
  buyer: { label: "Buyer", className: "bg-blue-500/10 text-blue-700" },
  seller: { label: "Seller", className: "bg-purple-500/10 text-purple-700" },
  admin: { label: "Admin", className: "bg-destructive/10 text-destructive" },
};

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const byRole = (role: string) => filtered.filter((u) => u.role === role);

  const renderTable = (data: User[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="hidden sm:table-cell">Joined</TableHead>
          <TableHead className="hidden md:table-cell">Orders</TableHead>
          <TableHead className="hidden lg:table-cell">Total Value</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden sm:table-cell">Last Active</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No users found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((u) => (
            <TableRow key={u.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                    {u.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell><Badge variant="outline" className={roleConfig[u.role].className}>{roleConfig[u.role].label}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{u.joined}</TableCell>
              <TableCell className="hidden md:table-cell text-sm text-foreground">{u.orders}</TableCell>
              <TableCell className="hidden lg:table-cell text-sm font-medium text-foreground">{u.spent}</TableCell>
              <TableCell><Badge variant="outline" className={statusConfig[u.status].className}>{statusConfig[u.status].label}</Badge></TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{u.lastActive}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSelected(u)}><Eye className="h-3.5 w-3.5 mr-2" /> View Details</DropdownMenuItem>
                    <DropdownMenuItem><Mail className="h-3.5 w-3.5 mr-2" /> Send Email</DropdownMenuItem>
                    <DropdownMenuItem><ShieldCheck className="h-3.5 w-3.5 mr-2" /> Change Role</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive"><Ban className="h-3.5 w-3.5 mr-2" /> Suspend User</DropdownMenuItem>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} registered users</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", count: users.length, color: "text-primary bg-primary/10" },
          { label: "Buyers", count: users.filter((u) => u.role === "buyer").length, color: "text-blue-600 bg-blue-500/10" },
          { label: "Sellers", count: users.filter((u) => u.role === "seller").length, color: "text-purple-600 bg-purple-500/10" },
          { label: "Suspended", count: users.filter((u) => u.status === "suspended").length, color: "text-red-600 bg-red-500/10" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 space-y-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <Users className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl font-bold text-foreground">{stat.count}</div>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <Button variant="outline" size="default"><Filter className="mr-2 h-4 w-4" /> Filters</Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="buyer">Buyers</TabsTrigger>
          <TabsTrigger value="seller">Sellers</TabsTrigger>
          <TabsTrigger value="admin">Admins</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="buyer"><Card><CardContent className="pt-4">{renderTable(byRole("buyer"))}</CardContent></Card></TabsContent>
        <TabsContent value="seller"><Card><CardContent className="pt-4">{renderTable(byRole("seller"))}</CardContent></Card></TabsContent>
        <TabsContent value="admin"><Card><CardContent className="pt-4">{renderTable(byRole("admin"))}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>{selected.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Role</span><p className="font-medium text-foreground capitalize">{selected.role}</p></div>
                <div><span className="text-muted-foreground">Status</span><p className="font-medium text-foreground capitalize">{selected.status}</p></div>
                <div><span className="text-muted-foreground">Joined</span><p className="font-medium text-foreground">{selected.joined}</p></div>
                <div><span className="text-muted-foreground">Last Active</span><p className="font-medium text-foreground">{selected.lastActive}</p></div>
                <div><span className="text-muted-foreground">Total Orders</span><p className="font-medium text-foreground">{selected.orders}</p></div>
                <div><span className="text-muted-foreground">Total Value</span><p className="font-semibold text-foreground">{selected.spent}</p></div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminUsers;
