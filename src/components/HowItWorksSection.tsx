import { UserPlus, Search, PackagePlus, PoundSterling, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const buyerSteps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create a Free Account",
    description: "Sign up in under 2 minutes. Browse the marketplace as a verified buyer.",
  },
  {
    icon: Search,
    step: "02",
    title: "Find the Stock You Need",
    description: "Search wholesale, clearance and pallet deals from verified UK sellers across all categories.",
  },
  {
    icon: PoundSterling,
    step: "03",
    title: "Buy & Get It Delivered",
    description: "Purchase securely via Stripe. Arrange delivery with the seller or use our logistics support.",
  },
];

const sellerSteps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up & Get Verified",
    description: "Create your free seller account. We verify every seller to keep the marketplace trusted.",
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
    <h3 className="text-center font-display text-lg font-semibold text-primary mb-8">{title}</h3>
    <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
      {steps.map((item, i) => (
        <div key={item.step} className="relative text-center group">
          {i < steps.length - 1 && (
            <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px border-t-2 border-dashed border-border" />
          )}
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-hero text-primary-foreground mb-5 shadow-elevated group-hover:scale-105 transition-transform">
            <item.icon className="h-8 w-8" />
            <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
              {item.step}
            </span>
          </div>
          <h4 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h4>
          <p className="text-sm text-muted-foreground max-w-[260px] mx-auto leading-relaxed">{item.description}</p>
        </div>
      ))}
    </div>
  </div>
);

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-foreground">
            Simple for Buyers. Simple for Sellers.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you're buying or selling, get started in 3 easy steps.
          </p>
        </div>

        <div className="space-y-16">
          <StepRow title="For Buyers" steps={buyerSteps} />
          <StepRow title="For Sellers" steps={sellerSteps} />
        </div>

        {/* CTA */}
        <div className="flex flex-wrap justify-center gap-4 mt-14">
          <Link to="/catalog">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base px-8 shadow-lg shadow-primary/20"
            >
              Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 shadow-lg shadow-emerald-600/20"
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
