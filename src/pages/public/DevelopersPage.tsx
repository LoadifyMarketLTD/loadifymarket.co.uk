import { Link } from "react-router-dom";
import { ArrowRight, Braces, Database, Fingerprint, KeyRound, RefreshCw, ShieldCheck, Workflow } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const principles = [
  { icon: Fingerprint, title: "Capability-scoped access", copy: "Technical access should match the specific commercial relationship and the minimum verified capability required for it." },
  { icon: Database, title: "Authoritative commerce data", copy: "Catalogue, offer, stock, price and fulfilment facts need clear ownership and source-of-truth boundaries." },
  { icon: RefreshCw, title: "Recoverable operations", copy: "Integration design should account for retries, reconciliation and duplicate-safe behaviour rather than assuming every external request succeeds once." },
  { icon: ShieldCheck, title: "Evidence-gated activation", copy: "A technical foundation, documentation set or sandbox does not make a provider capability production-ready on Loadify." },
] as const;

export default function DevelopersPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Developers | Partner-Based Commerce Integration" description="Technical overview of Loadify's controlled, partner-based commerce integration model for approved technology and supplier platforms." canonical="/developers" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Developers & technology teams</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">A technical entry point for approved commerce integration discussions.</h1>
              <p className="mt-7 max-w-[780px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify's current integration model is partner-based and capability-scoped. This page explains the technical principles without presenting a generally available public API, sandbox or webhook programme that has not been verified.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact?topic=technology" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Technology enquiry <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                <Link to="/integrations" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Integration overview</Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] border border-[#0A234F]/10 bg-[#0A234F] p-7 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]">
                <Braces className="h-7 w-7 text-[#F5A300]" aria-hidden="true" />
                <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Access status</p>
                <h2 className="mt-3 font-serif text-3xl tracking-[-0.025em]">Partner-based, not self-service.</h2>
                <div className="mt-6 space-y-3 text-sm leading-6 text-white/72">
                  <p><strong className="text-white">Public API:</strong> not currently generally available.</p>
                  <p><strong className="text-white">Public sandbox:</strong> not presented as generally available.</p>
                  <p><strong className="text-white">Webhooks:</strong> availability depends on the approved integration path.</p>
                  <p><strong className="text-white">Custom connectivity:</strong> discussed according to partner and capability requirements.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Technical principles</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Integration credibility starts with boundaries.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {principles.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-[20px] border border-[#0A234F]/10 bg-[#F8F7F4] p-6"><Icon className="h-5 w-5 text-[#8A7351]" aria-hidden="true" /><h3 className="mt-5 text-base font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#667085]">{copy}</p></article>)}
            </div>
          </div>
        </section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto max-w-[1280px] px-5 sm:px-7 lg:px-10">
            <div className="grid gap-5 md:grid-cols-3">
              <article className="rounded-[22px] border border-[#0A234F]/10 bg-white p-7"><Database className="h-5 w-5 text-[#8A7351]" /><h2 className="mt-5 text-xl font-black">Data domains</h2><p className="mt-3 text-sm leading-6 text-[#667085]">Potential integration domains include catalogue/offers, stock/price and authorised fulfilment/tracking functions. Availability is provider-specific.</p></article>
              <article className="rounded-[22px] border border-[#0A234F]/10 bg-white p-7"><KeyRound className="h-5 w-5 text-[#8A7351]" /><h2 className="mt-5 text-xl font-black">Authentication</h2><p className="mt-3 text-sm leading-6 text-[#667085]">Authentication and credentials depend on the authorised provider or partner contract. Loadify does not advertise generic API-key issuance.</p></article>
              <article className="rounded-[22px] border border-[#0A234F]/10 bg-white p-7"><Workflow className="h-5 w-5 text-[#8A7351]" /><h2 className="mt-5 text-xl font-black">Validation lifecycle</h2><p className="mt-3 text-sm leading-6 text-[#667085]">Commercial fit, capability evidence, controlled validation and scoped activation remain separate stages.</p></article>
            </div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7">
            <ShieldCheck className="mx-auto h-6 w-6 text-[#F5A300]" aria-hidden="true" />
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Have an authorised technical path to discuss?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Share the system, commercial relationship and exact capabilities you want to connect. Loadify can then assess the appropriate technical path.</p>
            <Link to="/contact?topic=technology" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Developer / technology enquiry <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
