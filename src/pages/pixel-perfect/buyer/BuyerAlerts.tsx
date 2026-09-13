import { useEffect, useState } from "react";
import { BellRing, Package, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

type AlertRow={id:string;productId:string;priceDrop:boolean;backInStock:boolean;lastPrice:number|null;products:{id:string;title:string;price:number;images:string[]|null}|null};
export default function BuyerAlerts(){
  const {user}=useAuthStore(); const navigate=useNavigate();
  const [rows,setRows]=useState<AlertRow[]>([]); const [loading,setLoading]=useState(true);
  const load=async()=>{if(!user?.id)return;setLoading(true);const {data,error}=await supabase.from("product_alerts").select("id, productId, priceDrop, backInStock, lastPrice, products:productId(id,title,price,images)").eq("userId",user.id).order("createdAt",{ascending:false});if(error)toast({title:"Could not load alerts",description:error.message,variant:"destructive"});setRows((data??[]) as unknown as AlertRow[]);setLoading(false);};
  useEffect(()=>{const timer=window.setTimeout(()=>{void load();},0);return()=>window.clearTimeout(timer);},[user?.id]);
  const update=async(row:AlertRow,patch:Partial<AlertRow>)=>{const {error}=await supabase.from("product_alerts").update(patch).eq("id",row.id).eq("userId",user?.id??"");if(error){toast({title:"Update failed",description:error.message,variant:"destructive"});return;}setRows(x=>x.map(a=>a.id===row.id?{...a,...patch}:a));};
  const remove=async(row:AlertRow)=>{const {error}=await supabase.from("product_alerts").delete().eq("id",row.id).eq("userId",user?.id??"");if(error){toast({title:"Delete failed",description:error.message,variant:"destructive"});return;}setRows(x=>x.filter(a=>a.id!==row.id));};
  return <div className="p-4 sm:p-6 space-y-5"><div><h1 className="text-2xl font-bold">Product alerts</h1><p className="text-sm text-muted-foreground">Price-drop and back-in-stock notifications.</p></div>{loading?<p className="text-sm text-muted-foreground">Loading…</p>:rows.length===0?<Card><CardContent className="py-10 text-center"><BellRing className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p>No product alerts yet.</p></CardContent></Card>:<div className="grid gap-3">{rows.map(row=><Card key={row.id}><CardContent className="pt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="h-14 w-14 overflow-hidden rounded-lg bg-muted">{row.products?.images?.[0]?<img src={row.products.images[0]} alt="" className="h-full w-full object-cover"/>:<Package className="m-4 h-6 w-6"/>}</div><button className="min-w-0 text-left" onClick={()=>row.products&&navigate(`/product/${row.products.id}`)}><p className="truncate font-semibold">{row.products?.title??"Product"}</p><p className="text-sm text-muted-foreground">£{Number(row.products?.price??row.lastPrice??0).toFixed(2)}</p></button></div><label className="flex items-center gap-2 text-xs"><Switch checked={row.priceDrop} onCheckedChange={v=>void update(row,{priceDrop:v})}/>Price drop</label><label className="flex items-center gap-2 text-xs"><Switch checked={row.backInStock} onCheckedChange={v=>void update(row,{backInStock:v})}/>Back in stock</label><Button variant="ghost" size="icon" onClick={()=>void remove(row)}><Trash2 className="h-4 w-4"/></Button></CardContent></Card>)}</div>}</div>;
}

