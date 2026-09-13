import { useEffect, useMemo, useState } from "react";
import { BarChart3, Eye, Package, PoundSterling, RotateCcw, ShoppingCart, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrderRow = { id:string; productId:string; total:number; commission:number; status:string; createdAt:string };
type ProductRow = { id:string; title:string; views:number; addToCartCount:number };
type ReturnRow = { id:string; orderId:string; createdAt:string };
const SALE_STATUSES = new Set(["paid","packed","shipped","delivered","completed"]);

export default function SellerAnalytics() {
  const { user } = useAuthStore();
  const [days, setDays] = useState("30");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const loadingTimer = window.setTimeout(() => setLoading(true), 0);
    void Promise.all([
      supabase.from("orders").select("id, productId, total, commission, status, createdAt").eq("sellerId", user.id),
      supabase.from("products").select("id, title, views, addToCartCount").eq("sellerId", user.id),
      supabase.from("returns").select("id, orderId, createdAt").eq("sellerId", user.id),
    ]).then(([o,p,r]) => {
      setOrders((o.data ?? []) as OrderRow[]);
      setProducts((p.data ?? []) as ProductRow[]);
      setReturns((r.data ?? []) as ReturnRow[]);
    }).finally(() => setLoading(false));
    return () => window.clearTimeout(loadingTimer);
  }, [user?.id]);

  const periodEnd = useMemo(() => new Date().getTime(), [days]);

  const metrics = useMemo(() => {
    const cutoff = periodEnd - Number(days) * 86400000;
    const periodOrders = orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    const recognised = periodOrders.filter((o) => SALE_STATUSES.has(o.status));
    const grossSales = recognised.reduce((sum,o) => sum + Number(o.total || 0), 0);
    const netRevenue = recognised.reduce((sum,o) => sum + Number(o.total || 0) - Number(o.commission || 0), 0);
    const views = products.reduce((sum,p) => sum + Number(p.views || 0), 0);
    const conversion = views > 0 ? (recognised.length / views) * 100 : 0;
    const periodOrderIds = new Set(periodOrders.map((o) => o.id));
    const returnCount = returns.filter((r) => periodOrderIds.has(r.orderId)).length;
    const productById = new Map(products.map((p) => [p.id,p]));
    const grouped = new Map<string,{ orders:number; sales:number }>();
    recognised.forEach((o) => {
      const current = grouped.get(o.productId) ?? { orders:0, sales:0 };
      current.orders += 1; current.sales += Number(o.total || 0); grouped.set(o.productId,current);
    });
    const topProducts = [...grouped.entries()].map(([id,value]) => ({
      id, title: productById.get(id)?.title ?? "Product", views: productById.get(id)?.views ?? 0, ...value,
    })).sort((a,b) => b.sales-a.sales).slice(0,8);
    return { grossSales, netRevenue, orderCount: recognised.length, views, conversion, returnCount, topProducts };
  }, [days, orders, products, returns, periodEnd]);

  const cards = [
    { label:"Gross sales", value:`£${metrics.grossSales.toFixed(2)}`, icon:PoundSterling },
    { label:"Net revenue", value:`£${metrics.netRevenue.toFixed(2)}`, icon:TrendingUp },
    { label:"Orders", value:String(metrics.orderCount), icon:ShoppingCart },
    { label:"Product views", value:String(metrics.views), icon:Eye },
    { label:"Conversion", value:`${metrics.conversion.toFixed(2)}%`, icon:BarChart3 },
    { label:"Returns", value:String(metrics.returnCount), icon:RotateCcw },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Seller Analytics</h1><p className="text-sm text-muted-foreground">Sales, revenue, traffic and product performance.</p></div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="7">Last 7 days</SelectItem><SelectItem value="30">Last 30 days</SelectItem><SelectItem value="90">Last 90 days</SelectItem><SelectItem value="365">Last 12 months</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({label,value,icon:Icon}) => <Card key={label}><CardContent className="pt-5 flex items-center gap-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary" /></span><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{loading ? "…" : value}</p></div></CardContent></Card>)}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" />Top products</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Product</th><th>Orders</th><th>Sales</th><th>Views</th><th>Conversion</th></tr></thead><tbody>
            {metrics.topProducts.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No sales in this period.</td></tr> : metrics.topProducts.map((p) => <tr key={p.id} className="border-b last:border-0"><td className="py-3 font-medium">{p.title}</td><td>{p.orders}</td><td>£{p.sales.toFixed(2)}</td><td>{p.views}</td><td>{p.views > 0 ? `${((p.orders/p.views)*100).toFixed(2)}%` : "0.00%"}</td></tr>)}
          </tbody></table>
        </CardContent>
      </Card>
    </div>
  );
}



