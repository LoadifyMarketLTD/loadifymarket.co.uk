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
    <section className="hero relative overflow-hidden" aria-label="Loadify Market — Buy and Sell Across the UK">
      <h1 className="sr-only">Buy and Sell Across the UK — 0% Fees Until July 1</h1>

      {/* Live countdown — overlays the image's countdown area at top right */}
      {!expired && (
        <div className="hero-badge">
          <p className="text-[#1A2744] text-sm font-bold tabular-nums tracking-wider drop-shadow-sm">
            {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
          </p>
        </div>
      )}

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
