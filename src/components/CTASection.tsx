import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section id="contact" className="py-16 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-blue-800 p-10 sm:p-14 text-center">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />

          <div className="relative max-w-2xl mx-auto space-y-5">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground">
              Ready to Join the Marketplace?
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              Buy wholesale stock or sell your inventory — all in one trusted platform.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link to="/catalog">
                <Button size="lg" className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-base px-8 shadow-lg">
                  Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" variant="outline" className="border-white/30 text-primary-foreground hover:bg-white/10 hover:border-white/50 text-base">
                  Create Free Account
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
