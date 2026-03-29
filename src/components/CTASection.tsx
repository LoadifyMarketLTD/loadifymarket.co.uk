import { ArrowRight, Warehouse, List, CreditCard, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const sellerBullets = [
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
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#2563EB]/40 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-800/30 blur-3xl pointer-events-none" />
          {/* Dot pattern */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">

            {/* Left: Text + bullets */}
            <div className="space-y-5">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-300">
                For Sellers
              </span>
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">
                Start Selling on Loadify Market
              </h2>
              <p className="text-blue-200 text-lg">
                From independent sellers to established businesses — reach UK buyers through one marketplace.
              </p>
              <ul className="space-y-3">
                {sellerBullets.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-blue-100 text-sm">
                    <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-4 lg:justify-end">
              <Link to="/signup?type=seller">
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base px-8 rounded-xl shadow-lg"
                >
                  Start Selling <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/seller-terms">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 border-white/30 text-white hover:bg-white/10 hover:border-white/50 font-bold text-base px-8 rounded-xl"
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
