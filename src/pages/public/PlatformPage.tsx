import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CreditCard,
  Network,
  PackageSearch,
  ShieldCheck,
  Store,
  Truck,
  Users,
} from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const roleCards = [
  {
    icon: PackageSearch,
    eyebrow: "Buy",
    title: "For marketplace buyers",
    copy: "Discover products, purchase through Loadify and keep orders, favourites, addresses, reviews and account activity connected through Buyer Space.",
    to: "/buyers",
    cta: "Explore buying",
  },
  {
    icon: Store,
    eyebrow: "Sell",
    title: "For sellers",
    copy: "Create listings, manage marketplace orders, shipments and returns, and follow the eligible payout path through Seller Space.",
    to: "/sellers",
    cta: "Explore selling",
  },
  {
    icon: Building2,
    eyebrow: "Business",
    title: "For trade and commercial buyers",
    copy: "Use a dedicated business buying path for trader and organisation details, marketplace sourcing and Buyer Space account management.",
    to: "/trade",
    cta: "Explore trade",
  },
  {
    icon: Network,
    eyebrow: "Connect",
    title: "For suppliers and integration partners",
    copy: "Discuss controlled supplier, commercial and technology participation through evidence-based onboarding and integration paths.",
    to: "/integrations",
    cta: "Explore integrations",
  },
] as const;

const lifecycle = [
  { step: "01", title: "Discover", copy: "Buyers find marketplace listings through search, categories and product pages." },
  { step: "02", title: "Choose", copy: "Product and seller information helps buyers evaluate the listing before checkout." },
  { step: "03", title: "Purchase", copy: "The customer completes Loadify checkout through the platform's Stripe-backed payment flow." },
  { step: "04", title: "Fulfil", copy: "The responsible seller or authorised fulfilment path progresses the order according to the applicable commerce model." },
  { step: "05", title: "Track", copy: "Shipment and tracking information keeps order progress visible to the customer where available." },
  { step: "06", title: "Manage", copy: "Buyer and seller workspaces keep orders, support, returns, reviews and account activity connected after checkout." },
] as const;

const trustPoints = [
  {
    icon: ShieldCheck,
    title: "Controlled marketplace access",
    copy: "Role-aware account controls, seller readiness rules and marketplace policies create clear operating boundaries.",
  },
  {
    icon: CreditCard,
    title: "Structured payment flow",
    copy: "Customer checkout is Stripe-backed, while seller payout wording remains qualified by eligibility and setup requirements.",
  },
  {
    icon: Truck,
    title: "Order visibility",
    copy: "Marketplace orders, seller shipment workflows and public tracking keep fulfilment progress connected to the customer journey.",
  },
  {
    icon: BadgeCheck,
    title: "Evidence before integration activation",
    copy: "Supplier and provider connectivity is capability-scoped and controlled; an API or commercial conversation alone does not make an integration live.",
  },
] as const;

export default function PlatformPage() {
  return (
    <MainLayout>
      <SEO
        title="Loadify Market Platform | Marketplace for Buyers, Sellers & Business"
        description="Explore Loadify Market — a UK-operated marketplace with connected buyer and seller environments, marketplace ordering, tracking and controlled business integration paths."
        canonical="/platform"
      />

      <main id="main-content" className="bg-[#F8F7F4] text-[#0A234F] md:pt-[122px]">
        <section className="relative overflow-hidden border-b border-[#0A234F]/10 bg-[#F8F7F4]">
          <div className="pointer-events-none absolute -right-44 -top-40 h-[520px] w-[520px] rounded-full bg-[#1D57D8]/[0.08] blur-3xl" aria-hidden="true" />
          <div className="mx-auto grid min-h-[650px] max-w-[1480px] items-center gap-12 px-5 py-16 sm:px-7 lg:grid-cols-12 lg:px-10 lg:py-20">
            <div className="relative lg:col-span-7">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#8A7351]">Loadify Market Platform</p>
              <h1 className="mt-5 max-w-[850px] font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.04em] text-[#0A234F] sm:text-[3.8rem] lg:text-[4.6rem]">
                One marketplace. Multiple ways to buy, sell and connect.
              </h1>
              <p className="mt-7 max-w-[760px] text-[16px] leading-7 text-[#5A6578] sm:text-[18px] sm:leading-8">
                Loadify Market brings product discovery, marketplace ordering and connected buyer and seller environments together, with controlled paths for trade, suppliers and technology partners.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/marketplace"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#071A3C]"
                >
                  Explore Marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/partners"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F] transition-colors hover:bg-[#0A234F]/[0.035]"
                >
                  Work with Loadify
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="rounded-[26px] border border-[#0A234F]/10 bg-white p-5 shadow-[0_22px_65px_rgba(10,35,79,0.09)] sm:p-7">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Commerce map</p>
                <div className="mt-5 space-y-3">
                  {[
                    ["Discover", "Marketplace search, categories and product pages"],
                    ["Order", "Loadify cart, checkout and canonical customer order"],
                    ["Operate", "Buyer Space and Seller Space workflows"],
                    ["Fulfil", "Seller or authorised fulfilment responsibility"],
                    ["Track", "Shipment and order visibility"],
                    ["Govern", "Policies, readiness controls and evidence-gated integrations"],
                  ].map(([label, copy], index) => (
                    <div key={label} className="grid grid-cols-[36px_1fr] gap-3 border-b border-[#0A234F]/[0.07] pb-3 last:border-b-0 last:pb-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0A234F] text-[10px] font-black text-white">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-[#0A234F]">{label}</p>
                        <p className="mt-1 text-[12px] leading-5 text-[#667085]">{copy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[#0A234F]/10 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Choose your path</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.025em] text-[#0A234F] sm:text-4xl">
                The platform should make sense from the first click.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-[#667085]">
                Buyers, sellers, business users and integration teams should not need the same page or the same explanation. Loadify routes each audience to the environment and next step that matters to them.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {roleCards.map(({ icon: Icon, eyebrow, title, copy, to, cta }) => (
                <article key={title} className="flex min-h-[300px] flex-col rounded-[22px] border border-[#0A234F]/10 bg-[#F8F7F4] p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A234F] text-[#F5A300]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="mt-6 text-[10px] font-black uppercase tracking-[0.17em] text-[#8A7351]">{eyebrow}</p>
                  <h3 className="mt-2 text-xl font-black tracking-[-0.02em] text-[#0A234F]">{title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#667085]">{copy}</p>
                  <Link to={to} className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0A234F]">
                    {cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F7F9FC] py-16 sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
              <div className="lg:sticky lg:top-[160px]">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8A7351]">Marketplace lifecycle</p>
                <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight tracking-[-0.025em] text-[#0A234F] sm:text-4xl">
                  From discovery to ongoing account management.
                </h2>
                <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#667085]">
                  Loadify keeps the customer-facing commerce journey connected while the responsible seller, fulfilment path and platform controls retain distinct roles underneath it.
                </p>
                <Link to="/how-it-works" className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0A234F]">
                  See how Loadify works <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="overflow-hidden rounded-[26px] border border-[#0A234F]/10 bg-white shadow-[0_18px_50px_rgba(10,35,79,0.06)]">
                {lifecycle.map(({ step, title, copy }) => (
                  <div key={step} className="grid gap-3 border-b border-[#0A234F]/[0.08] px-5 py-5 last:border-b-0 sm:grid-cols-[68px_150px_1fr] sm:items-start sm:px-7 sm:py-6">
                    <span className="text-[11px] font-black tracking-[0.16em] text-[#8A7351]">{step}</span>
                    <h3 className="text-base font-black text-[#0A234F]">{title}</h3>
                    <p className="text-sm leading-6 text-[#667085]">{copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0A234F] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-[1480px] px-5 sm:px-7 lg:px-10">
            <div className="max-w-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Trust is part of the architecture</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight tracking-[-0.025em] text-white sm:text-4xl">
                Clear roles, controlled access and evidence before activation.
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-white/70">
                Loadify's public proposition should reflect the controls behind the marketplace without overstating guarantees, certifications or provider capabilities.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {trustPoints.map(({ icon: Icon, title, copy }) => (
                <article key={title} className="rounded-[20px] border border-white/10 bg-white/[0.045] p-6">
                  <Icon className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
                  <h3 className="mt-5 text-base font-extrabold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/68">{copy}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/trust" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#F5A300] px-5 py-2.5 text-sm font-extrabold text-[#0A234F]">
                Explore Trust & Safety <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/about" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/[0.06]">
                About Loadify
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-[#F8F7F4] py-16 sm:py-20">
          <div className="mx-auto max-w-[1180px] px-5 text-center sm:px-7">
            <Users className="mx-auto h-6 w-6 text-[#8A7351]" aria-hidden="true" />
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl leading-tight tracking-[-0.025em] text-[#0A234F] sm:text-4xl">
              Find the part of Loadify built for your role.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-7 text-[#667085]">
              Shop the marketplace, start selling, explore business buying, discuss supplier participation or open an integration conversation.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/marketplace" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#0A234F] px-6 py-3 text-sm font-bold text-white">Browse Marketplace</Link>
              <Link to="/register?type=seller" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Start Selling</Link>
              <Link to="/partners" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#0A234F]/15 bg-white px-6 py-3 text-sm font-bold text-[#0A234F]">Partner with Loadify</Link>
            </div>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}