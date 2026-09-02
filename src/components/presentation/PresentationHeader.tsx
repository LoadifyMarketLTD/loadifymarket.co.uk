import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import logo from "@/assets/LOGO.png";

const direct = [{label:"Platform",to:"/platform"},{label:"Buyers",to:"/buyers"},{label:"Sellers",to:"/sellers"},{label:"Partners",to:"/partners"},{label:"How It Works",to:"/how-it-works"},{label:"Trust",to:"/trust"}] as const;

export default function PresentationHeader(){
 const [business,setBusiness]=useState(false); const [technology,setTechnology]=useState(false); const [mobile,setMobile]=useState(false);
 const navClass=({isActive}:{isActive:boolean})=>`text-[13px] font-bold transition ${isActive?'text-[#1D57D8]':'text-[#0A234F] hover:text-[#1D57D8]'}`;
 return <header className="fixed inset-x-0 top-0 z-50 border-b border-[#0A234F]/10 bg-[#FCFBF8]/95 backdrop-blur-xl">
  <div className="mx-auto flex h-[82px] max-w-[1480px] items-center gap-7 px-6 lg:px-10">
   <Link to="/" className="mr-auto flex items-center" aria-label="Loadify home"><img src={logo} alt="Loadify Market" className="h-11 w-auto max-w-[170px] object-contain" /></Link>
   <nav className="hidden items-center gap-6 xl:flex" aria-label="Corporate navigation">
    {direct.slice(0,3).map(x=><NavLink key={x.to} to={x.to} className={navClass}>{x.label}</NavLink>)}
    <div className="relative"><button onClick={()=>{setBusiness(v=>!v);setTechnology(false)}} className="flex items-center gap-1 text-[13px] font-bold text-[#0A234F]">Business <ChevronDown className="h-3.5 w-3.5"/></button>{business&&<div className="absolute left-0 top-8 w-64 rounded-2xl border border-[#0A234F]/10 bg-white p-2 shadow-xl"><Link onClick={()=>setBusiness(false)} to="/trade" className="block rounded-xl px-4 py-3 hover:bg-[#F8F7F4]"><b className="text-sm">Trade Buyers</b><p className="mt-1 text-xs text-[#667085]">Business buying through Loadify</p></Link><Link onClick={()=>setBusiness(false)} to="/suppliers" className="block rounded-xl px-4 py-3 hover:bg-[#F8F7F4]"><b className="text-sm">Suppliers & Brands</b><p className="mt-1 text-xs text-[#667085]">Explore participation paths</p></Link></div>}</div>
    <div className="relative"><button onClick={()=>{setTechnology(v=>!v);setBusiness(false)}} className="flex items-center gap-1 text-[13px] font-bold text-[#0A234F]">Technology <ChevronDown className="h-3.5 w-3.5"/></button>{technology&&<div className="absolute left-0 top-8 w-64 rounded-2xl border border-[#0A234F]/10 bg-white p-2 shadow-xl"><Link onClick={()=>setTechnology(false)} to="/integrations" className="block rounded-xl px-4 py-3 hover:bg-[#F8F7F4]"><b className="text-sm">Integrations</b><p className="mt-1 text-xs text-[#667085]">Controlled connectivity paths</p></Link><Link onClick={()=>setTechnology(false)} to="/developers" className="block rounded-xl px-4 py-3 hover:bg-[#F8F7F4]"><b className="text-sm">Developers</b><p className="mt-1 text-xs text-[#667085]">Technical participation context</p></Link></div>}</div>
    {direct.slice(3).map(x=><NavLink key={x.to} to={x.to} className={navClass}>{x.label}</NavLink>)}
   </nav>
   <div className="hidden items-center gap-2 md:flex"><Link to="/marketplace" className="rounded-lg border border-[#0A234F]/15 bg-white px-4 py-2.5 text-sm font-extrabold text-[#0A234F]">Marketplace</Link><Link to="/login" className="px-3 py-2.5 text-sm font-bold text-[#0A234F]">Sign in</Link><Link to="/register" className="rounded-lg bg-[#0A234F] px-4 py-2.5 text-sm font-extrabold text-white">Join Loadify</Link></div>
   <button onClick={()=>setMobile(v=>!v)} className="ml-1 rounded-lg p-2 text-[#0A234F] xl:hidden" aria-label="Open navigation">{mobile?<X/>:<Menu/>}</button>
  </div>
  {mobile&&<div className="border-t border-[#0A234F]/10 bg-white px-6 py-5 xl:hidden"><div className="grid gap-1 sm:grid-cols-2">{[...direct,{label:"Trade Buyers",to:"/trade"},{label:"Suppliers & Brands",to:"/suppliers"},{label:"Integrations",to:"/integrations"},{label:"Developers",to:"/developers"}].map(x=><Link onClick={()=>setMobile(false)} key={x.to} to={x.to} className="rounded-lg px-3 py-3 text-sm font-bold text-[#0A234F] hover:bg-[#F8F7F4]">{x.label}</Link>)}</div><div className="mt-4 flex gap-2 border-t border-[#0A234F]/10 pt-4"><Link to="/marketplace" className="rounded-lg bg-[#F5A300] px-4 py-2.5 text-sm font-extrabold text-[#0A234F]">Marketplace</Link><Link to="/login" className="rounded-lg border px-4 py-2.5 text-sm font-bold">Sign in</Link></div></div>}
 </header>
}
