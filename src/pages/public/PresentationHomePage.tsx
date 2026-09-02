import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Network,
  PackageSearch,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import SEO from "@/components/SEO";
import PresentationLayout from "@/layouts/PresentationLayout";

const paths = [
  {
    icon: PackageSearch,
    eyebrow: "BUY",
    title: "Buy through Loadify",
    copy: "Discover marketplace listings, purchase through Loadify and manage orders and account activity through Buyer Space.",
    to: "/buyers",
    cta: "Explore buyers",
  },
  {
    icon: Store,
    eyebrow: "SELL",
    title: "Sell through Loadify",
    copy: "Create listings and manage marketplace orders, shipments, returns and seller account activity through Seller Space.",
    to: "/sellers",
    cta: "Explore sellers",
  },
  {
    icon: Building2,
    eyebrow: "TRADE",
    title: "Source for business",
    copy: "Use a dedicated business and trade registration path while keeping marketplace sourcing and buyer account management connected.",
    to: "/trade",
    cta: "Explore trade",
  },
  {
    icon: Network,
    eyebrow: "CONNECT",
    title: "Work with the platform",
    copy: "Explore controlled routes for supplier participation, commercial relationships and technology integration discussions.",
    to: "/partners",
    cta: "Explore partnerships",
  },
] as const;

const lifecycle = [
  ["01", "Discover", "Find products through marketplace search, categories and product pages."],
  ["02", "Evaluate", "Review product and seller information before making a purchase decision."],
  ["03", "Purchase", "Complete supported checkout through Loadify's Stripe-backed payment flow."],
  ["04", "Fulfil", "The responsible seller or authorised fulfilment path progresses the order."],
  ["05", "Track", "Follow shipment and order progress where tracking information is available."],
  ["06", "Manage", "Use buyer and seller workspaces for the activity that continues after checkout."],
] as const;

const platformMap = [
  ["Marketplace", "Discovery, product pages and checkout"],
  ["Buyer Space", "Orders, account activity and support paths"],
  ["Seller Space", "Listings, orders, shipments and returns"],
  ["Business", "Trade buying and supplier participation routes"],
  ["Technology", "Controlled integration and developer discussions"],
  ["Trust", "Policies, readiness controls and evidence gates"],
] as const;

export default function PresentationHomePage() {
  return (
    <PresentationLayout>
      <SEO
        title="Loadify Market | Marketplace, Commerce & Business Platform"
        description="Discover Loadify Market: a UK-operated marketplace connecting buyers, sellers and business commerce with controlled supplier and technology participation paths."
        canonical="/"
      />

      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F]">
        <section className="relative overflow-hidden border-b border-[#0A234F]/10 pt-28 lg:pt-32">
          <div className="pointer-events-none absolute -right-40 top-10 h-[560px] w-[560px] rounded-full bg-[#1D57D8]/[0.075] blur-3xl" aria-hidden="true" />
          <div className="mx-auto grid min-h-[700px] max-w-[1480px] items-center gap-14 px-6 py-16 lg:grid-cols-12 lg:px-10 lg:py-20">
            <div className="relative lg:col-span-7">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#8A7351]">Marketplace · Commerce · Business</p>
              <h1 className="mt-5 max-w-[900px] font-serif text-[3.15rem] font-normal leading-[0.98] tracking-[-0.045em] text-[#0A234F] sm:text-[4.4rem] lg:text-[5.25rem]">
                A marketplace built to connect buying, selling and business commerce.
              </h1>
              <p className="mt-7 max-w-[760px] text-[17px] leading-8 text-[#5A6578] sm:text-[19px]">
                Loadify connects product discovery and marketplace ordering with dedicated buyer and seller environments, trade routes and controlled ways for suppliers and technology organisations to engage with the platform.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/marketplace" className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#071A3C]">
                  Open Marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link to="/platform" className="inline-flex min-h-12 items-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-extrabold text-[#0A234F] transition hover:border-[#0A234F]/25">
                  Explore the Platform
                </Link>
              </div>
              <div className="mt-10 grid max-w-[760px] gap-3 border-t border-[#0A234F]/10 pt-6 sm:grid-cols-3">
                {["Marketplace buying", "Seller operations", "Business participation"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm font-bold text-[#536174]">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#8A7351]" aria-hidden="true" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="rounded-[30px] border border-[#0A234F]/10 bg-white p-7 shadow-[0_28px_80px_rgba(10,35,79,0.10)]">
                <div className="flex items-center justify-between gap-4 border-b border-[#0A234F]/10 pb-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Loadify platform map</p>
                    <h2 className="mt-2 font-serif text-3xl tracking-[-0.03em]">One commerce journey, clear operating areas.</h2>
                  </div>
                  <span className="rounded-full bg-[#FFF4D6] px-3 py-1 text-[10px] font-black text-[#8A5A00]">LOADIFY</span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {platformMap.map(([title, copy]) => (
                    <div key={title} className="rounded-[18px] border border-[#0A234F]/10 bg-[#F8F7F4] p-4">
                      <p className="text-sm font-extrabold text-[#0A234F]">{title}</p>
                      <p className="mt-1.5 text-[12px] leading-5 text-[#667085]">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-[1480px] px-6 lg:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Start with your role</p>
                <h2 className="mt-3 font-serif text-4xl leading-tight tracking-[-0.03em] sm:text-5xl">Different goals. One connected platform.</h2>
              </div>
              <p className="max-w-2xl text-[16px] leading-8 text-[#667085] lg:justify-self-end">
                Choose the route that matches what you want to do with Loadify, then continue into the marketplace or the dedicated platform area built around that role.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {paths.map(({ icon: Icon, eyebrow, title, copy, to, cta }) => (
                <Link key={title} to={to} className="group rounded-[24px] border border-[#0A234F]/10 bg-[#F8F7F4] p-7 transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(10,35,79,0.08)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0A234F] shadow-sm"><Icon className="h-5 w-5" aria-hidden="true" /></div>
                  <p className="mt-7 text-[10px] font-black tracking-[0.18em] text-[#8A7351]">{eyebrow}</p>
                  <h3 className="mt-2 font-serif text-3xl tracking-[-0.025em]">{title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-[#667085]">{copy}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">{cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-[#0A234F]/10 bg-[#F8F7F4] py-20">
          <div className="mx-auto grid max-w-[1480px] gap-12 px-6 lg:grid-cols-12 lg:px-10">
            <div className="lg:col-span-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">How commerce moves</p>
              <h2 className="mt-3 font-serif text-4xl tracking-[-0.03em] sm:text-5xl">From discovery to ongoing account management.</h2>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#667085]">
                Loadify keeps the customer-facing journey connected while buyer, seller and fulfilment responsibilities remain clear underneath it.
              </p>
              <Link to="/how-it-works" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">See how Loadify works <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
            <div className="lg:col-span-7">
              <div className="overflow-hidden rounded-[26px] border border-[#0A234F]/10 bg-white shadow-[0_18px_50px_rgba(10,35,79,0.05)]">
                {lifecycle.map(([step, title, copy]) => (
                  <div key={step} className="grid gap-2 border-b border-[#0A234F]/[0.07] px-6 py-5 last:border-0 sm:grid-cols-[52px_130px_1fr] sm:items-start">
                    <span className="text-[11px] font-black text-[#8A7351]">{step}</span>
                    <span className="text-base font-extrabold">{title}</span>
                    <span className="text-sm leading-6 text-[#667085]">{copy}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto grid max-w-[1480px] gap-6 px-6 lg:grid-cols-3 lg:px-10">
            <div className="rounded-[26px] bg-[#0A234F] p-8 text-white lg:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Suppliers, partners & technology</p>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl tracking-[-0.03em]">Clear routes for organisations that want to work with Loadify.</h2>
              <p className="mt-5 max-w-3xl text-[15px] leading-7 text-white/70">
                Supplier participation, commercial partnerships and technology connectivity are separate conversations. Each route starts with the operating model and the evidence needed for the capability being discussed.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/suppliers" className="rounded-lg bg-[#F5A300] px-5 py-3 text-sm font-extrabold text-[#0A234F]">Suppliers</Link>
                <Link to="/integrations" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white">Integrations</Link>
                <Link to="/partners" className="rounded-lg border border-white/20 px-5 py-3 text-sm font-bold text-white">Partners</Link>
              </div>
            </div>
            <div className="rounded-[26px] border border-[#0A234F]/10 bg-[#F8F7F4] p-8">
              <ShieldCheck className="h-7 w-7 text-[#8A7351]" aria-hidden="true" />
              <p className="mt-7 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Trust & governance</p>
              <h3 className="mt-3 font-serif text-3xl tracking-[-0.025em]">Evidence before activation.</h3>
              <p className="mt-4 text-sm leading-7 text-[#667085]">Marketplace rules, role-aware controls and capability-scoped integration paths create clear operating boundaries.</p>
              <Link to="/trust" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold">Explore trust <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          </div>
        </section>

        <section className="bg-[#F8F7F4] py-20">
          <div className="mx-auto max-w-[1180px] px-6 text-center">
            <Users className="mx-auto h-6 w-6 text-[#8A7351]" aria-hidden="true" />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Choose your next step</p>
            <h2 className="mx-auto mt-3 max-w-4xl font-serif text-4xl tracking-[-0.03em] sm:text-5xl">Enter the marketplace or explore the part of Loadify built for your role.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#667085]">Buy, sell, source for a business or discuss working with Loadify through a dedicated route.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/marketplace" className="rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-extrabold text-white">Open Marketplace</Link>
              <Link to="/platform" className="rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-extrabold text-[#0A234F]">Explore Platform</Link>
            </div>
          </div>
        </section>
      </main>
    </PresentationLayout>
  );
}
