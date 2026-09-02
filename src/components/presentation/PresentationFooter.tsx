import { Link } from "react-router-dom";

const groups = [
  { title: "Platform", links: [["Overview", "/platform"], ["How It Works", "/how-it-works"], ["Trust", "/trust"]] },
  { title: "For business", links: [["Buyers", "/buyers"], ["Sellers", "/sellers"], ["Trade Buyers", "/trade"], ["Suppliers & Brands", "/suppliers"]] },
  { title: "Connect", links: [["Integrations", "/integrations"], ["Partners", "/partners"], ["Developers", "/developers"], ["Contact", "/contact"]] },
  { title: "Company", links: [["About", "/about"], ["Help & FAQ", "/faq"], ["Privacy", "/privacy"], ["Terms", "/terms"]] },
] as const;

export default function PresentationFooter() {
  return (
    <footer className="border-t border-[#0A234F]/10 bg-white text-[#0A234F]">
      <div className="mx-auto max-w-[1480px] px-6 py-14 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <Link to="/" className="inline-flex items-center gap-3" aria-label="Loadify home">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A234F] text-lg font-black text-[#F5A300]">L</div>
              <div><div className="text-xl font-black tracking-[-0.03em]">Loadify</div><div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8A7351]">Market</div></div>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-[#667085]">Explore Loadify's marketplace, buyer and seller environments, business routes and controlled ways to work with the platform.</p>
            <Link to="/marketplace" className="mt-6 inline-flex rounded-lg bg-[#F5A300] px-5 py-3 text-sm font-extrabold text-[#0A234F]">Open Marketplace</Link>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {groups.map((group) => <div key={group.title}><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">{group.title}</p><div className="mt-4 grid gap-3">{group.links.map(([label,to]) => <Link key={to} to={to} className="text-sm font-semibold text-[#536174] transition hover:text-[#1D57D8]">{label}</Link>)}</div></div>)}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-[#0A234F]/10 pt-6 text-xs text-[#7A8494] sm:flex-row sm:items-center sm:justify-between"><span>© {new Date().getFullYear()} Loadify Market. All rights reserved.</span><span>Marketplace commerce and business platform.</span></div>
      </div>
    </footer>
  );
}
