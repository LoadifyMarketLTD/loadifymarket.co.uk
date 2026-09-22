import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, PackageSearch, ShoppingBag, Store } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const SignupEntry = () => (
  <MainLayout>
    <SEO
      title="Choose How to Join | Loadify Market"
      description="Choose Buyer or Marketplace Seller access. Suppliers and wholesalers use Loadify's separate business application route."
      robots="noindex, nofollow"
    />

    <main id="main-content" className="min-h-screen bg-[#F7F9FC] pb-14 pt-6 text-[#0A234F] md:pt-[150px]">
      <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-6 lg:px-8">
        <section className="rounded-[26px] border border-[#0A234F]/10 bg-white px-5 py-7 shadow-[0_18px_55px_rgba(10,35,79,0.08)] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">Join Loadify Market</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] text-[#0A234F] sm:text-[38px]">
              Choose your account type
            </h1>
            <p className="mt-3 text-sm font-medium leading-6 text-[#64748B] sm:text-[15px]">
              Create Buyer access to shop, or start Marketplace Seller setup to sell through Loadify.
            </p>
          </div>

          <div className="mx-auto mt-7 grid max-w-4xl gap-4 md:grid-cols-2">
            <Link
              to="/register?type=buyer"
              className="group flex min-h-[290px] flex-col rounded-[22px] border border-[#0A234F]/12 bg-white p-6 shadow-[0_12px_32px_rgba(10,35,79,0.07)] transition hover:-translate-y-0.5 hover:border-[#0E3FA9]/35 hover:shadow-[0_18px_42px_rgba(10,35,79,0.11)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A234F]">
                <ShoppingBag className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#0E3FA9]">Buyer</p>
              <h2 className="mt-1.5 text-2xl font-black text-[#0A234F]">Shop on Loadify</h2>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">
                Browse listings, save favourites, place orders, track deliveries and request returns.
              </p>
              <div className="mt-5 space-y-2 text-xs font-semibold text-[#334155]">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" />
                  Buyer Space access
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" />
                  Seller capability can be added later
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-extrabold text-[#0E3FA9]">
                Continue as Buyer
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>

            <Link
              to="/register?type=seller"
              className="group flex min-h-[290px] flex-col rounded-[22px] border border-[#0A234F]/12 bg-white p-6 shadow-[0_12px_32px_rgba(10,35,79,0.07)] transition hover:-translate-y-0.5 hover:border-[#0E3FA9]/35 hover:shadow-[0_18px_42px_rgba(10,35,79,0.11)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0A234F]">
                <Store className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#0E3FA9]">Marketplace Seller</p>
              <h2 className="mt-1.5 text-2xl font-black text-[#0A234F]">Sell on Loadify</h2>
              <p className="mt-3 text-sm leading-6 text-[#64748B]">
                Create seller access, complete your business profile and connect eligible payout setup before your store goes live.
              </p>
              <div className="mt-5 space-y-2 text-xs font-semibold text-[#334155]">
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" />
                  Buyer + Seller capability on one identity
                </p>
                <p className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" />
                  Store access remains readiness-controlled
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-extrabold text-[#0E3FA9]">
                Continue as Seller
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>

          <div className="mx-auto mt-5 flex max-w-4xl flex-col gap-4 rounded-[18px] border border-[#F5A300]/30 bg-[#FFF9EC] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <PackageSearch className="h-5 w-5 text-[#0A234F]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[#0A234F]">Manufacturer, wholesaler, importer or distributor?</h2>
                <p className="mt-1 text-xs leading-5 text-[#64748B]">
                  Supplier participation is a separate business application route — it is not a third marketplace account type.
                </p>
              </div>
            </div>
            <Link
              to="/suppliers/apply"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0A234F] px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#0E3FA9]"
            >
              Supplier application
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <p className="mt-6 text-center text-xs text-[#64748B]">
            Already registered?{" "}
            <Link to="/login" className="font-extrabold text-[#0E3FA9] hover:underline">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  </MainLayout>
);

export default SignupEntry;
