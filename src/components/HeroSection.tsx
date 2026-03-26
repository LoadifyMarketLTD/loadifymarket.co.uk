import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";

/* ── Countdown target: July 1 2026 00:00:00 BST = June 30 23:00:00 UTC ── */
const TARGET_TIME = new Date("2026-06-30T23:00:00Z").getTime();

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
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired =
    time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  return (
    <>
      <section className="hero" aria-label="Hero banner">

        {/* ── Left 40% safe sky zone: all content lives here ────────── */}
        <div className="hero-content">

          {/* Badge + countdown — right-aligned within the content zone */}
          {!expired && (
            <div className="hero-promo">
              <span className="hero-fee-badge">0% Fees Until July 1</span>
              <span className="hero-countdown">
                {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
              </span>
            </div>
          )}

          {/* Headline */}
          <h1 className="hero-headline">
            Grow your sales with Loadify Market
          </h1>

          {/* Subtext */}
          <p className="hero-subtext">
            Sell smarter. Reach more buyers. Scale your business faster.
          </p>

          {/* CTA buttons */}
          <div className="hero-cta-row">
            <button
              className="hero-btn-primary"
              onClick={() => setRoleModalOpen(true)}
            >
              Get Started
            </button>
            <Link to="/catalog">
              <button className="hero-btn-secondary">
                Browse Marketplace
              </button>
            </Link>
          </div>

        </div>

      </section>

      {/* ── Role selection modal ──────────────────────────────────────────── */}
      {roleModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setRoleModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setRoleModalOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-[#0A2239] mb-1 text-center">
              Join Loadify Market
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              How would you like to get started?
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/signup" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#22C55E] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Buyer</p>
                    <p className="text-xs text-gray-500">Browse and buy products</p>
                  </div>
                </div>
              </Link>
              <Link to="/signup?type=seller" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#22C55E] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Seller</p>
                    <p className="text-xs text-gray-500">List and sell your products</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HeroSection;
