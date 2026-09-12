import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type Coupon = { id:string; code:string; discountType:string; discountValue:number; minOrderAmount:number; maxUses:number|null; usedCount:number; startsAt:string; expiresAt:string|null; isActive:boolean };

export default function SellerCoupons(){
  const { user } = useAuthStore();
  const [rows,setRows]=useState<Coupon[]>([]);
  const [code,setCode]=useState(""); const [discountType,setDiscountType]=useState("percentage"); const [value,setValue]=useState("10"); const [minOrder,setMinOrder]=useState("0"); const [saving,setSaving]=useState(false);
  const load=async()=>{ if(!user) return; const {data,error}=await supabase.from("coupons").select("id, code, discountType, discountValue, minOrderAmount, maxUses, usedCount, startsAt, expiresAt, isActive").eq("createdBy",user.id).order("createdAt",{ascending:false}); if(error){toast({title:"Could not load coupons",description:error.message,variant:"destructive"});return;} setRows((data??[]) as Coupon[]); };
  useEffect(()=>{void load();},[user?.id]);
  const createCoupon=async()=>{ if(!user||!code.trim()) return; const amount=Number(value); if(!Number.isFinite(amount)||amount<=0||(discountType==="percentage"&&amount>100)){toast({title:"Invalid discount",variant:"destructive"});return;} setSaving(true); try{ const {error}=await supabase.from("coupons").insert({code:code.trim().toUpperCase(),createdBy:user.id,sellerId:user.id,discountType,discountValue:amount,minOrderAmount:Number(minOrder)||0,isActive:true,appliesTo:"specific_sellers"}); if(error) throw error; setCode(""); await load(); toast({title:"Coupon created"}); }catch(e){toast({title:"Could not create coupon",description:(e as Error).message,variant:"destructive"});}finally{setSaving(false);} };
  const toggle=async(c:Coupon)=>{const {error}=await supabase.from("coupons").update({isActive:!c.isActive}).eq("id",c.id).eq("createdBy",user?.id); if(error) toast({title:"Update failed",description:error.message,variant:"destructive"}); else void load();};
  return <div className="p-4 sm:p-6 space-y-6"><div><h1 className="text-2xl font-bold">Coupons</h1><p className="text-sm text-muted-foreground">Create seller-specific promo codes for checkout.</p></div>
    <Card><CardHeader><CardTitle className="text-base">New coupon</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-5"><Input placeholder="CODE" value={code} onChange={e=>setCode(e.target.value)} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={discountType} onChange={e=>setDiscountType(e.target.value)}><option value="percentage">Percentage</option><option value="fixed_amount">Fixed amount</option><option value="free_shipping">Free shipping</option></select><Input type="number" min="0" value={value} onChange={e=>setValue(e.target.value)} placeholder="Value"/><Input type="number" min="0" value={minOrder} onChange={e=>setMinOrder(e.target.value)} placeholder="Minimum order"/><Button onClick={createCoupon} disabled={saving}>{saving?"Creatingâ€¦":"Create"}</Button></CardContent></Card>
    <div className="space-y-3">{rows.length===0?<Card><CardContent className="py-8 text-center text-muted-foreground">No coupons yet.</CardContent></Card>:rows.map(c=><Card key={c.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 py-4"><div><div className="font-bold">{c.code}</div><div className="text-sm text-muted-foreground">{c.discountType==="percentage"?`${c.discountValue}%`:c.discountType==="fixed_amount"?`Â£${c.discountValue.toFixed(2)}`:"Free shipping"} Â· used {c.usedCount}{c.maxUses?`/${c.maxUses}`:""}</div></div><Button variant={c.isActive?"outline":"default"} onClick={()=>toggle(c)}>{c.isActive?"Deactivate":"Activate"}</Button></CardContent></Card>)}</div>
  </div>;
}
