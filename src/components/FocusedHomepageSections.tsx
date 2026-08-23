import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Package,
  PackagePlus,
  PoundSterling,
  Search,
  ShieldCheck,
  Store,
  TrendingUp,
  Truck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import logo from '@/assets/loadify-logo.svg';

const shell = 'mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8';

export function FocusedTrustSection() {
  return (
    <section className="border-y border-slate-200 bg-slate-50/70 py-6">
      <div className={`${shell} flex flex-col items-center justify-center gap-5 text-sm text-slate-600 sm:flex-row sm:gap-10`}>
        <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-700" /> Trusted marketplace experience</span>
        <span className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#635BFF]" /> Secure payments via Stripe</span>
        <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> UK-operated platform</span>
      </div>
    </section>
  );
}

const sellerBenefits = [
  [Users, 'Reach real marketplace buyers', 'Present stock to buyers already browsing Loadify rather than managing disconnected sales channels.'],
  [TrendingUp, 'Move stock more efficiently', 'List products and manage marketplace activity from one dedicated seller journey.'],
  [Package, 'Support different product volumes', 'Build listings for individual products, lots and broader stock opportunities as the catalogue grows.'],
  [PoundSterling, 'Connected payment flow', 'Marketplace payments are handled through the platform’s current Stripe-powered commerce flow.'],
] as const;

export function FocusedWhySellSection() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className={shell}>
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-blue-700">For Sellers</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your Stock Deserves Real Buyers</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">Build your seller presence on Loadify and put current listings in front of marketplace buyers.</p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {sellerBenefits.map(([Icon, title, description]) => (
            <article key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-[0_6px_18px_rgba(30,64,175,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_28px_rgba(30,64,175,0.09)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50"><Icon className="h-5 w-5 text-blue-700" /></div>
              <div><h3 className="font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p></div>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center"><Link to="/register?type=seller" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">Start Selling Today <ArrowRight className="h-5 w-5" /></Link></div>
      </div>
    </section>
  );
}

const features = [
  [Package, 'Multi-Vendor Marketplace', 'Multiple sellers can manage marketplace listings in one unified platform.'],
  [Zap, 'Buy & Sell Faster', 'Streamlined browsing, listing and purchasing journeys reduce unnecessary friction.'],
  [ShieldCheck, 'Seller Readiness Controls', 'Seller access and onboarding remain governed by the current Loadify readiness contracts.'],
  [CreditCard, 'Secure Payments', 'Current checkout flows remain connected to Stripe-powered commerce controls.'],
  [Truck, 'Order & Fulfilment Tracking', 'Marketplace orders continue through the current order and fulfilment experience.'],
  [BarChart3, 'Buyer & Seller Workspaces', 'Dedicated account areas support each side of the marketplace.'],
] as const;

export function FocusedFeaturesSection() {
  return (
    <section id="features" className="bg-white py-24">
      <div className={shell}>
        <div className="mx-auto mb-16 max-w-2xl text-center"><span className="text-sm font-semibold uppercase tracking-wider text-blue-700">Platform Features</span><h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Everything You Need to Trade</h2><p className="mt-4 text-slate-600">A marketplace experience designed around buyers, sellers, products, orders and payments.</p></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(([Icon, title, description]) => <article key={title} className="group rounded-xl border border-slate-200 bg-white p-6 shadow-[0_6px_18px_rgba(30,64,175,0.05)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_14px_30px_rgba(30,64,175,0.09)]"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 transition group-hover:bg-blue-700"><Icon className="h-6 w-6 text-blue-700 transition group-hover:text-white" /></div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function FocusedStatsSection() {
  return <section className="bg-gradient-to-br from-blue-800 to-blue-600 py-12"><div className={`${shell} flex flex-col items-center justify-center gap-6 text-sm text-white/85 sm:flex-row sm:gap-12`}><span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-400" /> UK-operated marketplace</span><span className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-amber-400" /> Stripe-powered payments</span><span className="flex items-center gap-2"><Store className="h-5 w-5 text-amber-400" /> Buyer & seller journeys</span></div></section>;
}

const buyerSteps = [
  [UserPlus, '01', 'Create an Account', 'Register and access the marketplace with one Loadify identity.'],
  [Search, '02', 'Find the Products You Need', 'Browse current listings and categories across the marketplace.'],
  [PoundSterling, '03', 'Buy Through Loadify', 'Complete the current checkout flow and follow your order journey.'],
] as const;
const sellerSteps = [
  [UserPlus, '01', 'Create Your Seller Account', 'Begin with the current seller registration and readiness journey.'],
  [PackagePlus, '02', 'List Your Products', 'Create and manage marketplace listings from the seller workspace.'],
  [PoundSterling, '03', 'Sell & Manage Orders', 'Follow orders and marketplace activity through the connected platform.'],
] as const;

function StepRow({ title, steps }: { title: string; steps: typeof buyerSteps }) {
  return <div><h3 className="mb-8 text-center text-lg font-semibold text-blue-700">{title}</h3><div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">{steps.map(([Icon, step, name, description], i) => <div key={step} className="relative text-center">{i < 2 && <div className="absolute left-[60%] top-10 hidden w-[80%] border-t-2 border-dashed border-slate-200 md:block" />}<div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 text-white shadow-lg"><Icon className="h-8 w-8" /><span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">{step}</span></div><h4 className="text-lg font-semibold text-slate-900">{name}</h4><p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-slate-600">{description}</p></div>)}</div></div>;
}

export function FocusedHowItWorksSection() {
  return <section id="how-it-works" className="bg-slate-50 py-24"><div className={shell}><div className="mx-auto mb-16 max-w-2xl text-center"><span className="text-sm font-semibold uppercase tracking-wider text-blue-700">How It Works</span><h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Simple for Buyers. Simple for Sellers.</h2><p className="mt-4 text-slate-600">Two clear marketplace journeys, each connected to the current Loadify platform.</p></div><div className="space-y-16"><StepRow title="For Buyers" steps={buyerSteps} /><StepRow title="For Sellers" steps={sellerSteps} /></div><div className="mt-14 flex flex-wrap justify-center gap-4"><Link to="/catalog" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-8 py-3.5 font-bold text-white shadow-lg shadow-blue-700/20">Browse Marketplace <ArrowRight className="h-5 w-5" /></Link><Link to="/register?type=seller" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-8 py-3.5 font-bold text-white shadow-lg shadow-emerald-600/20">Create Seller Account <ArrowRight className="h-5 w-5" /></Link></div></div></section>;
}

export function FocusedCategoriesSection() {
  const { categories, loading } = useCategories();
  return <section id="categories" className="bg-white py-24"><div className={shell}><div className="mx-auto mb-16 max-w-2xl text-center"><span className="text-sm font-semibold uppercase tracking-wider text-blue-700">Categories</span><h2 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">Browse by Category</h2><p className="mt-4 text-slate-600">Explore categories from the current Loadify catalogue.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{loading ? Array.from({length:8}).map((_,i)=><div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />) : categories.slice(0,12).map((cat)=><Link key={cat.id} to={`/category/${cat.slug}`} className="group flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"><div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50"><Package className="h-5 w-5 text-blue-700" /></div><div><p className="font-semibold text-slate-900">{cat.name}</p><p className="mt-1 text-xs text-slate-500">Explore listings</p></div></Link>)}</div><div className="mt-8 text-center"><Link to="/categories" className="inline-flex items-center gap-2 font-semibold text-blue-700">View All Categories <ArrowRight className="h-4 w-4" /></Link></div></div></section>;
}

export function FocusedCTASection() {
  return <section className="bg-slate-50 py-24"><div className={shell}><div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-800 to-blue-600 p-12 text-center text-white sm:p-16"><div className="relative mx-auto max-w-2xl"><h2 className="text-3xl font-bold sm:text-4xl">Ready to Join the Marketplace?</h2><p className="mt-5 text-lg text-white/80">Browse current listings or create your seller account and continue through the current Loadify journey.</p><div className="mt-7 flex flex-col items-center justify-center gap-4 sm:flex-row"><Link to="/catalog" className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-8 py-3.5 font-semibold text-slate-900">Browse Marketplace <ArrowRight className="h-5 w-5" /></Link><Link to="/register?type=seller" className="rounded-lg border border-white/30 px-8 py-3.5 font-semibold text-white transition hover:bg-white/10">Create Seller Account</Link></div></div></div></div></section>;
}

export function FocusedHomepageFooter() {
  return <footer className="bg-slate-900 text-white"><div className={`${shell} grid gap-10 py-12 md:grid-cols-4`}><div><Link to="/" className="flex items-center gap-2"><img src={logo} alt="Loadify Market" className="h-8 w-8" /><span className="text-lg font-bold">Loadify Market</span></Link><p className="mt-4 text-sm leading-6 text-white/60">A UK-operated online marketplace connecting independent buyers and sellers.</p></div><div><h4 className="font-semibold text-amber-400">For Buyers</h4><div className="mt-4 space-y-2 text-sm text-white/60"><Link className="block hover:text-white" to="/catalog">Browse Marketplace</Link><Link className="block hover:text-white" to="/buyer/orders">Track Orders</Link><Link className="block hover:text-white" to="/faq">Help & FAQ</Link></div></div><div><h4 className="font-semibold text-amber-400">For Sellers</h4><div className="mt-4 space-y-2 text-sm text-white/60"><Link className="block hover:text-white" to="/register?type=seller">Start Selling</Link><Link className="block hover:text-white" to="/seller">Seller Workspace</Link><Link className="block hover:text-white" to="/seller-terms">Seller Terms</Link></div></div><div><h4 className="font-semibold text-amber-400">Company</h4><div className="mt-4 space-y-2 text-sm text-white/60"><Link className="block hover:text-white" to="/about">About</Link><Link className="block hover:text-white" to="/contact">Contact</Link><Link className="block hover:text-white" to="/privacy">Privacy</Link><Link className="block hover:text-white" to="/terms">Terms</Link></div></div></div><div className="border-t border-white/10"><div className={`${shell} py-4 text-xs text-white/45`}>© 2026 Loadify Market. Operated by XDrive Logistics Ltd.</div></div></footer>;
}
