import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CreditCard,
  LayoutGrid,
  Package,
  PackagePlus,
  PoundSterling,
  Search,
  ShieldCheck,
  Store,
  Truck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';

const SELLER_BENEFITS = [
  {
    icon: Users,
    title: 'Reach marketplace buyers',
    description: 'Put approved listings in front of buyers already browsing Loadify Market instead of relying on disconnected sales channels.',
  },
  {
    icon: Zap,
    title: 'List and manage faster',
    description: 'Create listings, manage stock and keep marketplace activity connected to one seller environment.',
  },
  {
    icon: Package,
    title: 'A marketplace built around products',
    description: 'Sell eligible products across the active Loadify catalogue while keeping listing and order truth inside the platform.',
  },
  {
    icon: PoundSterling,
    title: '0% seller commission promotion',
    description: 'The current seller commission promotion runs until 31 December 2026, while payment handling remains governed by the live platform rules.',
  },
];

const FEATURES = [
  { icon: Package, title: 'Multi-seller marketplace', description: 'Buyer discovery and seller listings live inside one marketplace experience.' },
  { icon: Zap, title: 'Connected buying & selling', description: 'Product discovery, seller tools and marketplace order flows are designed to work together.' },
  { icon: ShieldCheck, title: 'Protected account boundaries', description: 'Buyer, seller and admin access remain separated by the current Loadify authorization model.' },
  { icon: CreditCard, title: 'Stripe-powered checkout', description: 'Checkout uses the current Stripe-backed payment flow rather than a separate demo payment layer.' },
  { icon: Truck, title: 'Order & fulfilment tracking', description: 'Marketplace orders remain connected to shipping, tracking and fulfilment state.' },
  { icon: BarChart3, title: 'Buyer & seller workspaces', description: 'Dedicated account areas support the two sides of the marketplace without duplicating platform truth.' },
];

const BUYER_STEPS = [
  { icon: UserPlus, step: '01', title: 'Create your account', description: 'Register, verify your email and enter the marketplace with the current buyer flow.' },
  { icon: Search, step: '02', title: 'Find live products', description: 'Browse current approved marketplace listings and categories.' },
  { icon: PoundSterling, step: '03', title: 'Checkout & track', description: 'Purchase eligible products through the active checkout flow and follow your order.' },
];

const SELLER_STEPS = [
  { icon: UserPlus, step: '01', title: 'Start seller onboarding', description: 'Create a seller relationship and complete the current marketplace onboarding requirements.' },
  { icon: PackagePlus, step: '02', title: 'Create your listings', description: 'Add eligible products and manage them from the seller environment.' },
  { icon: PoundSterling, step: '03', title: 'Sell through Loadify', description: 'Receive marketplace orders and use the current payment and fulfilment workflows.' },
];

export function HomepageWhySection() {
  return (
    <>
      <section className="bg-[#F8FAFC] py-20 sm:py-24" aria-labelledby="seller-value-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#1D57D8]">For sellers</span>
            <h2 id="seller-value-title" className="mt-3 text-3xl font-black tracking-[-0.025em] text-[#182235] sm:text-4xl">Your products deserve real marketplace visibility</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">Bring your catalogue to one connected marketplace and manage listings, orders and seller activity from Loadify.</p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            {SELLER_BENEFITS.map(({ icon: Icon, title, description }) => (
              <article key={title} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(29,87,216,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#1D57D8]/25 hover:shadow-[0_16px_38px_rgba(29,87,216,0.09)]">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#1D57D8]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-extrabold text-[#182235]">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/register?type=seller" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-base font-extrabold text-white shadow-[0_12px_28px_rgba(5,150,105,0.18)] hover:bg-emerald-700">
              Start Selling Today <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24" aria-labelledby="features-title">
        <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#1D57D8]">Platform features</span>
            <h2 id="features-title" className="mt-3 text-3xl font-black tracking-[-0.025em] text-[#182235] sm:text-4xl">Everything you need to use the marketplace</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">The visual structure comes from the focused-image-craft blueprint, while the capabilities described here stay aligned with Loadify today.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <article key={title} className="group rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 shadow-[0_6px_20px_rgba(29,87,216,0.04)] transition-all hover:-translate-y-1 hover:border-[#1D57D8]/25 hover:bg-white hover:shadow-[0_16px_36px_rgba(29,87,216,0.09)]">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#1D57D8] transition-colors group-hover:bg-[#1D57D8] group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-extrabold text-[#182235]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function HomepagePlatformStrip() {
  return (
    <section className="bg-gradient-to-r from-[#0A2F73] to-[#1D57D8] py-12 text-white" aria-label="Loadify trust and platform signals">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center justify-center gap-6 px-4 sm:flex-row sm:gap-12 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 text-sm font-semibold text-white/85"><ShieldCheck className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />UK-operated marketplace</div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white/85"><CreditCard className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />Stripe-powered checkout</div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white/85"><Truck className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />Order & fulfilment tracking</div>
      </div>
    </section>
  );
}

function StepRow({ title, steps }: { title: string; steps: typeof BUYER_STEPS }) {
  return (
    <div>
      <h3 className="mb-8 text-center text-lg font-extrabold text-[#1D57D8]">{title}</h3>
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
        {steps.map((item, index) => (
          <div key={item.step} className="group relative text-center">
            {index < steps.length - 1 && <div className="absolute left-[60%] top-10 hidden w-[80%] border-t-2 border-dashed border-slate-300 md:block" aria-hidden="true" />}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0A2F73] to-[#1D57D8] text-white shadow-[0_12px_30px_rgba(29,87,216,0.18)] transition-transform group-hover:scale-105">
              <item.icon className="h-8 w-8" aria-hidden="true" />
              <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#F5A300] text-xs font-black text-[#182235]">{item.step}</span>
            </div>
            <h4 className="text-lg font-extrabold text-[#182235]">{item.title}</h4>
            <p className="mx-auto mt-2 max-w-[260px] text-sm leading-6 text-slate-600">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HomepageHowItWorksSection() {
  return (
    <section className="bg-slate-50 py-20 sm:py-24" aria-labelledby="how-it-works-title">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#1D57D8]">How it works</span>
          <h2 id="how-it-works-title" className="mt-3 text-3xl font-black tracking-[-0.025em] text-[#182235] sm:text-4xl">Simple for buyers. Simple for sellers.</h2>
          <p className="mt-4 text-slate-600">Two clear marketplace journeys, each aligned with the current Loadify flows.</p>
        </div>
        <div className="space-y-16">
          <StepRow title="For Buyers" steps={BUYER_STEPS} />
          <StepRow title="For Sellers" steps={SELLER_STEPS} />
        </div>
        <div className="mt-14 flex flex-wrap justify-center gap-4">
          <Link to="/catalog" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1D57D8] px-8 py-3 text-base font-extrabold text-white hover:bg-[#1748B8]">Browse Marketplace <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
          <Link to="/register?type=seller" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-base font-extrabold text-white hover:bg-emerald-700">Create Seller Account <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  );
}

export function HomepageCategoriesSection() {
  const { categories, loading } = useCategories();
  const visible = categories.slice(0, 8);

  return (
    <section className="bg-white py-20 sm:py-24" aria-labelledby="homepage-categories-title">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#1D57D8]">Categories</span>
          <h2 id="homepage-categories-title" className="mt-3 text-3xl font-black tracking-[-0.025em] text-[#182235] sm:text-4xl">Browse by category</h2>
          <p className="mt-4 text-slate-600">These cards use the active Loadify category tree rather than the backup repository's old hardcoded counts.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading && Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50" />)}
          {!loading && visible.map((category) => (
            <Link key={category.id} to={`/category/${category.slug}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 transition-all hover:-translate-y-0.5 hover:border-[#1D57D8]/30 hover:bg-white hover:shadow-[0_12px_30px_rgba(29,87,216,0.08)]">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#1D57D8] group-hover:bg-[#1D57D8] group-hover:text-white"><Boxes className="h-6 w-6" aria-hidden="true" /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-[#182235]">{category.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Explore listings</p>
              </div>
            </Link>
          ))}
          {!loading && visible.length === 0 && <Link to="/catalog" className="col-span-full flex min-h-24 items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 font-bold text-[#182235]"><LayoutGrid className="h-5 w-5 text-[#1D57D8]" aria-hidden="true" />Browse the full catalogue</Link>}
        </div>

        <div className="mt-8 text-center"><Link to="/categories" className="inline-flex items-center gap-2 font-extrabold text-[#1D57D8] hover:underline">View all categories <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></div>
      </div>
    </section>
  );
}

export function HomepageFinalCTA() {
  return (
    <section className="bg-slate-50 py-20 sm:py-24" aria-label="Join Loadify Market">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A2F73] to-[#1D57D8] p-10 text-center text-white shadow-[0_24px_60px_rgba(29,87,216,0.18)] sm:p-16">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#F5A300]/10 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/5 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl space-y-6">
            <h2 className="text-3xl font-black tracking-[-0.025em] sm:text-4xl">Ready to join the marketplace?</h2>
            <p className="text-lg leading-8 text-white/80">Browse current Loadify listings or start the seller journey with the platform that exists today.</p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/catalog" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-8 py-3 text-base font-extrabold text-[#182235] hover:bg-[#E99A00]">Browse Marketplace <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
              <Link to="/register?type=seller" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-8 py-3 text-base font-extrabold text-white hover:bg-emerald-600 hover:border-emerald-600">Create Seller Account <Store className="h-5 w-5" aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
