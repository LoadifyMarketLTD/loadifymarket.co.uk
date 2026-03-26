import { useState, useEffect } from "react";
import { ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/* ─── Countdown target: 1 July 2026 23:59:59 BST ─── */
const TARGET_TIME = new Date("2026-07-01T22:59:59Z").getTime();

function getTimeLeft() {
  const diff = Math.max(0, TARGET_TIME - Date.now());
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const HeroSection = () => {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired =
    time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  return (
    <section
      className="relative min-h-[520px] lg:min-h-[600px] bg-[#0A1628] bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: "url('/hero.jpg')" }}
    >
      {/* Left-to-right gradient overlay — ensures text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0A1628]/90 via-[#0A1628]/55 to-transparent" />

      {/* TOP RIGHT: badge + countdown */}
      {!expired && (
        <div className="absolute top-5 right-5 sm:top-7 sm:right-7 z-10 flex flex-col items-end gap-2">
          {/* Badge */}
          <div className="flex items-center gap-1.5 bg-amber-400 text-[#0F172A] text-xs font-extrabold px-3 py-1.5 rounded-full shadow-lg">
            <Tag className="h-3 w-3 shrink-0" aria-hidden="true" />
            0% Fees Until July 1, 2026
          </div>
          {/* Compact countdown */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white text-sm font-bold tabular-nums shadow-md tracking-wide">
            {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 min-h-[520px] lg:min-h-[600px] flex items-center py-16 lg:py-20">
        {/* LEFT: title + subtext + CTAs */}
        <div className="w-full lg:w-[48%] xl:w-[42%] space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-display font-extrabold leading-[1.06] text-white">
            Reach Real Buyers
          </h1>

          <p className="text-lg text-white/80 leading-relaxed max-w-md">
            Buy and sell across the UK marketplace.{" "}
            <span className="text-amber-300 font-semibold">
              Start today with 0% commission until July 1.
            </span>
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/seller/products/new">
              <Button
                size="lg"
                className="h-12 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base px-8 rounded-xl shadow-md"
              >
                Create Listing <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/catalog">
              <Button
                size="lg"
                variant="outline"
                className="h-12 border-2 border-white/60 text-white hover:bg-white/10 hover:text-white font-bold text-base px-8 rounded-xl backdrop-blur-sm"
              >
                Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
