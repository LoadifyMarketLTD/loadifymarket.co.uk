import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShoppingBag, Store } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import Signup from "./Signup";

const SignupEntry = () => {
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");

  if (requestedType === "buyer" || requestedType === "seller") {
    return <Signup />;
  }

  return (
    <MainLayout>
      <SEO
        title="Choose Account Type | Loadify Market"
        description="Choose whether you want to join Loadify as a Buyer or begin Marketplace Seller setup before selecting your sign-up method."
        robots="noindex, nofollow"
      />

      <main
        id="main-content"
        className="min-h-screen bg-[#F7F9FC] pb-14 pt-6 text-[#0A234F] md:pt-[150px]"
      >
        <div className="mx-auto w-full max-w-[920px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-[26px] border border-[#0A234F]/10 bg-white p-6 shadow-[0_22px_65px_rgba(10,35,79,0.10)] sm:p-9 lg:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">
                Create your Loadify account
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] text-[#0A234F] sm:text-4xl">
                Choose your account type first
              </h1>
              <p className="mt-4 text-sm font-medium leading-6 text-[#64748B] sm:text-base">
                Your choice is made before Google, Facebook or email registration. Seller accounts keep Buyer access on the same Loadify identity.
              </p>
            </div>

            <div className="mt-9 grid gap-5 md:grid-cols-2">
              <Link
                to="/register?type=buyer"
                className="group rounded-2xl border border-[#0A234F]/12 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#0E3FA9]/35 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0E3FA9]/10">
                  <ShoppingBag className="h-6 w-6 text-[#0E3FA9]" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-black text-[#0A234F]">Buyer</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Shop approved listings, save favourites, manage orders, follow deliveries and request returns.
                </p>
                <div className="mt-5 space-y-2 text-xs font-semibold text-[#475569]">
                  <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0E3FA9]" /> Buyer Space access</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0E3FA9]" /> Seller access can be added later</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#0E3FA9]">
                  Continue as Buyer <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>

              <Link
                to="/register?type=seller"
                className="group rounded-2xl border border-[#0A234F]/12 bg-white p-6 transition hover:-translate-y-0.5 hover:border-[#F5A300]/55 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5A300]/15">
                  <Store className="h-6 w-6 text-[#B96D00]" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-xl font-black text-[#0A234F]">Marketplace Seller</h2>
                <p className="mt-2 text-sm leading-6 text-[#64748B]">
                  Start Seller setup, then complete legal details, verification, store readiness and eligible payout setup.
                </p>
                <div className="mt-5 space-y-2 text-xs font-semibold text-[#475569]">
                  <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B96D00]" /> Buyer + Seller capability on one identity</p>
                  <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#B96D00]" /> Seller readiness remains controlled</p>
                </div>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-[#B96D00]">
                  Continue as Seller <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>

            <p className="mt-8 text-center text-xs text-[#64748B]">
              Already registered? <Link to="/login" className="font-extrabold text-[#0E3FA9] hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default SignupEntry;
