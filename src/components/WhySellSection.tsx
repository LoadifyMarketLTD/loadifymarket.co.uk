import { ArrowRight, TrendingUp, Users, Package, PoundSterling, Star, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: Users,
    title: "Real Buyers, Not Browsers",
    description:
      "Buyers on Loadify are verified businesses looking to purchase wholesale, clearance or overstock — not casual shoppers.",
  },
  {
    icon: TrendingUp,
    title: "Shift Stock Faster",
    description:
      "List pallets, bulk lots or clearance lines and get them in front of active buyers within minutes.",
  },
  {
    icon: Package,
    title: "Any Stock, Any Volume",
    description:
      "From single pallets to full container loads — returns, overstock, end-of-line, liquidation. List it and let buyers find you.",
  },
  {
    icon: PoundSterling,
    title: "No Listing Fees, Fast Payouts",
    description:
      "Zero upfront costs to list. Payments are processed securely via Stripe with full transaction transparency.",
  },
];

const WhySellSection = () => {
  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-14">
          <span className="text-sm font-semibold uppercase tracking-wider text-primary">
            For Sellers
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-display font-bold text-foreground">
            Your Stock Deserves Real Buyers
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Stop sitting on dead stock. Loadify connects you with verified UK businesses ready to buy wholesale, clearance and overstock.
          </p>
        </div>

        {/* Benefit grid */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="flex gap-4 p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated hover:border-primary/20 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
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
        <div className="text-center mt-12">
          <Link to="/signup">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 shadow-lg shadow-emerald-600/20"
            >
              Start Selling Today <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Minimal social proof — real data only */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-10 pt-8 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Verified UK Business</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Rated</span>
            <div className="flex items-center gap-0.5 ml-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
              <span className="text-xs font-semibold text-foreground ml-1">5.0</span>
            </div>
            <span>on Google</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhySellSection;
