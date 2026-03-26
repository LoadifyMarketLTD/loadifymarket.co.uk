import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="hero relative overflow-hidden" aria-label="Hero banner">

      {/* Buttons — bottom left, over the image */}
      <div className="hero-buttons flex flex-wrap gap-3">
        <Link to="/seller/products/new">
          <Button
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm px-7 py-2.5 rounded-xl shadow-lg"
          >
            Create Listing <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link to="/catalog">
          <Button
            className="bg-white/85 hover:bg-white text-[#1A2744] font-bold text-sm px-7 py-2.5 rounded-xl shadow border border-[#1A2744]/20"
          >
            Browse Marketplace <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>

    </section>
  );
};

export default HeroSection;
