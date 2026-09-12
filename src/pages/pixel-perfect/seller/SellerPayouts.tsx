import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, PoundSterling, ReceiptText, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { openExternalUrl } from "@/lib/capacitorUtils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Balance = { availableAmount:number; pendingAmount:number; totalEarned:number; currency:string };
type RequestRow = { id:string; amount:number; currency:string; status:string; notes:string|null; createdAt:string; paidAt:string|null };
type PayoutRow = { id:string; amount:number; currency:string; status:string; reference:string|null; notes:string|null; paidAt:string|null; createdAt:string };
type OrderRow = { total:number; commission:number; status:string };

export default function SellerPayouts() {
  const { user } = useAuthStore();
  const [balance,setBalance] = useState<Balance>({availableAmount:0,pendingAmount:0,totalEarned:0,currency:"GBP"});
  const [requests,setRequests] = useState<RequestRow[]>([]);
  const [payouts,setPayouts] = useState<PayoutRow[]>([]);
  const [orders,setOrders] = useState<OrderRow[]>([]);
  const [connectStatus,setConnectStatus] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [requesting,setRequesting] = useState(false);
  const [dashboardLoading,setDashboardLoading] = useState(false);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [b,r,p,o,s] = await Promise.all([
      supabase.from("seller_balance").select("availableAmount, pendingAmount, totalEarned, currency").eq("sellerId",user.id).maybeSingle(),
      supabase.from("payout_requests").select("id, amount, currency, status, notes, createdAt, paidAt").eq("sellerId",user.id).order("createdAt",{ascending:false}),
      supabase.from("payouts").select("id, amount, currency, status, reference, notes, paidAt, createdAt").eq("sellerId",user.id).order("createdAt",{ascending:false}),
      supabase.from("orders").select("total, commission, status").eq("sellerId",user.id),
      supabase.from("seller_profiles").select("stripeConnectStatus").eq("userId",user.id).maybeSingle(),
    ]);
    if (b.data) setBalance({availableAmount:Number(b.data.availableAmount||0),pendingAmount:Number(b.data.pendingAmount||0),totalEarned:Number(b.data.totalEarned||0),currency:b.data.currency||"GBP"});
    setRequests((r.data??[]) as RequestRow[]); setPayouts((p.data??[]) as PayoutRow[]); setOrders((o.data??[]) as OrderRow[]);
    setConnectStatus(s.data?.stripeConnectStatus ?? null); setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);
  const summary = useMemo(() => ({
    fees: orders.filter(o => !["cancelled","refunded"].includes(o.status)).reduce((n,o)=>n+Number(o.commission||0),0),
    refunds: orders.filter(o => o.status === "refunded").reduce((n,o)=>n+Number(o.total||0),0),
    paid: payouts.filter(p => p.status === "paid").reduce((n,p)=>n+Number(p.amount||0),0),
    next: requests.find(r => ["requested","approved"].includes(r.status)) ?? null,
  }), [orders,payouts,requests]);

  const requestPayout = async () => {
    if (balance.availableAmount <= 0) return;
    setRequesting(true);
    try {
      const { error } = await supabase.rpc("request_payout", { p_amount: balance.availableAmount });
      if (error) throw error;
      toast({ title:"Payout requested", description:`£${balance.availableAmount.toFixed(2)} moved to pending.` });
      await load();
    } catch (e) { toast({title:"Payout request failed",description:(e as Error).message,variant:"destructive"}); }
    finally { setRequesting(false); }
  };

  const openStripe = async () => {
    setDashboardLoading(true);
    try {
      const res = await authorizedFetch("/.netlify/functions/connect-dashboard",{method:"POST"});
      const body = await res.json() as {url?:string;error?:string};
      if (!res.ok || !body.url) throw new Error(body.error || "Stripe dashboard unavailable");
      await openExternalUrl(body.url);
    } catch (e) { toast({title:"Could not open Stripe",description:(e as Error).message,variant:"destructive"}); }
    finally { setDashboardLoading(false); }
  };

  const cards = [
    ["Available",balance.availableAmount,WalletCards], ["Pending",balance.pendingAmount,PoundSterling],
    ["Total earned",balance.totalEarned,ReceiptText], ["Paid out",summary.paid,PoundSterling],
    ["Platform fees",summary.fees,ReceiptText], ["Refunded orders",summary.refunds,ReceiptText],
  ] as const;

  return <div className="p-4 sm:p-6 space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold">Seller Payouts</h1><p className="text-sm text-muted-foreground">Balance, requests, fees, refunds and payout history.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => void openStripe()} disabled={dashboardLoading || connectStatus !== "active"}>{dashboardLoading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<ExternalLink className="mr-2 h-4 w-4"/>}Stripe dashboard</Button><Button onClick={() => void requestPayout()} disabled={requesting || balance.availableAmount<=0}>{requesting&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Request payout</Button></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value,Icon])=><Card key={label}><CardContent className="pt-5 flex items-center gap-4"><Icon className="h-5 w-5 text-primary"/><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{loading?"…":`£${Number(value).toFixed(2)}`}</p></div></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle className="text-base">Expected payout</CardTitle></CardHeader><CardContent>{summary.next?<div><p className="font-semibold">£{Number(summary.next.amount).toFixed(2)} · {summary.next.status}</p><p className="text-sm text-muted-foreground">Requested {new Date(summary.next.createdAt).toLocaleDateString("en-GB")}. Timing depends on approval and Stripe settlement.</p></div>:<p className="text-sm text-muted-foreground">No payout is currently pending.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">Payout history</CardTitle></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Date</th><th>Amount</th><th>Status</th><th>Reference</th></tr></thead><tbody>{payouts.length===0?<tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No payouts yet.</td></tr>:payouts.map(p=><tr key={p.id} className="border-b last:border-0"><td className="py-3">{new Date(p.paidAt||p.createdAt).toLocaleDateString("en-GB")}</td><td className="font-semibold">£{Number(p.amount).toFixed(2)}</td><td className="capitalize">{p.status}</td><td className="font-mono text-xs">{p.reference||"—"}</td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
