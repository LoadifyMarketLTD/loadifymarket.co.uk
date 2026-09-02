import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Building2, CreditCard, FileCheck2, MessageSquareWarning, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const controls = [
  { icon: BadgeCheck, eyebrow: "READINESS", title: "Account & seller readiness", copy: "Role-aware access, seller setup and marketplace readiness controls help keep buyer, seller and administrative responsibilities distinct." },
  { icon: CreditCard, eyebrow: "PAYMENTS", title: "Structured payment flow", copy: "Marketplace checkout is Stripe-backed. Seller payout paths remain subject to eligibility and the applicable setup requirements." },
  { icon: PackageCheck, eyebrow: "RULES", title: "Marketplace rules", copy: "Seller standards, prohibited-item rules and intellectual-property complaint routes provide explicit operating boundaries for marketplace participation." },
  { icon: Truck, eyebrow: "VISIBILITY", title: "Order visibility", copy: "Order management, seller shipment workflows and public tracking support visibility through the customer journey where tracking data is available." },
  { icon: MessageSquareWarning, eyebrow: "SUPPORT", title: "Support & disputes", copy: "Buyer and seller environments include communication and support-related workflows, including dispute handling where the current platform supports it." },
  { icon: ShieldCheck, eyebrow: "INTEGRATIONS", title: "Controlled integrations", copy: "Supplier and provider capabilities remain evidence-gated. A prospective relationship or technical foundation is not presented as a live integration." },
] as const;

const policies = [
  ["Seller Guidelines", "/seller-guidelines"],
  ["Prohibited Items", "/prohibited-items-policy"],
  ["Seller Verification", "/seller-verification-policy"],
  ["Intellectual Property", "/intellectual-property-complaints"],
  ["Buyer Terms", "/buyer-terms"],
  ["Seller Terms", "/seller-terms"],
  ["Returns Policy", "/returns-policy"],
  ["Privacy Policy", "/privacy"],
] as const;

export default function TrustPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Trust & Safety | Marketplace Governance & Policies" description="Learn how Loadify Market approaches seller readiness, payments, marketplace rules, order visibility, disputes and controlled supplier integration." canonical="/trust" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="border-b border-[#0A234F]/10"><div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24"><div className="lg:col-span-7"><p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Trust, safety & governance</p><h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Clear roles, controlled access and evidence-backed marketplace operations.</h1><p className="mt-7 max-w-[780px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify's trust model is built around marketplace rules, account boundaries, structured commerce workflows and controlled activation — not unsupported guarantees, ratings or partner claims.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/help" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Visit Help Centre <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/contact" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Contact Loadify</Link></div></div><div className="lg:col-span-5"><div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]"><Building2 className="h-7 w-7 text-[#F5A300]" aria-hidden="true" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">OPERATOR IDENTITY</p><h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">A UK-operated marketplace with visible company and policy information.</h2><p className="mt-5 text-[15px] leading-7 text-white/80">Loadify exposes its operator details, support routes and marketplace policies publicly so visitors can understand who operates the platform and which rules apply.</p><Link to="/about" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-white">About Loadify <ArrowRight className="h-4 w-4" /></Link></div></div></div></section>

        <section className="bg-white py-16 sm:py-20"><div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Marketplace controls</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Trust is distributed across the commerce lifecycle.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{controls.map(({ icon: Icon, eyebrow, title, copy }) => <article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-6 w-6 text-[#F5A300]" aria-hidden="true" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div></div></section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20"><div className="mx-auto grid max-w-[1280px] gap-10 px-5 sm:px-7 lg:grid-cols-[0.85fr_1.15fr] lg:px-10"><div><FileCheck2 className="h-6 w-6 text-[#8A7351]" aria-hidden="true" /><h2 className="mt-5 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Policies should be easy to find before they are needed.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">This page summarises the trust model. The detailed legal and marketplace rules remain in their dedicated policy documents.</p></div><div className="grid gap-3 sm:grid-cols-2">{policies.map(([label,to]) => <Link key={label} to={to} className="group flex min-h-20 items-center justify-between rounded-[20px] bg-[#0A234F] px-5 text-white shadow-[0_14px_36px_rgba(10,35,79,0.10)]"><span className="font-serif text-xl font-normal leading-tight text-white">{label}</span><ArrowRight className="h-4 w-4 text-[#F5A300] transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>)}</div></div></section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7"><ShieldCheck className="mx-auto h-6 w-6 text-[#F5A300]" aria-hidden="true" /><h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Need help with an order, account or marketplace question?</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Use the Help Centre for guidance or contact Loadify when you need direct support.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/help" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Help Centre <ArrowRight className="h-4 w-4" /></Link><Link to="/contact" className="inline-flex min-h-12 items-center rounded-lg border border-white/20 px-6 py-3 text-sm font-bold text-white">Contact Loadify</Link></div></div></section>
      </main>
    </MainLayout>
  );
}
