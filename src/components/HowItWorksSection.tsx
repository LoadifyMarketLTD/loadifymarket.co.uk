import { UserPlus, Search, PackagePlus, PoundSterling, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const buyerSteps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create a Free Account",
    description: "Sign up in under 2 minutes. Browse the marketplace as a registered buyer.",
  },
  {
    icon: Search,
    step: "02",
    title: "Find the Stock You Need",
    description: "Search wholesale, clearance and pallet deals from independent UK sellers across all categories.",
  },
  {
    icon: PoundSterling,
    step: "03",
    title: "Buy & Get It Delivered",
    description: "Purchase securely via Stripe. Arrange delivery directly with the seller.",
  },
];

const sellerSteps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up & Complete Setup",
    description: "Create your free seller account, complete your profile and connect a Stripe account to start selling.",
  },
  {
    icon: PackagePlus,
    step: "02",
    title: "List Your Stock",
    description: "Upload your wholesale, clearance or overstock lines with photos and pricing. Buyers see them instantly.",
  },
  {
    icon: PoundSterling,
    step: "03",
    title: "Sell & Get Paid",
    description: "Buyers purchase your stock. Payments are processed securely via Stripe with fast payouts.",
  },
];

const StepRow = ({ title, steps }: { title: string; steps: typeof buyerSteps }) => (
  <div>
    <h3 className="text-center font-display text-lg font-semibold text-[#2563EB] mb-6">{title}</h3>
    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {steps.map((item, i) => (
        <div key={item.step} className="relative text-center group">
          {i < steps.length - 1 && (
            <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px border-t-2 border-dashed border-gray-200" />
          )}
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#2563EB] text-white mb-4 shadow-md group-hover:scale-105 transition-transform">
            <item.icon className="h-7 w-7" />
            <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
              {item.step}
            </span>
          </div>
          <h4 className="font-display text-base font-semibold text-[#0F172A] mb-1.5">{item.title}</h4>
          <p className="text-sm text-[#64748B] max-w-[260px] mx-auto leading-relaxed">{item.description}</p>
        </div>
      ))}
    </div>
  </div>
);

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-16 bg-[#F5F7FB]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">
            How It Works
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Simple for Buyers. Simple for Sellers.
          </h2>
          <p className="mt-3 text-[#64748B]">
            Whether you're buying or selling, get started in 3 easy steps.
          </p>
        </div>

        <div className="space-y-10">
          <StepRow title="For Buyers" steps={buyerSteps} />
          <StepRow title="For Sellers" steps={sellerSteps} />
        </div>

        {/* CTA */}
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <Link to="/catalog">
            <Button
              size="lg"
              className="h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base px-8 rounded-xl shadow-md"
            >
              Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/signup">
            <Button
              size="lg"
              className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 rounded-xl shadow-md"
            >
              Create Seller Account <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
