import { Link } from "react-router-dom";
import {
  BadgeCheck,
  ShieldCheck,
  Store,
  ArrowRight,
  Star,
  CheckCircle2,
  Package,
  Sparkles,
  Wallet,
  Users,
  Layers3,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const categories = [
  { name: "Electronics", count: "85+ listings", image: "/images/mock/electronics.jpg" },
  { name: "Fashion", count: "200+ listings", image: "/images/mock/fashion.jpg" },
  { name: "Home & Kitchen", count: "95+ listings", image: "/images/mock/home.jpg" },
  { name: "Beauty", count: "110+ listings", image: "/images/mock/beauty.jpg" },
  { name: "Tools", count: "55+ listings", image: "/images/mock/tools.jpg" },
  { name: "Office", count: "45+ listings", image: "/images/mock/office.jpg" },
  { name: "Baby", count: "50+ listings", image: "/images/mock/baby.jpg" },
  { name: "Automotive", count: "40+ listings", image: "/images/mock/automotive.jpg" },
  { name: "Mixed Lots", count: "120+ listings", image: "/images/mock/mixed.jpg" },
  { name: "Clearance", count: "150+ listings", image: "/images/mock/clearance.jpg" },
  { name: "Returns", count: "90+ listings", image: "/images/mock/returns.jpg" },
  { name: "Overstock", count: "130+ listings", image: "/images/mock/overstock.jpg" },
];

const listings = [
  { title: "Smartwatch Bundle", price: "£89", category: "Electronics", image: "/images/mock/listing-smartwatch.jpg" },
  { title: "Designer Bag", price: "£120", category: "Fashion", image: "/images/mock/listing-bag.jpg" },
  { title: "Office Chair", price: "£145", category: "Office", image: "/images/mock/listing-chair.jpg" },
  { title: "Tool Kit Set", price: "£65", category: "Tools", image: "/images/mock/listing-toolkit.jpg" },
  { title: "Skincare Bundle", price: "£49", category: "Beauty", image: "/images/mock/listing-skincare.jpg" },
  { title: "Laptop Deal", price: "£299", category: "Electronics", image: "/images/mock/listing-laptop.jpg" },
  { title: "Wireless Headphones", price: "£39", category: "Electronics", image: "/images/mock/listing-headphones.jpg" },
  { title: "Minimal Desk", price: "£99", category: "Home & Kitchen", image: "/images/mock/listing-desk.jpg" },
];

const featureCards = [
  {
    icon: Layers3,
    title: "Multi-Category Marketplace",
    text: "A flexible platform where sellers across many categories can list and buyers can discover trusted offers.",
  },
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    text: "Trust-led onboarding helps keep the marketplace professional, safer, and more credible.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    text: "Clear checkout flow and secure payment infrastructure for smooth buyer and seller transactions.",
  },
  {
    icon: Users,
    title: "Buyer & Seller Accounts",
    text: "One platform, two journeys — buyers discover and purchase, sellers list and manage their offers.",
  },
  {
    icon: Package,
    title: "Fast Product Discovery",
    text: "Clean browsing, strong categories, and featured listings help buyers find what matters faster.",
  },
  {
    icon: Wallet,
    title: "Business-Friendly Growth",
    text: "A marketplace built to help sellers gain visibility and help buyers connect with serious suppliers.",
  },
];

function TrustPill({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-white/90 backdrop-blur">
      <Icon className="h-4 w-4 text-emerald-300" />
      <span>{text}</span>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ListingCard({
  image,
  title,
  price,
  category,
}: {
  image: string;
  title: string;
  price: string;
  category: string;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/mock/hero-collage.jpg";
          }}
        />
      </div>
      <div className="space-y-2 p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-sky-600">{category}</div>
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{title}</h3>
        <div className="text-base font-bold text-slate-900">{price}</div>
      </div>
    </div>
  );
}

function CategoryCard({
  name,
  count,
  image,
}: {
  name: string;
  count: string;
  image: string;
}) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="aspect-[16/9] overflow-hidden bg-slate-100">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/images/mock/hero-collage.jpg";
          }}
        />
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-sm font-semibold text-slate-900">{name}</h3>
        <p className="text-xs text-slate-500">{count}</p>
      </div>
    </div>
  );
}

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <main>
        <section className="border-b border-slate-200 bg-slate-950">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-2 lg:items-center lg:px-6 lg:py-10">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-300">
                UK's Trusted Marketplace Platform
              </div>

              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                  The UK Marketplace
                  <br />
                  Connecting <span className="text-sky-400">Buyers</span> &{" "}
                  <span className="text-emerald-400">Sellers</span>
                </h1>

                <p className="max-w-xl text-lg leading-relaxed text-slate-300">
                  Discover trusted suppliers, list your products, and grow your business — all in one secure platform.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TrustPill icon={BadgeCheck} text="Verified Sellers" />
                <TrustPill icon={ShieldCheck} text="Secure Payments" />
                <TrustPill icon={Store} text="Free to Join" />
                <TrustPill icon={Sparkles} text="Marketplace for Many Categories" />
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-600"
                >
                  Browse Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition hover:bg-emerald-600"
                >
                  Start Selling
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-500/20 to-emerald-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
                <div className="absolute inset-0">
                  <img
                    src="/images/mock/hero-collage.jpg"
                    alt="Collection of marketplace products including electronics, fashion, home goods and more"
                    className="h-full w-full object-cover opacity-25"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/images/mock/electronics.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/55" />
                </div>

                <div className="relative space-y-4 p-5">
                  <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Loadify Market</div>
                      <div className="text-xs text-slate-500">Live marketplace</div>
                    </div>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                      <Star className="h-4 w-4 fill-current" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <StatCard value="500+" label="Active Listings" />
                    <StatCard value="120+" label="Verified Sellers" />
                    <StatCard value="16" label="Categories" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {listings.slice(0, 4).map((item) => (
                      <div key={item.title} className="overflow-hidden rounded-2xl bg-white shadow-sm">
                        <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/images/mock/hero-collage.jpg";
                            }}
                          />
                        </div>
                        <div className="space-y-1 p-3">
                          <div className="text-xs uppercase tracking-wide text-sky-600">{item.category}</div>
                          <div className="line-clamp-1 text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="text-sm font-bold text-slate-900">{item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <div className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Buyer Protection Active
                    </div>
                    <div className="text-sm font-medium text-slate-700">Secure marketplace experience</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-4 text-sm text-slate-600 lg:px-6">
            <div className="inline-flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              Verified UK Businesses
            </div>
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-500" />
              Secure Payments
            </div>
            <div className="inline-flex items-center gap-2">
              <Store className="h-4 w-4 text-indigo-500" />
              Free to Browse & Register
            </div>
            <div className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Marketplace for Many Categories
            </div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Categories</div>
                <h2 className="text-3xl font-bold text-slate-900">Browse by Category</h2>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Explore offers across multiple industries and product types from trusted marketplace sellers.
                </p>
              </div>

              <Link
                to="/catalog"
                className="hidden rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 md:inline-flex"
              >
                View all
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {categories.map((item) => (
                <CategoryCard key={item.name} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Marketplace Activity</div>
                <h2 className="text-3xl font-bold text-slate-900">Featured Listings</h2>
                <p className="mt-2 max-w-2xl text-slate-600">
                  A live marketplace should feel active. These example cards show how listings should appear across categories.
                </p>
              </div>

              <Link
                to="/catalog"
                className="hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 md:inline-flex"
              >
                Explore listings
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {listings.map((item) => (
                <ListingCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="mb-6 text-center">
              <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Why Loadify</div>
              <h2 className="text-3xl font-bold text-slate-900">Built for Buyers and Sellers</h2>
              <p className="mx-auto mt-2 max-w-2xl text-slate-600">
                One homepage, one platform, two journeys — designed to help both sides trade with confidence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">For Sellers</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Reach Real Buyers</h3>
                    <p className="mt-2 text-sm text-slate-600">List your offers where serious buyers are already browsing by category.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Sell Across Categories</h3>
                    <p className="mt-2 text-sm text-slate-600">Electronics, fashion, beauty, home, tools, office, mixed lots and more.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Build Visibility</h3>
                    <p className="mt-2 text-sm text-slate-600">Use a clean marketplace storefront to present your listings professionally.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Trade Securely</h3>
                    <p className="mt-2 text-sm text-slate-600">Benefit from secure platform flows and a trusted environment.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    to="/register?type=seller"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Start Selling
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">For Buyers</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Discover Trusted Sellers</h3>
                    <p className="mt-2 text-sm text-slate-600">Browse sellers and listings across many categories on one platform.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Compare Offers Faster</h3>
                    <p className="mt-2 text-sm text-slate-600">Explore categories, featured deals, and listings in one clean marketplace experience.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Buy with Confidence</h3>
                    <p className="mt-2 text-sm text-slate-600">Marketplace trust, verified sellers, and secure payment flow help reduce friction.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="font-semibold text-slate-900">Explore Many Categories</h3>
                    <p className="mt-2 text-sm text-slate-600">From electronics and fashion to office, beauty, home and mixed lots.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-600"
                  >
                    Browse Marketplace
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="mb-6 text-center">
              <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Platform Features</div>
              <h2 className="text-3xl font-bold text-slate-900">Everything You Need to Trade</h2>
              <p className="mx-auto mt-2 max-w-2xl text-slate-600">
                Designed as a marketplace platform first — not a seller of products, but a place where trading can happen clearly and professionally.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="mb-3 inline-flex rounded-xl bg-sky-100 p-3 text-sky-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="mb-8 text-center">
              <div className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">How It Works</div>
              <h2 className="text-3xl font-bold text-slate-900">Simple for Buyers. Simple for Sellers.</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-600">Buyer Journey</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { step: "01", title: "Create Account", text: "Join the platform and start browsing trusted listings." },
                    { step: "02", title: "Discover Offers", text: "Explore categories and compare seller listings." },
                    { step: "03", title: "Complete Deal", text: "Proceed through the platform's secure flow." },
                  ].map((item) => (
                    <div key={item.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 font-bold text-white">
                        {item.step}
                      </div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Seller Journey</div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {[
                    { step: "01", title: "Create Seller Account", text: "Register and prepare your marketplace presence." },
                    { step: "02", title: "List Products", text: "Publish offers across relevant categories." },
                    { step: "03", title: "Grow Visibility", text: "Be discovered by buyers browsing the platform." },
                  ].map((item) => (
                    <div key={item.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-bold text-white">
                        {item.step}
                      </div>
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
            <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-sky-500 via-sky-400 to-emerald-400 p-8 shadow-2xl">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold text-slate-950 md:text-4xl">Ready to Join the Marketplace?</h2>
                <p className="mt-3 text-lg text-slate-900/80">
                  Whether you want to browse trusted listings or start selling your products, Loadify gives you the platform to do it.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/catalog"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800"
                  >
                    Browse Marketplace
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    Create Free Account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
