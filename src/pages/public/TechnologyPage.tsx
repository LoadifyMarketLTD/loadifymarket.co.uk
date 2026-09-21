import { Link } from "react-router-dom";
import { ArrowRight, Braces, CheckCircle2, Database, Network, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";

const technologyNav = [
  { label: "Overview", to: "/technology" },
  { label: "Integrations", to: "/integrations" },
  { label: "Developers", to: "/developers" },
] as const;

const builderRules = [
  ["Source-grounded", "The builder starts from governed supplier and canonical product data rather than inventing product identity."],
  ["No fact verification by AI", "AI proposals do not become verified product facts. Evidence and human review remain separate."],
  ["No rights bypass", "Images and other supplier assets require verified usage rights before they enter buyer-facing merchandising."],
  ["No automatic publication", "AI output does not activate commerce, publish a product or bypass stock, price, compliance or economics gates."],
] as const;

const foundation = [
  ["Supplier Foundation", "Qualification, provenance, capability evidence and lifecycle governance for supplier relationships."],
  ["Acquisition Runtime", "Controlled remote catalogue acquisition with server-side configuration, transport binding and fail-closed validation."],
  ["Canonical Product Layer", "Separates supplier raw identity and offers from governed product identity and verified facts."],
  ["AI Product Builder", "Creates merchandising proposals from governed inputs while leaving factual approval and publication controls outside the model."],
] as const;

export default function TechnologyPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Technology | Supplier Foundation & AI Product Builder" description="Explore Loadify Market's Supplier Foundation, governed catalogue ingestion, AI Product Builder and evidence-led commerce integration model." canonical="/technology" />
      <SectionNav title="Technology" items={technologyNav} />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Supplier Foundation · AI Product Builder</p>
              <h1 className="mt-5 max-w-[920px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Commerce automation with clear boundaries between source data, AI assistance and publication.</h1>
              <p className="mt-7 max-w-[790px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify's supplier technology is designed as a governed pipeline. Supplier data can be acquired and normalised, AI can assist merchandising, and buyer-facing commerce stays behind evidence, review and live stock-and-price gates.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/integrations" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Explore integrations <ArrowRight className="h-4 w-4" /></Link><Link to="/suppliers" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold">Supplier Hub</Link></div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]">
                <ShieldCheck className="h-7 w-7 text-[#F5A300]" />
                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">TECHNOLOGY GOVERNANCE</p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">Automation does not equal authority.</h2>
                <p className="mt-5 text-[15px] leading-7 text-white/80">Supplier credentials remain server-side, provider access is scoped, AI proposals remain proposals, and publication requires explicit eligibility.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Technology layers</p>
            <h2 className="mt-3 max-w-4xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">The supplier stack is separated so one capability cannot silently unlock another.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{foundation.map(([title, copy], index) => <article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]">{index === 0 ? <ShieldCheck className="h-6 w-6 text-[#F5A300]" /> : index === 1 ? <Network className="h-6 w-6 text-[#F5A300]" /> : index === 2 ? <Database className="h-6 w-6 text-[#F5A300]" /> : <Sparkles className="h-6 w-6 text-[#F5A300]" />}<h3 className="mt-6 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div>
          </div>
        </section>

        <section id="ai-product-builder" className="scroll-mt-32 bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 sm:px-7 lg:grid-cols-[0.75fr_1.25fr] lg:px-10">
            <div><Sparkles className="h-7 w-7 text-[#1D57D8]" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">AI Product Builder</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">AI for merchandising, not for inventing product truth.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#667085]">The builder can help turn approved source data into clear buyer-facing copy. It does not become a second source of truth and it does not control publication.</p></div>
            <div className="grid gap-4 md:grid-cols-2">{builderRules.map(([title, copy]) => <article key={title} className="rounded-[22px] border border-[#0A234F]/10 bg-white p-6 shadow-[0_12px_35px_rgba(10,35,79,0.06)]"><CheckCircle2 className="h-5 w-5 text-[#1D57D8]" /><h3 className="mt-5 text-base font-extrabold text-[#0A234F]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#667085]">{copy}</p></article>)}</div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Explore technology</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Choose the technical context that matches the relationship.</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="flex min-h-[280px] flex-col rounded-[24px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Network className="h-7 w-7 text-[#F5A300]" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">INTEGRATIONS</p><h3 className="mt-3 font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl">Supplier & commerce integrations</h3><p className="mt-5 flex-1 text-[15px] leading-7 text-white/80">Review supported catalogue transports, acquisition boundaries, capability evidence and the controlled activation lifecycle.</p><Link to="/integrations" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">Explore integrations <ArrowRight className="h-4 w-4" /></Link></article>
              <article className="flex min-h-[280px] flex-col rounded-[24px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Braces className="h-7 w-7 text-[#F5A300]" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">DEVELOPERS</p><h3 className="mt-3 font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl">Developer context</h3><p className="mt-5 flex-1 text-[15px] leading-7 text-white/80">Review the technical principles for authorised connectivity discussions without implying a generally available public API, sandbox or webhook programme.</p><Link to="/developers" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">Developer context <ArrowRight className="h-4 w-4" /></Link></article>
            </div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-10"><div><Workflow className="h-6 w-6 text-[#F5A300]" /><h2 className="mt-4 max-w-3xl font-serif text-3xl sm:text-4xl">Have an authorised supplier or commerce connectivity path to discuss?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">Tell Loadify which system, relationship and exact capabilities are involved so the appropriate evidence and validation path can be assessed.</p></div><Link to="/contact?topic=technology" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Technology enquiry <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
    </MainLayout>
  );
}