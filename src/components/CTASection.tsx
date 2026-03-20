import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section id="contact" className="py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-12 sm:p-16 text-center">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-primary-foreground/5 blur-3xl" />

          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground">
              Ready to Join the Marketplace?
            </h2>
            <p className="text-primary-foreground/80 text-lg">
              Whether you're looking to buy wholesale stock or sell your inventory — 
              Loadify Market connects you with the right people. Create your free account today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/catalog">
                <Button size="lg" className="bg-gradient-accent text-accent-foreground font-semibold text-base px-8 hover:opacity-90">
                  Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signup">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-200 ease-in-out text-base">
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
