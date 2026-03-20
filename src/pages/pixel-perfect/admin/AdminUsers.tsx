import { useState, useEffect, useCallback } from "react";
import { Users, Search, Filter, ShieldCheck, Ban, MoreHorizontal, Eye, Loader2 } from "lucide-react";
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
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  inactive: { label: "Suspended", className: "bg-red-500/15 text-red-700 border-red-200" },
};

const roleConfig: Record<string, { label: string; className: string }> = {
  buyer: { label: "Buyer", className: "bg-blue-500/10 text-blue-700" },
  seller: { label: "Seller", className: "bg-purple-500/10 text-purple-700" },
  admin: { label: "Admin", className: "bg-destructive/10 text-destructive" },
};

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("users")
        .select("id, email, firstName, lastName, role, isActive, createdAt")
        .order("createdAt", { ascending: false });

      if (queryError) throw queryError;

      const mapped: User[] = (data || []).map((u: any) => ({
        id: u.id,
        name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
        email: u.email,
        role: u.role ?? "buyer",
        isActive: u.isActive !== false,
        createdAt: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
          : "—",
      }));

      setUsers(mapped);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleBlock = async (userId: string, currentlyActive: boolean) => {
    setActionLoading(userId);
    setError(null);
    try {
      const { error } = await supabase
        .from("users")
        .update({ isActive: !currentlyActive })
        .eq("id", userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentlyActive } : u));
      if (selected?.id === userId) setSelected((s) => s ? { ...s, isActive: !currentlyActive } : s);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const byRole = (role: string) => filtered.filter((u) => u.role === role);
  const suspended = filtered.filter((u) => !u.isActive);

  const renderTable = (data: User[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="hidden sm:table-cell">Joined</TableHead>
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
              <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />No users found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((u) => {
            const roleCfg = roleConfig[u.role] ?? { label: u.role, className: "bg-muted text-muted-foreground" };
            const statusKey = u.isActive ? "active" : "inactive";
            return (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell><Badge variant="outline" className={roleCfg.className}>{roleCfg.label}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{u.createdAt}</TableCell>
                <TableCell><Badge variant="outline" className={statusConfig[statusKey].className}>{statusConfig[statusKey].label}</Badge></TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={actionLoading === u.id}>
                        {actionLoading === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setSelected(u)}>
                        <Eye className="h-3.5 w-3.5 mr-2" /> View Details
                      </DropdownMenuItem>
                      {u.isActive ? (
                        <DropdownMenuItem className="text-destructive" onClick={() => toggleBlock(u.id, u.isActive)}>
                          <Ban className="h-3.5 w-3.5 mr-2" /> Suspend User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => toggleBlock(u.id, u.isActive)}>
                          <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Unsuspend User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
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

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", count: users.length, color: "text-primary bg-primary/10" },
          { label: "Buyers", count: users.filter((u) => u.role === "buyer").length, color: "text-blue-600 bg-blue-500/10" },
          { label: "Sellers", count: users.filter((u) => u.role === "seller").length, color: "text-purple-600 bg-purple-500/10" },
          { label: "Suspended", count: users.filter((u) => !u.isActive).length, color: "text-red-600 bg-red-500/10" },
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
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="buyer"><Card><CardContent className="pt-4">{renderTable(byRole("buyer"))}</CardContent></Card></TabsContent>
        <TabsContent value="seller"><Card><CardContent className="pt-4">{renderTable(byRole("seller"))}</CardContent></Card></TabsContent>
        <TabsContent value="admin"><Card><CardContent className="pt-4">{renderTable(byRole("admin"))}</CardContent></Card></TabsContent>
        <TabsContent value="suspended"><Card><CardContent className="pt-4">{renderTable(suspended)}</CardContent></Card></TabsContent>
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
                <div><span className="text-muted-foreground">Status</span><p className="font-medium text-foreground capitalize">{selected.isActive ? "Active" : "Suspended"}</p></div>
                <div><span className="text-muted-foreground">Joined</span><p className="font-medium text-foreground">{selected.createdAt}</p></div>
              </div>
              <div className="flex justify-end">
                {selected.isActive ? (
                  <Button
                    variant="destructive"
                    onClick={() => toggleBlock(selected.id, selected.isActive)}
                    disabled={actionLoading === selected.id}
                  >
                    {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
                    Suspend User
                  </Button>
                ) : (
                  <Button
                    onClick={() => toggleBlock(selected.id, selected.isActive)}
                    disabled={actionLoading === selected.id}
                  >
                    {actionLoading === selected.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                    Unsuspend User
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default AdminUsers;
