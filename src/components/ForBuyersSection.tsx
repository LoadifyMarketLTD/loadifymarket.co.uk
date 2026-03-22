import { ArrowRight, Search, ShieldCheck, Truck, PoundSterling } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: Search,
    title: "Discover Verified Suppliers",
    description:
      "Browse thousands of listings from approved UK sellers — wholesale lots, clearance lines, pallets and returns — all in one marketplace.",
  },
  {
    icon: ShieldCheck,
    title: "Trade with Confidence",
    description:
      "Every seller is vetted and approved before listing. Buyer protection is built in so you can purchase knowing the platform has your back.",
  },
  {
    icon: PoundSterling,
    title: "Competitive Prices, Transparent Costs",
    description:
      "No hidden markups from the platform. Prices are set by independent sellers, so you see exactly what you're paying.",
  },
  {
    icon: Truck,
    title: "Flexible Delivery Options",
    description:
      "Arrange delivery directly with sellers or use our integrated logistics support. Track your order from purchase to delivery.",
  },
];

const ForBuyersSection = () => {
  return (
    <section className="py-12 sm:py-14 bg-muted/40">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-8">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            For Buyers
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-foreground">
            Find Suppliers You Can Trust
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Loadify connects you with verified UK sellers offering wholesale, clearance and returns stock — all on one trusted platform.
          </p>
        </div>

        {/* Benefit grid */}
        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-4 p-5 rounded-xl bg-card border border-border shadow-sm hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground mb-1">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <Link to="/catalog">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base px-8 shadow-lg shadow-primary/20"
            >
              Browse Listings <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Minimal trust indicators */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-8 pt-6 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Buyer Protection Included</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PoundSterling className="h-4 w-4 text-primary" />
            <span>Secure Stripe Payments</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4 text-primary" />
            <span>Free to Browse & Register</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForBuyersSection;
