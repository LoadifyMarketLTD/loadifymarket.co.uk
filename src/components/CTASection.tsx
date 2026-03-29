import { ArrowRight, Warehouse, LayoutGrid, CreditCard, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const SELLER_BULLETS = [
  { icon: Warehouse,   text: "No warehouse required" },
  { icon: List,        text: "Manage your own listings" },
  { icon: CreditCard,  text: "Secure payments via Stripe" },
  { icon: LayoutGrid,  text: "Sell across multiple categories" },
];

const CTASection = () => {
  return (
    <section id="start-selling" className="py-16 bg-[#F5F7FB]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-10 sm:p-16">
          {/* Decorative blobs */}
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#2563EB]/20 blur-3xl pointer-events-none" />
          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">
                Sell on Loadify Market
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight mb-3">
                Start Selling on Loadify Market
              </h2>
              <p className="text-blue-200 text-lg max-w-xl mx-auto">
                From independent sellers to established businesses — reach UK buyers through one marketplace.
              </p>
            </div>

            {/* Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 max-w-lg mx-auto">
              {SELLER_BULLETS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  </div>
                  <span className="text-sm font-medium text-white">{text}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup?type=seller">
                <Button
                  size="lg"
                  className="h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base px-8 rounded-xl shadow-lg"
                >
                  Start Selling <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/seller-guidelines">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 border-2 border-white/30 text-white font-bold text-base px-8 rounded-xl hover:bg-white/10 bg-transparent"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
