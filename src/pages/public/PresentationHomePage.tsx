import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, Database, Network, PackageCheck, PackageSearch, ShieldCheck, Sparkles, Store, Users } from "lucide-react";
import SEO from "@/components/SEO";
import PresentationLayout from "@/layouts/PresentationLayout";

const paths = [
  { icon: PackageSearch, eyebrow: "BUY", title: "Buy through Loadify", copy: "Discover marketplace listings and supplier-fulfilled products, purchase through supported checkout paths and manage activity through Buyer Space.", to: "/buyers", cta: "Explore buyers" },
  { icon: Store, eyebrow: "SELL", title: "Sell through Loadify", copy: "Independent sellers can create listings and manage marketplace orders, shipments, returns and account activity through Seller Space.", to: "/sellers", cta: "Explore sellers" },
  { icon: Building2, eyebrow: "SUPPLY", title: "Supply products to Loadify", copy: "Manufacturers, importers, wholesalers and distributors can discuss a direct supplier route built around controlled catalogue ingestion and supplier fulfilment.", to: "/suppliers", cta: "Explore suppliers" },
  { icon: Network, eyebrow: "CONNECT", title: "Connect commerce systems", copy: "Supplier platforms and authorised technology partners can discuss capability-scoped integration paths with evidence before activation.", to: "/integrations", cta: "Explore integrations" },
] as const;

const lifecycle = [
  ["01", "Discover", "Find products through marketplace search, categories and product pages."],
  ["02", "Evaluate", "Review product, commercial and fulfilment information before making a purchase decision."],
  ["03", "Purchase", "Complete the supported checkout path for that product and commercial model."],
  ["04", "Fulfil", "The responsible seller or approved fulfilment supplier dispatches the order."],
  ["05", "Track", "Follow shipment and order progress where tracking information is available."],
  ["06", "Manage", "Use buyer and seller workspaces for the activity that continues after checkout."],
] as const;

const supplierFlow = [
  ["SOURCE", "API, JSON, CSV, XML, feed URL, SFTP or manual catalogue"],
  ["NORMALISE", "Create canonical product and offer data without publishing raw supplier payloads"],
  ["EVIDENCE", "Verify product facts, media rights, compliance, price and stock readiness"],
  ["AI DRAFT", "AI Product Builder assists merchandising copy from governed source data"],
  ["REVIEW", "Human approval remains required before buyer-facing publication"],
  ["PUBLISH", "Only eligible products progress to the marketplace and live checkout revalidation"],
] as const;

const platformMap = [
  ["Marketplace", "Discovery, product pages and supported checkout"],
  ["Buyer Space", "Orders, account activity and support paths"],
  ["Seller Space", "Listings, orders, shipments and returns"],
  ["Supplier Hub", "Direct supplier onboarding, ingestion and governed fulfilment"],
  ["Technology", "Supplier Foundation, AI Product Builder and controlled integrations"],
  ["Trust", "Evidence, compliance, rights and readiness gates"],
] as const;

export default function PresentationHomePage() {
  return (
    <PresentationLayout>
      <SEO title="Loadify Market | Marketplace, Supplier Commerce & Business Platform" description="Loadify Market connects buyers, independent sellers and controlled supplier commerce with governed product data, supplier fulfilment and evidence-led technology." canonical="/" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="relative overflow-hidden border-b border-[#0A234F]/10 pt-[82px]">
          <div className="pointer-events-none absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-[#1D57D8]/[0.075] blur-3xl" aria-hidden="true" />
          <div className="mx-auto grid min-h-[700px] w-full min-w-0 max-w-[1480px] items-center gap-14 px-6 py-16 lg:grid-cols-12 lg:px-10 lg:py-20">
            <div className="relative min-w-0 lg:col-span-7">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8A7351]">Marketplace · Seller Commerce · Supplier Hub</p>
              <h1 className="mt-5 max-w-[920px] break-words font-serif text-[2.65rem] font-normal leading-[0.98] tracking-[-0.045em] text-[#0A234F] sm:text-[4.4rem] lg:text-[5.25rem]">One marketplace. Multiple supply routes. Clear responsibility.</h1>
              <p className="mt-7 max-w-[780px] text-[17px] leading-8 text-[#5A6578] sm:text-[19px]">Loadify connects marketplace buying and independent selling with a governed supplier route for product data, commercial readiness and fulfilment. Supplier stock stays with the responsible supplier; Loadify does not operate a warehouse.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link to="/marketplace" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#071A3C] sm:w-auto">Open Marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/suppliers" className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-extrabold text-[#0A234F] transition hover:border-[#0A234F]/25 sm:w-auto">Explore Supplier Hub</Link></div>
              <div className="mt-10 grid max-w-[820px] gap-3 border-t border-[#0A234F]/10 pt-6 sm:grid-cols-3">{["Independent seller marketplace", "Direct supplier route", "Evidence before publication"].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-bold text-[#536174]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#8A7351]" aria-hidden="true" />{item}</div>)}</div>
            </div>
            <div className="relative min-w-0 lg:col-span-5">
              <div className="rounded-[30px] bg-[#0A234F] p-8 text-white shadow-[0_28px_80px_rgba(10,35,79,0.16)]">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-5"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">LOADIFY PLATFORM MAP</p><h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">Commerce roles stay connected without being blurred together.</h2></div><span className="rounded-full bg-[#F5A300] px-3 py-1 text-[10px] font-black text-[#0A234F]">LOADIFY</span></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">{platformMap.map(([title, copy]) => <div key={title} className="rounded-[18px] border border-white/10 bg-white/[0.055] p-4"><p className="font-serif text-xl font-normal leading-tight text-white">{title}</p><p className="mt-2 text-[12px] leading-5 text-white/70">{copy}</p></div>)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20"><div className="mx-auto max-w-[1480px] px-6 lg:px-10"><div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Start with your role</p><h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">Buy, sell, supply or connect.</h2></div><p className="max-w-2xl text-[16px] leading-8 text-[#667085] lg:justify-self-end">Loadify uses separate operating paths for buyers, marketplace sellers, product suppliers and technology relationships so the correct commercial and operational rules can be applied to each.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2">{paths.map(({ icon: Icon, eyebrow, title, copy, to, cta }) => <Link key={title} to={to} className="group rounded-[24px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)] transition hover:-translate-y-0.5 hover:bg-[#071A3C] hover:shadow-[0_22px_56px_rgba(10,35,79,0.18)]"><Icon className="h-7 w-7 text-[#F5A300]" aria-hidden="true" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl">{title}</h3><p className="mt-5 max-w-xl text-[15px] leading-7 text-white/80">{copy}</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">{cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span></Link>)}</div></div></section>

        <section className="border-y border-[#0A234F]/10 bg-[#F7F9FC] py-20">
          <div className="mx-auto max-w-[1480px] px-6 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Supplier Foundation + AI Product Builder</p><h2 className="mt-3 max-w-3xl font-serif text-4xl tracking-[-0.03em] sm:text-5xl">From supplier data to a buyer-ready product, without skipping governance.</h2></div><p className="max-w-2xl text-[15px] leading-7 text-[#667085] lg:justify-self-end">The supplier path is designed to accept multiple catalogue transports while keeping product identity, facts, image rights, compliance, stock and pricing separate from AI-generated merchandising content.</p></div>
            <div className="mt-12 grid gap-4 lg:grid-cols-6">{supplierFlow.map(([step, copy], index) => <article key={step} className="rounded-[22px] border border-[#0A234F]/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,35,79,0.07)]"><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[0.16em] text-[#8A7351]">{String(index + 1).padStart(2, "0")}</span>{index === 2 ? <ShieldCheck className="h-5 w-5 text-[#1D57D8]" /> : index === 3 ? <Sparkles className="h-5 w-5 text-[#1D57D8]" /> : index === 1 ? <Database className="h-5 w-5 text-[#1D57D8]" /> : <PackageCheck className="h-5 w-5 text-[#1D57D8]" />}</div><h3 className="mt-5 text-sm font-black tracking-[0.04em] text-[#0A234F]">{step}</h3><p className="mt-3 text-[13px] leading-6 text-[#667085]">{copy}</p></article>)}</div>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/suppliers" className="rounded-lg bg-[#0A234F] px-5 py-3 text-sm font-extrabold text-white">Supplier participation</Link><Link to="/technology#ai-product-builder" className="rounded-lg border border-[#0A234F]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#0A234F]">AI Product Builder</Link><Link to="/integrations" className="rounded-lg border border-[#0A234F]/15 bg-white px-5 py-3 text-sm font-extrabold text-[#0A234F]">Integration model</Link></div>
          </div>
        </section>

        <section className="border-b border-[#0A234F]/10 bg-[#F8F7F4] py-20"><div className="mx-auto grid max-w-[1480px] gap-12 px-6 lg:grid-cols-12 lg:px-10"><div className="lg:col-span-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">How commerce moves</p><h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">From discovery to ongoing account management.</h2><p className="mt-5 max-w-xl text-[15px] leading-7 text-[#667085]">Buyer-facing commerce stays connected while seller and supplier fulfilment responsibilities remain explicit underneath it.</p><Link to="/how-it-works" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">See how Loadify works <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div><div className="lg:col-span-7"><div className="overflow-hidden rounded-[26px] bg-[#0A234F] text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]">{lifecycle.map(([step, title, copy]) => <div key={step} className="grid gap-2 border-b border-white/10 px-6 py-5 last:border-0 sm:grid-cols-[52px_130px_1fr] sm:items-start"><span className="text-[11px] font-black text-[#F5A300]">{step}</span><span className="font-serif text-xl font-normal leading-tight text-white">{title}</span><span className="text-sm leading-6 text-white/75">{copy}</span></div>)}</div></div></div></section>

        <section className="bg-white py-20"><div className="mx-auto grid max-w-[1480px] gap-6 px-6 lg:grid-cols-3 lg:px-10"><div className="rounded-[26px] bg-[#0A234F] p-8 text-white lg:col-span-2 shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">SUPPLIERS, PARTNERS & TECHNOLOGY</p><h2 className="mt-4 max-w-3xl font-serif text-4xl font-normal tracking-[-0.03em] text-white">Clear routes for organisations that want to work with Loadify.</h2><p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/80">Direct supplier participation, commercial partnerships and technology connectivity are separate conversations. Each starts with the operating model and evidence required for the capability being discussed.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/suppliers" className="rounded-lg bg-[#F5A300] px-5 py-3 text-sm font-extrabold text-[#0A234F]">Suppliers</Link><Link to="/integrations" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white">Integrations</Link><Link to="/partners" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white">Partners</Link></div></div><div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><ShieldCheck className="h-7 w-7 text-[#F5A300]" aria-hidden="true" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">TRUST & GOVERNANCE</p><h3 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">Evidence before activation.</h3><p className="mt-5 text-[15px] leading-7 text-white/80">Supplier data, AI assistance and technical connectivity do not bypass product rights, compliance, commercial readiness or human review.</p><Link to="/trust" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">Explore trust <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></div></section>

        <section className="bg-[#F8F7F4] py-20"><div className="mx-auto max-w-[1180px] px-6 text-center"><Users className="mx-auto h-6 w-6 text-[#8A7351]" aria-hidden="true" /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Choose your next step</p><h2 className="mx-auto mt-3 max-w-4xl font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Enter the marketplace or explore the Loadify route built for your role.</h2><p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#667085]">Buy, sell, source for a business, supply products or discuss controlled technology connectivity.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link to="/marketplace" className="rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-extrabold text-white">Open Marketplace</Link><Link to="/suppliers" className="rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-extrabold text-[#0A234F]">Supplier Hub</Link></div></div></section>
      </main>
    </PresentationLayout>
  );
}