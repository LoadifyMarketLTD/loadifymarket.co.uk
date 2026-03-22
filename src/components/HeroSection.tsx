import { ArrowRight, CheckCircle2, Zap, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const heroImg = "/hero-seller-dashboard.jpg";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt=""
          role="presentation"
          className="w-full h-full object-contain object-center opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/85 via-white/70 to-white/40" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-28">
        <div className="max-w-2xl space-y-7">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-display font-bold leading-[1.08] text-slate-900">
            Grow your sales with <span className="text-primary">Loadify Market</span>
          </h1>

          <p className="text-lg text-slate-600 max-w-md leading-relaxed">
            Trade clearance &amp; bulk stock across the UK
          </p>

          <ul className="space-y-3">
            {[
              "Verified Sellers & Real Buyers",
              "Wholesale, Pallets & Clearance",
              "Secure Payments via Stripe",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-slate-700 font-medium">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 shadow-lg shadow-emerald-600/20"
              >
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/register?type=seller">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/80 hover:bg-white text-slate-900 border-slate-200 font-bold text-base px-8 shadow-sm"
              >
                Start Selling <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/register">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/70 hover:bg-white text-slate-900 border-slate-200 font-bold text-base px-8 shadow-sm"
              >
                Register as Buyer <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>

            <Link to="/register?type=broker">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/70 hover:bg-white text-slate-900 border-slate-200 font-bold text-base px-8 shadow-sm"
              >
                Register as Broker <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { icon: ShieldCheck, label: "Verified Sellers" },
              { icon: Zap, label: "Secure Payments" },
              { icon: Users, label: "UK Businesses Only" },
            ].map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-800 shadow-sm"
              >
                <badge.icon className="h-4 w-4 text-primary" />
                {badge.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;