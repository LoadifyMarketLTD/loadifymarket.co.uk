import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
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
    <section className="hero relative overflow-hidden">

      {/* Brand logo — top left overlay */}
      <div className="absolute top-5 left-5 sm:top-6 sm:left-8 z-10">
        <img
          src="/branding/loadify-logo-transparent.svg"
          alt="Loadify Market"
          className="h-8 sm:h-9 w-auto"
        />
      </div>

      {/* TOP RIGHT: promo badge + countdown */}
      {!expired && (
        <div className="hero-badge flex flex-col items-end gap-1.5">
          <div className="bg-[#F5C518] text-[#1A1A2E] text-sm font-extrabold px-4 py-1.5 rounded-full shadow-md tracking-wide">
            0% Fees Until July 1
          </div>
          <p className="text-[#1A2744] text-sm font-bold tabular-nums tracking-wider drop-shadow-sm">
            {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
          </p>
        </div>
      )}

      {/* LEFT: title + subtext + buttons */}
      <div className="hero-content space-y-6">
        <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-display font-extrabold leading-[1.08] text-[#1A2744]">
          Buy &amp; Sell Across the UK — 0% Fees Until July 1
        </h1>

        <p className="text-lg text-[#2B3E6B] leading-relaxed">
          Join the fastest growing UK marketplace.
          <br />
          Start selling or buying today with zero commission.
        </p>

        <div className="flex flex-wrap gap-4 pt-2">
          <Link to="/seller/products/new">
            <Button
              size="lg"
              className="h-14 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-base px-9 rounded-xl shadow-lg"
            >
              Create Listing <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/catalog">
            <Button
              size="lg"
              className="h-14 bg-white/80 hover:bg-white text-[#1A2744] font-bold text-base px-9 rounded-xl shadow border border-[#1A2744]/20"
            >
              Browse Marketplace <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

    </section>
  );
};

export default HeroSection;
