import { Link } from "react-router-dom";
import { ArrowRight, Building2, CheckCircle2, ClipboardList, Search, ShieldCheck, ShoppingCart, UserRoundCheck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";

const accountTypes = ["Individual", "Sole trader", "Limited company", "Partnership", "Charity / organisation", "Other business or trader"] as const;
const businessNav = [
  { label: "Overview", to: "/business" },
  { label: "Trade Buyers", to: "/trade" },
  { label: "Suppliers, Brands & Wholesalers", to: "/suppliers" },
] as const;

export default function TradePage() {
  return (
    <MainLayout>
      <SEO title="Loadify Trade | Marketplace Access for Business Buyers" description="Register a Loadify trade buyer account for business purchasing and access the marketplace through a dedicated buyer registration path." canonical="/trade" />
      <SectionNav title="Business" items={businessNav} />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">B2B buying on Loadify</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">A dedicated B2B marketplace path for trade and business buyers.</h1>
              <p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Register the right business or trader identity, browse marketplace products and use Loadify's standard buying flow for supported purchases, orders and account management.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/trade-account" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Register a trade account <ArrowRight className="h-4 w-4" /></Link><Link to="/catalog" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Browse marketplace products</Link></div>
            </div>
            <div className="lg:col-span-5"><div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]"><Building2 className="h-7 w-7 text-[#F5A300]" /><p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">TRADE IDENTITY</p><h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">Business-buyer identity without unsupported commercial promises.</h2><p className="mt-5 text-[15px] leading-7 text-white/80">A trade registration identifies the buyer context. This page does not promise trade credit, special pricing, volume discounts or payment terms that have not been independently established as current Loadify policy.</p></div></div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20"><div className="mx-auto grid max-w-[1480px] gap-10 px-5 sm:px-7 lg:grid-cols-[1fr_1fr] lg:px-10"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Who can register</p><h2 className="mt-3 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">A flexible trade-account identity model.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">The current registration flow supports several customer types so the account can reflect how you purchase.</p></div><div className="grid gap-3 sm:grid-cols-2">{accountTypes.map((type) => <div key={type} className="flex min-h-20 items-center gap-3 rounded-[20px] bg-[#0A234F] px-5 text-white shadow-[0_14px_36px_rgba(10,35,79,0.10)]"><CheckCircle2 className="h-5 w-5 shrink-0 text-[#F5A300]" /><span className="font-serif text-xl font-normal leading-tight text-white">{type}</span></div>)}</div></div></section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20"><div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">B2B marketplace journey</p><h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Trade buyers use a clear product sourcing and purchasing flow.</h2><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[{icon:UserRoundCheck,eyebrow:"REGISTER",title:"Register",copy:"Create the appropriate trade buyer identity through the dedicated registration flow."},{icon:Search,eyebrow:"DISCOVER",title:"Discover",copy:"Browse and search the Loadify product marketplace."},{icon:ShoppingCart,eyebrow:"PURCHASE",title:"Purchase",copy:"Use the marketplace cart and Stripe-backed checkout flow for supported orders."},{icon:ClipboardList,eyebrow:"MANAGE",title:"Manage",copy:"Use the buyer environment for orders, addresses, payments, reviews, messages and other supported account functions."}].map(({icon:Icon,eyebrow,title,copy}) => <article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-6 w-6 text-[#F5A300]" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div></div></section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7"><ShieldCheck className="mx-auto h-6 w-6 text-[#F5A300]" /><h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Buying products for a business, organisation or trade activity?</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Use the dedicated trade-account route to register the appropriate buyer context.</p><Link to="/trade-account" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Register for Loadify Trade <ArrowRight className="h-4 w-4" /></Link></div></section>
      </main>
    </MainLayout>
  );
}
