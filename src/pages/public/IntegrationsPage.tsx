import { Link } from "react-router-dom";
import { ArrowRight, Braces, CheckCircle2, Database, KeyRound, Network, PackageSearch, ShieldCheck, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const domains = [
  { icon: PackageSearch, title: "Catalogue & offers", copy: "Product identity, variations and commercial offer data can be evaluated as part of a controlled integration path." },
  { icon: Database, title: "Stock & price", copy: "Inventory and pricing connectivity depends on the authoritative provider contract and verified capability available for that integration." },
  { icon: Truck, title: "Fulfilment & tracking", copy: "Order, fulfilment and tracking capabilities are never assumed. Each capability requires provider-specific evidence before activation." },
  { icon: ShieldCheck, title: "Governance", copy: "Data access, customer information and provider writes remain scoped to the minimum verified capability required for the authorised path." },
] as const;

const stages = [
  ["01", "Commercial fit", "Confirm the intended marketplace, supplier or technology relationship before technical work is treated as an integration."],
  ["02", "Capability evidence", "Establish what the provider actually supports: authentication, catalogue, stock, price, order, tracking or other relevant domains."],
  ["03", "Controlled validation", "Validate the authorised environment, identifiers, data contracts, failure behaviour and operational boundaries."],
  ["04", "Scoped activation", "Only independently verified capabilities can progress toward activation; unrelated provider capabilities remain off."],
] as const;

export default function IntegrationsPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Integrations | Supplier Commerce & Technology Connectivity" description="Explore Loadify Market's controlled supplier and commerce integration model, capability validation process and evidence-based connectivity paths." canonical="/integrations" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Supplier Commerce & Integrations</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Controlled integration paths for supplier and commerce systems.</h1>
              <p className="mt-7 max-w-[780px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify evaluates connectivity capability by capability. Commercial fit, technical evidence and controlled validation come before any supplier or provider function is presented as live.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact?topic=integration" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Integration enquiry <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link to="/suppliers" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Supplier participation</Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] border border-[#0A234F]/10 bg-white p-7 shadow-[0_22px_65px_rgba(10,35,79,0.09)]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Current access model</p>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex gap-3"><KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-[#0A234F]" /><div><strong>Public API</strong><p className="mt-1 leading-6 text-[#667085]">Not currently presented as generally available.</p></div></div>
                  <div className="flex gap-3"><Network className="mt-0.5 h-5 w-5 shrink-0 text-[#0A234F]" /><div><strong>Supplier integrations</strong><p className="mt-1 leading-6 text-[#667085]">Relationship-, evidence- and onboarding-dependent.</p></div></div>
                  <div className="flex gap-3"><Braces className="mt-0.5 h-5 w-5 shrink-0 text-[#0A234F]" /><div><strong>Webhooks</strong><p className="mt-1 leading-6 text-[#667085]">Availability depends on the authorised integration path and verified provider capability.</p></div></div>
                  <div className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0A234F]" /><div><strong>Custom connectivity discussions</strong><p className="mt-1 leading-6 text-[#667085]">Can be considered where the commercial relationship and technical evidence support the proposed path.</p></div></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Capability domains</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">One integration does not automatically unlock every commerce function.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {domains.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-[20px] border border-[#0A234F]/10 bg-[#F8F7F4] p-6"><Icon className="h-5 w-5 text-[#8A7351]" aria-hidden="true" /><h3 className="mt-5 text-base font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#667085]">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 sm:px-7 lg:grid-cols-[0.85fr_1.15fr] lg:px-10">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Activation lifecycle</p>
              <h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Evidence first. Activation second.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">This protects customers, suppliers and Loadify from treating documentation, a sandbox, an application or a commercial conversation as proof of a production capability.</p>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-[#0A234F]/10 bg-white">
              {stages.map(([step,title,copy]) => <div key={step} className="grid gap-2 border-b border-[#0A234F]/10 p-6 last:border-0 sm:grid-cols-[55px_160px_1fr]"><span className="text-[11px] font-black tracking-[0.16em] text-[#8A7351]">{step}</span><h3 className="font-extrabold">{title}</h3><p className="text-sm leading-6 text-[#667085]">{copy}</p></div>)}
            </div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7">
            <ShieldCheck className="mx-auto h-6 w-6 text-[#F5A300]" aria-hidden="true" />
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Planning a supplier or commerce integration?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Tell Loadify what your system provides, which commerce capabilities matter and what authorised technical access is available.</p>
            <Link to="/contact?topic=integration" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Open an integration enquiry <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
