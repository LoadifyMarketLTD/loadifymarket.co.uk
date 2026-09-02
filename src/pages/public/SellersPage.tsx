import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Boxes, MessageSquare, PackageCheck, RotateCcw, Settings, Star, Store, Truck } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const tools = [
  { icon: Boxes, eyebrow: "CATALOGUE", title: "Products", copy: "Create and manage marketplace product listings from the seller environment." },
  { icon: PackageCheck, eyebrow: "COMMERCE", title: "Orders", copy: "Review marketplace orders and the information needed to progress fulfilment." },
  { icon: Truck, eyebrow: "FULFILMENT", title: "Shipments", copy: "Manage shipment-related workflows and provide tracking information as orders progress." },
  { icon: RotateCcw, eyebrow: "AFTERSALES", title: "Returns", copy: "Use the seller workspace for supported return-related workflows and order follow-up." },
  { icon: Star, eyebrow: "REPUTATION", title: "Reviews", copy: "Review marketplace feedback associated with your seller activity." },
  { icon: MessageSquare, eyebrow: "COMMUNICATION", title: "Messages", copy: "Use seller messaging and notification areas to stay connected with marketplace activity." },
] as const;

const steps = [
  ["01", "Create your seller account", "Start through Loadify's seller registration route and provide the information required for your marketplace account."],
  ["02", "Complete seller setup", "Complete the applicable business profile, seller readiness and payment setup requirements before relying on marketplace selling functions."],
  ["03", "Build your catalogue", "Create accurate product listings with the product facts, pricing, stock and information buyers need."],
  ["04", "Manage commerce", "Use the seller workspace to manage orders, shipments, returns, reviews, messages and account settings."],
] as const;

export default function SellersPage() {
  return (
    <MainLayout>
      <SEO title="Sell on Loadify Market | Marketplace Tools for Sellers" description="Discover Loadify Market's seller environment for product listings, orders, shipments, returns, reviews, messages and marketplace account management." canonical="/sellers" />
      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="border-b border-[#0A234F]/10">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:items-center lg:px-10 lg:py-24">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">For sellers</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] sm:text-[3.8rem] lg:text-[4.5rem]">Build and manage your marketplace presence on Loadify.</h1>
              <p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">Loadify gives sellers a dedicated workspace for products, orders, shipments, returns, reviews, messages and account management — connected to the customer-facing marketplace.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/register?type=seller" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Start selling <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link to="/seller-guidelines" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Seller guidelines</Link></div>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-[26px] bg-[#0A234F] p-8 text-white shadow-[0_22px_65px_rgba(10,35,79,0.14)]">
                <Store className="h-7 w-7 text-[#F5A300]" aria-hidden="true" />
                <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">SELLER SPACE</p>
                <h2 className="mt-3 font-serif text-3xl font-normal leading-[1.08] tracking-[-0.03em] text-white">A seller workspace connected to a public storefront.</h2>
                <p className="mt-5 text-[15px] leading-7 text-white/80">Eligible marketplace sellers can manage their commerce activity while maintaining a public-facing seller presence for customers browsing Loadify.</p>
                <div className="mt-6 flex items-start gap-3 border-t border-white/15 pt-5"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#F5A300]" /><p className="text-sm leading-6 text-white/75">Seller readiness and payment setup requirements apply. Payout paths are subject to eligibility and applicable Stripe setup.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Seller workspace</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Core tools for day-to-day marketplace operations.</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{tools.map(({ icon: Icon, eyebrow, title, copy }) => <article key={title} className="rounded-[24px] bg-[#0A234F] p-7 text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]"><Icon className="h-6 w-6 text-[#F5A300]" aria-hidden="true" /><p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">{eyebrow}</p><h3 className="mt-3 font-serif text-[1.8rem] font-normal leading-[1.08] tracking-[-0.03em] text-white">{title}</h3><p className="mt-4 text-[15px] leading-7 text-white/80">{copy}</p></article>)}</div>
          </div>
        </section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto grid max-w-[1480px] gap-10 px-5 sm:px-7 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
            <div><Settings className="h-6 w-6 text-[#8A7351]" /><h2 className="mt-5 font-serif text-3xl tracking-[-0.025em] sm:text-4xl">From registration to marketplace operations.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#667085]">The seller journey has distinct setup and operating stages. Registration alone should not be confused with completed marketplace readiness.</p></div>
            <div className="overflow-hidden rounded-[24px] bg-[#0A234F] text-white shadow-[0_18px_50px_rgba(10,35,79,0.12)]">{steps.map(([step,title,copy]) => <div key={step} className="grid gap-2 border-b border-white/10 p-6 last:border-0 sm:grid-cols-[55px_180px_1fr]"><span className="text-[11px] font-black tracking-[0.16em] text-[#F5A300]">{step}</span><h3 className="font-serif text-xl font-normal text-white">{title}</h3><p className="text-sm leading-6 text-white/75">{copy}</p></div>)}</div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20"><div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7"><Store className="mx-auto h-6 w-6 text-[#F5A300]" aria-hidden="true" /><h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl tracking-[-0.025em] sm:text-4xl">Ready to build your Loadify seller presence?</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/70">Start the seller registration path, then complete the applicable setup and marketplace readiness requirements.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/register?type=seller" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#F5A300] px-6 py-3 text-sm font-extrabold text-[#0A234F]">Start selling <ArrowRight className="h-4 w-4" /></Link><Link to="/trust" className="inline-flex min-h-12 items-center rounded-lg border border-white/20 px-6 py-3 text-sm font-bold text-white">Trust & marketplace rules</Link></div></div></section>
      </main>
    </MainLayout>
  );
}
