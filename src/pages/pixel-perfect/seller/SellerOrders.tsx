import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface Order {
  id: string;
  orderNumber: string;
  buyerName: string;
  total: number;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  paid: "bg-blue-500/10 text-blue-700",
  packed: "bg-amber-500/10 text-amber-700",
  shipped: "bg-purple-500/10 text-purple-700",
  delivered: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-700",
  refunded: "bg-muted text-muted-foreground",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const SellerOrders = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select(`id, orderNumber, total, status, createdAt, users!orders_buyerId_fkey(firstName, lastName)`)
        .eq("sellerId", user.id)
        .order("createdAt", { ascending: false });
      const rows = (data ?? []) as Array<{
        id: string; orderNumber: string; total: number; status: string; createdAt: string;
        users?: Array<{ firstName?: string; lastName?: string }> | { firstName?: string; lastName?: string } | null;
      }>;
      setOrders(
        rows.map((o) => {
          const u = Array.isArray(o.users) ? o.users[0] : o.users;
          return {
            id: o.id,
            orderNumber: o.orderNumber,
            buyerName: u?.firstName ? `${u.firstName}${u.lastName ? " " + u.lastName : ""}` : "Buyer",
            total: o.total,
            status: o.status,
            createdAt: o.createdAt,
          };
        })
      );
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Loading…" : `${orders.length} orders total`}
        </p>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="default">
          <Filter className="mr-2 h-4 w-4" /> Filters
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Order</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Buyer</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Total</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Status</th>
                <th className="text-left text-xs font-semibold text-muted-foreground p-4">Date</th>
                <th className="text-right text-xs font-semibold text-muted-foreground p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Loading orders…</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    {search ? "No orders match your search." : "No orders yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{o.orderNumber}</td>
                    <td className="p-4 text-sm text-foreground">{o.buyerName}</td>
                    <td className="p-4 text-sm font-semibold text-foreground">£{o.total.toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[o.status] ?? "bg-muted text-muted-foreground"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{formatDate(o.createdAt)}</td>
                    <td className="p-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SellerOrders;
