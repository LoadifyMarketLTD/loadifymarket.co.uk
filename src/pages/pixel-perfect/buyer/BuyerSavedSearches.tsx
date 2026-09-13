import { useEffect, useState } from "react";
import { Bell, BellOff, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SavedSearch = { id:string; searchQuery:string; filters:Record<string,unknown>|null; emailNotifications:boolean; notificationFrequency:string; createdAt:string };

export default function BuyerSavedSearches() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [rows,setRows] = useState<SavedSearch[]>([]);
  const [loading,setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const {data,error}=await supabase.from("saved_searches").select("id, searchQuery, filters, emailNotifications, notificationFrequency, createdAt").eq("userId",user.id).order("createdAt",{ascending:false});
    if (error) toast({title:"Could not load saved searches",description:error.message,variant:"destructive"});
    setRows((data??[]) as SavedSearch[]); setLoading(false);
  };
  useEffect(()=>{const timer=window.setTimeout(()=>{void load();},0);return()=>window.clearTimeout(timer);},[user?.id]);

  const toggle = async (row:SavedSearch) => {
    const next=!row.emailNotifications;
    const {error}=await supabase.from("saved_searches").update({emailNotifications:next}).eq("id",row.id).eq("userId",user?.id??"");
    if(error){toast({title:"Update failed",description:error.message,variant:"destructive"});return;}
    setRows(x=>x.map(r=>r.id===row.id?{...r,emailNotifications:next}:r));
  };

  const remove = async (row:SavedSearch) => {
    const {error}=await supabase.from("saved_searches").delete().eq("id",row.id).eq("userId",user?.id??"");
    if(error){toast({title:"Delete failed",description:error.message,variant:"destructive"});return;}
    setRows(x=>x.filter(r=>r.id!==row.id));
  };

  const open = (row:SavedSearch) => {
    const params=new URLSearchParams();
    if(row.searchQuery) params.set("q",row.searchQuery);
    const f=row.filters??{};
    if(typeof f.category==="string") params.set("category",f.category);
    if(typeof f.filter==="string") params.set("filter",f.filter);
    navigate(`/catalog?${params.toString()}`);
  };

  return <div className="p-4 sm:p-6 space-y-5">
    <div><h1 className="text-2xl font-bold">Saved searches</h1><p className="text-sm text-muted-foreground">Re-run searches and control new-listing alerts.</p></div>
    {loading?<p className="text-sm text-muted-foreground">Loading…</p>:rows.length===0?<Card><CardContent className="py-10 text-center"><Search className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="font-medium">No saved searches yet</p><p className="mt-1 text-sm text-muted-foreground">Search the catalog and use “Save search”.</p></CardContent></Card>:<div className="grid gap-3">{rows.map(row=><Card key={row.id}><CardContent className="pt-5 flex flex-col gap-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-semibold truncate">{row.searchQuery||"Catalog search"}</p><p className="text-xs text-muted-foreground">{row.notificationFrequency} notifications · saved {new Date(row.createdAt).toLocaleDateString("en-GB")}</p></div><div className="flex gap-2"><Button size="sm" onClick={()=>open(row)}>Search</Button><Button size="sm" variant="outline" onClick={()=>void toggle(row)}>{row.emailNotifications?<Bell className="mr-1 h-4 w-4"/>:<BellOff className="mr-1 h-4 w-4"/>}{row.emailNotifications?"Alerts on":"Alerts off"}</Button><Button size="icon" variant="ghost" aria-label="Delete saved search" onClick={()=>void remove(row)}><Trash2 className="h-4 w-4"/></Button></div></CardContent></Card>)}</div>}
  </div>;
}

