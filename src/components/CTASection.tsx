import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section id="contact" className="py-16 bg-[#F5F7FB]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-10 sm:p-16 text-center">
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

          <div className="relative max-w-2xl mx-auto space-y-5">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-300 mb-1">
              Join Loadify Market
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white leading-tight">
              Ready to Start Buying or Selling?
            </h2>
            <p className="text-blue-200 text-lg">
              Browse products from independent UK sellers or list your own — all in one trusted marketplace.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link to="/catalog">
                <Button
                  size="lg"
                  className="h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base px-8 rounded-xl shadow-lg"
                >
                  Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="h-12 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-base px-8 rounded-xl shadow-lg"
                >
                  Create Account <ArrowRight className="ml-2 h-5 w-5" />
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
