import { Link } from "react-router-dom";
import logo from "../../../LOADIFY_MARKET_Master_Vector_WhiteGold.svg";

const groups = [
  { title: "Platform", links: [["Overview", "/platform"], ["Buyers", "/buyers"], ["Sellers", "/sellers"], ["How It Works", "/how-it-works"], ["Trust", "/trust"]] },
  { title: "Business", links: [["Overview", "/business"], ["Trade Buyers", "/trade"], ["Suppliers, Brands & Wholesalers", "/suppliers"], ["Partners", "/partners"]] },
  { title: "Technology", links: [["Overview", "/technology"], ["Integrations", "/integrations"], ["Developers", "/developers"]] },
  { title: "Company", links: [["About", "/about"], ["Help & FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
] as const;

export default function PresentationFooter() {
  return (
    <footer className="bg-[#F8F7F4] px-4 pb-5 pt-2 text-white sm:px-6 sm:pb-7 lg:px-10">
      <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[28px] bg-[#0A234F] shadow-[0_24px_70px_rgba(10,35,79,0.16)]">
        <div className="grid gap-10 px-6 py-12 sm:px-8 lg:grid-cols-[1.15fr_2fr] lg:px-10 lg:py-14">
          <div>
            <Link to="/" className="inline-flex items-center" aria-label="Loadify home">
              <img src={logo} alt="Loadify Market" className="h-12 w-auto max-w-[205px] object-contain" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">Explore Loadify's marketplace, buyer and seller environments, business routes and controlled ways to work with the platform.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/marketplace" className="inline-flex rounded-lg bg-[#F5A300] px-5 py-3 text-sm font-extrabold text-[#0A234F]">Open Marketplace</Link>
              <Link to="/register?type=seller" className="inline-flex rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/10">Start Selling</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {groups.map((group) => <div key={group.title}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{group.title}</p><div className="mt-4 grid gap-3">{group.links.map(([label,to]) => <Link key={to} to={to} className="text-sm font-semibold text-white/72 transition hover:text-white">{label}</Link>)}</div></div>)}
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><span>© {new Date().getFullYear()} Loadify Market. All rights reserved.</span><span>Marketplace commerce and business platform.</span></div>
      </div>
    </footer>
  );
}
