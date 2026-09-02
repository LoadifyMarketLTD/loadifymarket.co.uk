import { Link } from "react-router-dom";
import { ArrowRight, Building2, PackageCheck, ShoppingCart, Store } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import SectionNav from "@/components/presentation/SectionNav";

const businessNav = [
  { label: "Overview", to: "/business" },
  { label: "Trade Buyers", to: "/trade" },
  { label: "Suppliers, Brands & Wholesalers", to: "/suppliers" },
] as const;

const paths = [
  { icon: ShoppingCart, title: "Trade Buyers", copy: "Use Loadify's dedicated trade registration path when purchasing in a business, trader or organisational context.", to: "/trade", cta: "Explore Trade Buyers" },
  { icon: PackageCheck, title: "Suppliers, Brands & Wholesalers", copy: "Explore marketplace selling, supplier participation and controlled commerce connectivity according to the way your business supplies and fulfils products.", to: "/suppliers", cta: "Explore supplier paths" },
] as const;

export default function BusinessPage() {
  return (
    <MainLayout>
      <SEO title="Loadify Business | Trade Buyers, Suppliers, Brands & Wholesalers" description="Explore Loadify Market's business paths for trade buyers, suppliers, brands and wholesalers." canonical="/business" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] pt-[82px]">
        <SectionNav title="Business" items={businessNav} />
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Loadify Business</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">A clearer route into Loadify for businesses on both sides of commerce.</h1>
              <p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Whether you are purchasing for a business or bringing products and supply capability to the marketplace, Loadify keeps the route appropriate to your role and the capabilities actually available.</p>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] border border-[#0A234F]/10 bg-white p-7 shadow-[0_22px_65px_rgba(10,35,79,0.09)]">
                <Building2 className="h-7 w-7 text-[#8A7351]" />
                <h2 className="mt-5 font-serif text-3xl tracking-[-0.025em]">One business section. Distinct participation paths.</h2>
                <p className="mt-4 text-sm leading-7 text-[#667085]">Trade buying and supplier participation have different requirements. This section keeps them connected without presenting capabilities, commercial terms or integrations that have not been established.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Choose your route</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Start with the role that matches what your business needs to do.</h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              {paths.map(({ icon: Icon, title, copy, to, cta }) => (
                <article key={title} className="flex min-h-[280px] flex-col rounded-[22px] border border-[#0A234F]/10 bg-[#F8F7F4] p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A234F] text-[#F5A300]"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-6 font-serif text-3xl tracking-[-0.025em]">{title}</h3>
                  <p className="mt-4 max-w-2xl flex-1 text-sm leading-7 text-[#667085]">{copy}</p>
                  <Link to={to} className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#0A234F]">{cta} <ArrowRight className="h-4 w-4" /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div><Store className="h-6 w-6 text-[#F5A300]" /><h2 className="mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Looking to buy products rather than explore the business programme?</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-white/70">Enter the marketplace directly for product discovery and purchasing.</p></div>
            <Link to="/marketplace" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Enter Marketplace <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
