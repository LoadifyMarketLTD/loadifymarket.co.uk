import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, ClipboardCheck, Database, FileInput, PackageCheck, ShieldCheck, Sparkles, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";

const businessNav = [
  { label: "Overview", to: "/business" },
  { label: "Trade Buyers", to: "/trade" },
  { label: "Supplier Hub", to: "/suppliers" },
] as const;

const formats = ["API", "JSON", "CSV", "XML", "Feed URL", "SFTP", "Manual catalogue"] as const;

const expectations = [
  { icon: PackageCheck, eyebrow: "PRODUCT DATA", title: "Authoritative catalogue facts", copy: "Product identity, variants, descriptions, identifiers and specifications need a dependable source and a maintainable update path." },
  { icon: Database, eyebrow: "STOCK & PRICE", title: "Reliable commercial updates", copy: "Stock and price should come from an agreed supplier source so buyer-facing availability can be revalidated before checkout." },
  { icon: Truck, eyebrow: "FULFILMENT", title: "Supplier-held stock and dispatch", copy: "The supplier remains responsible for holding stock and dispatching orders under agreed fulfilment, tracking and returns terms. Loadify does not operate a warehouse." },
  { icon: ShieldCheck, eyebrow: "RIGHTS & COMPLIANCE", title: "Evidence before publication", copy: "Product facts, image rights, compliance and commercial readiness must clear the applicable review gates before a supplier product can be published." },
] as const;

const onboarding = [
  ["01", "Candidate", "Confirm business identity, product categories, warehouse origin and the proposed supply model."],
  ["02", "Verification", "Review commercial terms, fulfilment expectations, content rights, compliance and available technical evidence."],
  ["03", "Catalogue connection", "Use an approved API, feed, file or manual catalogue path. Supplier credentials remain server-side and are not stored in onboarding records."],
  ["04", "Normalisation", "Convert supplier data into governed canonical product and offer records while preserving source provenance."],
  ["05", "Merchandising review", "AI Product Builder can assist buyer-facing copy, but human approval and verified source evidence remain required."],
  ["06", "Controlled publication", "Eligible products can progress to the marketplace only after evidence, economics, stock and price gates pass."],
] as const;

export default function SuppliersPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Supplier Hub | Direct Suppliers, Brands & Wholesalers" description="Explore Loadify Market's direct supplier route for manufacturers, importers, wholesalers and distributors using governed catalogue ingestion and supplier-held fulfilment." canonical="/suppliers" />
      <SectionNav title="Business" items={businessNav} />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Direct Supplier Network</p>
              <h1 className="mt-5 max-w-[920px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">A direct supplier route built for real product data, real stock and supplier fulfilment.</h1>
              <p className="mt-7 max-w-[790px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify is building direct relationships with manufacturers, importers, wholesalers and distributors. Suppliers keep their own stock and dispatch buyer orders; Loadify provides the marketplace, governed product pipeline and buyer-facing commerce layer.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/supplier-application" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white hover:bg-[#071A3C]">Apply as a supplier <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/integrations" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">View technical routes</Link></div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]">
                <Building2 className="h-7 w-7 text-[#F5A300]" aria-hidden="true" />
                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">HOW THE MODEL WORKS</p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">No Loadify warehouse. No automatic publication.</h2>
                <div className="mt-6 space-y-3 text-sm leading-6 text-white/78">{["Supplier owns or controls the stock.", "Supplier fulfils the approved customer order.", "Loadify governs catalogue, pricing readiness and buyer presentation.", "Technical capability is activated only where evidence supports it."].map((item) => <div key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#F5A300]" /><span>{item}</span></div>)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Catalogue connectivity</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">A supplier does not need a public API to work with Loadify.</h2></div><p className="max-w-2xl text-sm leading-7 text-[#667085] lg:justify-self-end">The supplier foundation is provider-neutral. The correct transport depends on what the supplier can reliably maintain, not on forcing every business into one integration method.</p></div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{formats.map((format, index) => <div key={format} className="rounded-[20px] border border-[#0A234F]/10 bg-[#F8F7F4] p-5"><div className="flex items-center justify-between"><FileInput className="h-5 w-5 text-[#1D57D8]" /><span className="text-[10px] font-black text-[#8A7351]">{String(index + 1).padStart(2, "0")}</span></div><p className="mt-5 text-sm font-extrabold text-[#0A234F]">{format}</p></div>)}</div>
          </div>
        </section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Supplier readiness</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Dependable commerce facts come before scale.</h2></div>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{expectations.map(({ icon: Icon, eyebrow, title, copy }) => <article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-6 w-6 text-[#F5A300]" aria-hidden="true" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 sm:px-7 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
            <div><ClipboardCheck className="h-7 w-7 text-[#1D57D8]" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Onboarding lifecycle</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">From supplier candidate to controlled marketplace publication.</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[#667085]">Supplier approval and product publication are separate decisions. Approval does not automatically make a catalogue buyer-visible.</p></div>
            <div className="overflow-hidden rounded-[24px] bg-[#0A234F] text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]">{onboarding.map(([step, title, copy]) => <div key={step} className="grid gap-2 border-b border-white/10 p-6 last:border-0 sm:grid-cols-[55px_180px_1fr]"><span className="text-[11px] font-black text-[#F5A300]">{step}</span><h3 className="font-serif text-xl font-normal text-white">{title}</h3><p className="text-sm leading-6 text-white/75">{copy}</p></div>)}</div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-[1280px] gap-8 px-5 sm:px-7 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
            <div><Sparkles className="h-6 w-6 text-[#F5A300]" /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">AI Product Builder</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">AI can assist merchandising. It cannot manufacture evidence.</h2><p className="mt-4 max-w-3xl text-sm leading-7 text-white/70">Buyer-facing titles, descriptions, benefits and SEO content can be assisted by AI after governed supplier data exists. Product facts, rights, compliance, stock and price remain evidence-led and human-controlled.</p></div>
            <Link to="/technology#ai-product-builder" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">See the technology model <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}