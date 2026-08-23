import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CreditCard,
  LayoutGrid,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';

const VALUE_CARDS = [
  {
    icon: ShoppingBag,
    title: 'Built for buyers',
    description: 'Discover live marketplace products, compare listings and move from product discovery to checkout in one connected experience.',
  },
  {
    icon: Store,
    title: 'Built for serious sellers',
    description: 'Create and manage listings, follow marketplace orders and operate from a dedicated seller environment.',
  },
  {
    icon: CreditCard,
    title: 'Connected commerce',
    description: 'Stripe-powered checkout and platform order flows stay connected to the marketplace instead of living in separate tools.',
  },
];

const PLATFORM_PILLARS = [
  { icon: BadgeCheck, label: 'Seller onboarding' },
  { icon: PackageCheck, label: 'Live product listings' },
  { icon: ShieldCheck, label: 'Protected account boundaries' },
  { icon: Truck, label: 'Order & fulfilment tracking' },
];

export function HomepageWhySection() {
  return (
    <section className="bg-white py-16 lg:py-20" aria-labelledby="homepage-why-title">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D57D8]">One marketplace, two sides</p>
          <h2 id="homepage-why-title" className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#0A234F] sm:text-4xl">
            A cleaner way to buy and sell on Loadify.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
            The homepage should explain the platform quickly: buyers can discover real products, sellers can build a storefront, and both sides stay inside one connected marketplace journey.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {VALUE_CARDS.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-[24px] border border-[#0A234F]/10 bg-[#F8FAFD] p-6 shadow-[0_14px_34px_rgba(10,35,79,0.06)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#1D57D8] shadow-sm">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-xl font-black text-[#0A234F]">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepagePlatformStrip() {
  return (
    <section className="bg-[#0A234F] py-8 text-white" aria-label="Loadify marketplace platform pillars">
      <div className="mx-auto grid w-full max-w-[1280px] gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
        {PLATFORM_PILLARS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5A300] text-[#0A234F]">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-sm font-extrabold">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomepageCategoriesSection() {
  const { categories, loading } = useCategories();
  const visible = categories.slice(0, 8);

  return (
    <section className="bg-[#F7F9FC] py-16 lg:py-20" aria-labelledby="homepage-categories-title">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D57D8]">Explore the marketplace</p>
            <h2 id="homepage-categories-title" className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#0A234F] sm:text-4xl">
              Browse by category
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Categories are loaded from the current Loadify catalogue, so the homepage stays aligned with what is actually available on the platform.
            </p>
          </div>
          <Link to="/categories" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#1D57D8] hover:text-[#0A234F]">
            View all categories <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {loading && Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-[118px] animate-pulse rounded-[22px] border border-[#0A234F]/8 bg-white" />
          ))}

          {!loading && visible.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.slug}`}
              className="group flex min-h-[118px] items-center gap-4 rounded-[22px] border border-[#0A234F]/10 bg-white p-5 shadow-[0_12px_28px_rgba(10,35,79,0.05)] transition-all duration-200 hover:-translate-y-1 hover:border-[#1D57D8]/30 hover:shadow-[0_18px_38px_rgba(10,35,79,0.10)]"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#1D57D8] transition-colors group-hover:bg-[#1D57D8] group-hover:text-white">
                <Boxes className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-black leading-5 text-[#0A234F]">{category.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Explore listings</p>
              </div>
            </Link>
          ))}

          {!loading && visible.length === 0 && (
            <Link to="/catalog" className="col-span-full flex min-h-[118px] items-center justify-center gap-3 rounded-[22px] border border-dashed border-[#0A234F]/20 bg-white p-5 text-sm font-extrabold text-[#0A234F]">
              <LayoutGrid className="h-5 w-5 text-[#1D57D8]" aria-hidden="true" />
              Browse the full catalogue
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function HomepageFinalCTA() {
  return (
    <section className="bg-white py-16 lg:py-20" aria-label="Join Loadify Market">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-[30px] bg-[#0A234F] px-6 py-10 text-white shadow-[0_28px_70px_rgba(10,35,79,0.20)] sm:px-10 lg:px-14 lg:py-12">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#1D57D8]/35 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-[#F5A300]/18 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F5A300]">Ready when you are</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Shop the marketplace or start selling.</h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                Browse current marketplace listings today, or create a seller account and build your presence on Loadify.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link to="/catalog" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-6 py-3 text-sm font-black text-[#0A234F] transition-colors hover:bg-[#E69500]">
                Browse marketplace <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link to="/register?type=seller" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/[0.06] px-6 py-3 text-sm font-black text-white transition-colors hover:bg-white/10">
                Start selling <Store className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
