import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import logo from "@/assets/LOGO.png";

const navigation = [
  { label: "Platform", to: "/platform" },
  { label: "Buyers", to: "/buyers" },
  { label: "Sellers", to: "/sellers" },
  { label: "Business", to: "/business" },
  { label: "Technology", to: "/technology" },
  { label: "Partners", to: "/partners" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Trust", to: "/trust" },
] as const;

export default function PresentationHeader() {
  const [mobile, setMobile] = useState(false);
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `text-[13px] font-bold transition ${isActive ? "text-[#1D57D8]" : "text-[#0A234F] hover:text-[#1D57D8]"}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[#0A234F]/10 bg-[#FCFBF8]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[82px] max-w-[1480px] items-center gap-7 px-6 lg:px-10">
        <Link to="/" className="mr-auto flex items-center" aria-label="Loadify home">
          <img src={logo} alt="Loadify Market" className="h-11 w-auto max-w-[170px] object-contain" />
        </Link>
        <nav className="hidden items-center gap-6 xl:flex" aria-label="Corporate navigation">
          {navigation.map((item) => <NavLink key={item.to} to={item.to} className={navClass}>{item.label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link to="/marketplace" className="rounded-lg border border-[#0A234F]/15 bg-white px-4 py-2.5 text-sm font-extrabold text-[#0A234F]">Marketplace</Link>
          <Link to="/login" className="px-3 py-2.5 text-sm font-bold text-[#0A234F]">Sign in</Link>
          <Link to="/register" className="rounded-lg bg-[#0A234F] px-4 py-2.5 text-sm font-extrabold text-white">Join Loadify</Link>
        </div>
        <button onClick={() => setMobile((value) => !value)} className="ml-1 rounded-lg p-2 text-[#0A234F] xl:hidden" aria-label={mobile ? "Close navigation" : "Open navigation"}>{mobile ? <X /> : <Menu />}</button>
      </div>
      {mobile && <div className="border-t border-[#0A234F]/10 bg-white px-6 py-5 xl:hidden"><div className="grid gap-1 sm:grid-cols-2">{navigation.map((item) => <Link onClick={() => setMobile(false)} key={item.to} to={item.to} className="rounded-lg px-3 py-3 text-sm font-bold text-[#0A234F] hover:bg-[#F8F7F4]">{item.label}</Link>)}</div><div className="mt-4 flex flex-wrap gap-2 border-t border-[#0A234F]/10 pt-4"><Link onClick={() => setMobile(false)} to="/marketplace" className="rounded-lg bg-[#F5A300] px-4 py-2.5 text-sm font-extrabold text-[#0A234F]">Marketplace</Link><Link onClick={() => setMobile(false)} to="/login" className="rounded-lg border px-4 py-2.5 text-sm font-bold">Sign in</Link><Link onClick={() => setMobile(false)} to="/register" className="rounded-lg bg-[#0A234F] px-4 py-2.5 text-sm font-extrabold text-white">Join Loadify</Link></div></div>}
    </header>
  );
}
