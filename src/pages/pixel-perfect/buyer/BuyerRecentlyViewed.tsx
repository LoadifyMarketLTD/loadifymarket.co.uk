import { useEffect, useState } from "react";
import { Clock3, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = { id:string; viewedAt:string; products:{id:string;title:string;price:number;images:string[]|null;isActive:boolean}|null };

export default function BuyerRecentlyViewed(){
  const {user}=useAuthStore(); const navigate=useNavigate();
  const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{ if(!user?.id)return; const load=async()=>{ setLoading(true); try { const {data}=await supabase.from("recently_viewed").select("id, viewedAt, products:productId(id,title,price,images,isActive)").eq("userId",user.id).order("viewedAt",{ascending:false}).limit(50); setRows((data??[]) as unknown as Row[]); } finally { setLoading(false); } }; void load(); },[user?.id]);
  return <div className="p-4 sm:p-6 space-y-5">
    <div><h1 className="text-2xl font-bold">Recently viewed</h1><p className="text-sm text-muted-foreground">Products you opened recently on web or mobile.</p></div>
    {loading?<p className="text-sm text-muted-foreground">Loading…</p>:rows.length===0?<Card><CardContent className="py-10 text-center"><Clock3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p>No recently viewed products yet.</p></CardContent></Card>:<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rows.map(row=>{const p=row.products;return <Card key={row.id}><CardContent className="pt-5 flex gap-3"><div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{p?.images?.[0]?<img src={p.images[0]} alt="" className="h-full w-full object-cover"/>:<Package className="m-5 h-6 w-6 text-muted-foreground"/>}</div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{p?.title??"Unavailable product"}</p><p className="text-sm font-bold">{p?`£${Number(p.price).toFixed(2)}`:"—"}</p><p className="text-xs text-muted-foreground">Viewed {new Date(row.viewedAt).toLocaleDateString("en-GB")}</p>{p?.isActive&&<Button size="sm" className="mt-2" onClick={()=>navigate(`/product/${p.id}`)}>View again</Button>}</div></CardContent></Card>})}</div>}
  </div>;
}
