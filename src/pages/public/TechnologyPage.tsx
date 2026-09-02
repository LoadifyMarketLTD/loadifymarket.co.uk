import { Link } from "react-router-dom";
import { ArrowRight, Braces, Network, ShieldCheck, Workflow } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";

const technologyNav = [
  { label: "Overview", to: "/technology" },
  { label: "Integrations", to: "/integrations" },
  { label: "Developers", to: "/developers" },
] as const;

export default function TechnologyPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Technology | Integrations & Developer Context" description="Explore Loadify Market's controlled technology, commerce integration and developer connectivity model." canonical="/technology" />
      <SectionNav title="Technology" items={technologyNav} />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Loadify Technology</p><h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Commerce connectivity built around verified capability, not assumptions.</h1><p className="mt-7 max-w-[780px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify separates integration discovery, technical validation and production activation. The technology section explains how supplier and commerce connectivity can be assessed without presenting unverified provider capabilities as live.</p></div>
            <div className="lg:col-span-5"><div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]"><ShieldCheck className="h-7 w-7 text-[#F5A300]" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">TECHNOLOGY GOVERNANCE</p><h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">Controlled by design.</h2><p className="mt-5 text-[15px] leading-7 text-white/80">Commercial fit, authorised access, capability evidence and validation remain separate gates. Documentation or a technical foundation alone does not establish a production integration.</p></div></div>
          </div>
        </section>
        <section className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Explore technology</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Choose the technical context that matches your role.</h2><div className="mt-10 grid gap-5 lg:grid-cols-2"><article className="flex min-h-[280px] flex-col rounded-[24px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Network className="h-7 w-7 text-[#F5A300]" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">INTEGRATIONS</p><h3 className="mt-3 font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl">Integrations</h3><p className="mt-5 flex-1 text-[15px] leading-7 text-white/80">Understand the capability domains, evidence requirements and controlled validation path used when evaluating supplier and commerce connectivity.</p><Link to="/integrations" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">Explore integrations <ArrowRight className="h-4 w-4" /></Link></article><article className="flex min-h-[280px] flex-col rounded-[24px] bg-[#0A234F] p-8 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Braces className="h-7 w-7 text-[#F5A300]" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">DEVELOPERS</p><h3 className="mt-3 font-serif text-[2rem] font-normal leading-[1.08] tracking-[-0.03em] text-white sm:text-4xl">Developers</h3><p className="mt-5 flex-1 text-[15px] leading-7 text-white/80">Review the technical principles for authorised connectivity discussions without implying a generally available public API, sandbox or webhook programme.</p><Link to="/developers" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">Developer context <ArrowRight className="h-4 w-4" /></Link></article></div></div></section>
        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-10"><div><Workflow className="h-6 w-6 text-[#F5A300]" /><h2 className="mt-4 max-w-3xl font-serif text-3xl sm:text-4xl">Have an authorised connectivity path to discuss?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">Tell Loadify which system, commercial relationship and exact capabilities are involved so the appropriate path can be assessed.</p></div><Link to="/contact?topic=technology" className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Technology enquiry <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
    </MainLayout>
  );
}
