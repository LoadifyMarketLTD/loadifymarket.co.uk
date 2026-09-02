import { Link } from "react-router-dom";
import { ArrowRight, Building2, Handshake, Network, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const partnershipTypes = [
  { icon: Building2, title: "Commercial & strategic", copy: "Discuss marketplace, category and commercial opportunities where both organisations can define a clear operating model." },
  { icon: PackageSearch, title: "Product & supply", copy: "Brands, wholesalers, manufacturers and distributors can use the dedicated supplier path for product and supply participation." },
  { icon: Network, title: "Technology & integration", copy: "Commerce platforms and technology providers can discuss controlled connectivity through Loadify's integration programme." },
  { icon: Truck, title: "Fulfilment & operations", copy: "Operational and fulfilment relationships can be evaluated where responsibilities, customer experience and evidence are clearly defined." },
] as const;

export default function PartnersPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Partners | Commercial, Technology & Marketplace Partnerships" description="Explore commercial, technology, supplier and marketplace partnership opportunities with Loadify Market." canonical="/partners" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Partnerships</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Build commercial and technology relationships around the Loadify marketplace.</h1>
              <p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify provides a clear front door for organisations exploring commercial, supplier, fulfilment or technology collaboration — without treating an enquiry as an active partnership.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact?topic=partnership" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Partner with Loadify <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link to="/platform" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Explore the platform</Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] border border-[#0A234F]/10 bg-white p-7 shadow-[0_22px_65px_rgba(10,35,79,0.09)]">
                <Handshake className="h-7 w-7 text-[#8A7351]" aria-hidden="true" />
                <h2 className="mt-5 font-serif text-3xl tracking-[-0.025em]">The right conversation starts with the right route.</h2>
                <p className="mt-4 text-sm leading-7 text-[#667085]">Supplier participation, technical integration and broader commercial partnerships have different requirements. Loadify separates those paths so expectations remain clear from the beginning.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Partnership paths</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Different relationships. One clear place to start.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {partnershipTypes.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-[20px] border border-[#0A234F]/10 bg-[#F8F7F4] p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A234F] text-[#F5A300]"><Icon className="h-5 w-5" aria-hidden="true" /></div><h3 className="mt-5 text-base font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#667085]">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1280px] gap-6 px-5 sm:px-7 lg:grid-cols-2 lg:px-10">
            <Link to="/suppliers" className="group rounded-[24px] border border-[#0A234F]/10 bg-white p-7"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Products & supply</p><h2 className="mt-3 text-2xl font-black tracking-[-0.025em]">Are you a brand, wholesaler or supplier?</h2><p className="mt-3 text-sm leading-6 text-[#667085]">Use the supplier route for catalogue, supply and marketplace participation discussions.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">Explore suppliers <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
            <Link to="/integrations" className="group rounded-[24px] border border-[#0A234F]/10 bg-white p-7"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Technology</p><h2 className="mt-3 text-2xl font-black tracking-[-0.025em]">Do you operate a commerce or supplier platform?</h2><p className="mt-3 text-sm leading-6 text-[#667085]">Use the integration route for capability-scoped technical connectivity discussions.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">Explore integrations <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7">
            <ShieldCheck className="mx-auto h-6 w-6 text-[#F5A300]" aria-hidden="true" />
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">A partnership claim should follow evidence, not precede it.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Loadify does not use prospective provider names or logos to imply relationships that have not been verified and approved for public presentation.</p>
            <Link to="/contact?topic=partnership" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Start a partnership conversation <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
