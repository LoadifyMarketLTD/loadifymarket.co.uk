import { Link } from "react-router-dom";
import { ArrowRight, Boxes, Building2, ClipboardCheck, Network, PackageCheck, ShieldCheck, Store, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";

const businessNav = [
  { label: "Overview", to: "/business" },
  { label: "Trade Buyers", to: "/trade" },
  { label: "Suppliers, Brands & Wholesalers", to: "/suppliers" },
] as const;

const paths = [
  { icon: Store, eyebrow: "SELL", title: "Sell on the marketplace", copy: "Eligible brands, wholesalers and commercial sellers can use the seller onboarding path to build and manage a Loadify marketplace presence.", to: "/register?type=seller", cta: "Start selling" },
  { icon: Boxes, eyebrow: "SUPPLY", title: "Discuss supplier participation", copy: "Manufacturers, distributors and product suppliers can discuss catalogue, commercial and fulfilment requirements with Loadify before any capability is activated.", to: "/contact?topic=supplier", cta: "Supplier enquiry" },
  { icon: Network, eyebrow: "CONNECT", title: "Explore an integration path", copy: "Supplier platforms and commerce systems can discuss controlled, capability-scoped connectivity where the commercial and technical model is appropriate.", to: "/integrations", cta: "Explore integrations" },
] as const;

const expectations = [
  { icon: PackageCheck, eyebrow: "DATA", title: "Reliable product data", copy: "Product identity, variations, pricing, stock and other catalogue facts need an authoritative source and a maintainable update path." },
  { icon: Truck, eyebrow: "FULFILMENT", title: "Clear fulfilment responsibility", copy: "The responsible fulfilment party, shipment progress and tracking expectations must be understood before an operational path is promoted." },
  { icon: ShieldCheck, eyebrow: "GOVERNANCE", title: "Commercial and compliance fit", copy: "Participation remains subject to the applicable marketplace rules, product restrictions and the evidence required for the proposed model." },
  { icon: ClipboardCheck, eyebrow: "EVIDENCE", title: "Evidence before activation", copy: "Technical foundations or an integration conversation do not by themselves make a supplier or provider capability live on Loadify." },
] as const;

export default function SuppliersPage() {
  return (
    <MainLayout>
      <SEO title="Become a Loadify Supplier | Brands, Wholesalers & Product Partners" description="Learn how brands, wholesalers, distributors and suppliers can discuss marketplace participation and controlled supplier integration with Loadify Market." canonical="/suppliers" />
      <SectionNav title="Business" items={businessNav} />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="border-b border-[#0A234F]/10 bg-[#F8F7F4]">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Brands, wholesalers & suppliers</p><h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Bring your catalogue and supply capability to Loadify Market.</h1><p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify provides distinct paths for marketplace selling, supplier discussions and controlled commerce integration. The right route depends on how your business supplies products and fulfils orders.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/contact?topic=supplier" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white hover:bg-[#071A3C]">Supplier enquiry <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/register?type=seller" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Start selling</Link></div></div>
            <div className="lg:col-span-5"><div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]"><Building2 className="h-7 w-7 text-[#F5A300]" aria-hidden="true" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">SUPPLIER PARTICIPATION</p><h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">A participation path, not a blanket promise.</h2><p className="mt-5 text-[15px] leading-7 text-white/80">Supplier participation is assessed according to the commercial model, catalogue requirements, fulfilment responsibilities and any technical capabilities involved.</p><div className="mt-6 border-t border-white/15 pt-5 text-sm leading-6 text-white/75">Provider-specific automation is not presented as live unless the relevant capability has been independently verified and activated.</div></div></div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Ways to work with Loadify</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Choose the route that matches your operation.</h2><div className="mt-10 grid gap-5 lg:grid-cols-3">{paths.map(({ icon: Icon, eyebrow, title, copy, to, cta }) => <article key={title} className="flex min-h-[300px] flex-col rounded-[24px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-7 w-7 text-[#F5A300]" aria-hidden="true" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-5 flex-1 text-[15px] leading-7 text-white/80">{copy}</p><Link to={to} className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">{cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></article>)}</div></div></section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20"><div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Operational expectations</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Good supplier connectivity starts with dependable commerce facts.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{expectations.map(({ icon: Icon, eyebrow, title, copy }) => <article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-6 w-6 text-[#F5A300]" aria-hidden="true" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div></div></section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto grid max-w-[1280px] gap-8 px-5 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Supplier Commerce</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Need a technical connection rather than a seller account?</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">Explore Loadify's controlled integration model for supplier platforms, catalogue systems and commerce technology. Access and capabilities remain partner- and evidence-dependent.</p></div><Link to="/integrations" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Explore integrations <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div></section>
      </main>
    </MainLayout>
  );
}
