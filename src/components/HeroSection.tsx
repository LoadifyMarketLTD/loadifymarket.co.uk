import { ArrowRight, CheckCircle2, Zap, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImg from "@/assets/hero-seller-dashboard.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-background">
      <div className="container mx-auto px-4 py-28">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="space-y-7">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-display font-bold leading-[1.08] text-foreground">
              The UK Wholesale{" "}
              <span className="text-primary">Marketplace.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              A trusted platform where UK businesses buy and sell wholesale, clearance and overstock — all in one place.
            </p>

            {/* Bullet points */}
            <ul className="space-y-3">
              {[
                "Verified Sellers & Real Buyers",
                "Wholesale, Pallets & Clearance",
                "Secure Payments via Stripe",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-foreground font-medium">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            {/* CTAs — both buyer and seller */}
            <div className="flex flex-wrap gap-3">
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base px-8 shadow-lg shadow-primary/20"
                >
                  Browse Deals <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 shadow-lg shadow-emerald-600/20"
                >
                  Start Selling <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 pt-1">
              {[
                { icon: ShieldCheck, label: "Verified Sellers" },
                { icon: Zap, label: "Secure Payments" },
                { icon: Users, label: "UK Businesses Only" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm"
                >
                  <badge.icon className="h-4 w-4 text-primary" />
                  {badge.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Hero Image */}
          <div className="relative hidden md:block">
            <div className="rounded-2xl overflow-hidden shadow-[var(--shadow-elevated)] border border-border">
              <img
                src={heroImg}
                alt="Loadify Market platform dashboard showing marketplace overview"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
