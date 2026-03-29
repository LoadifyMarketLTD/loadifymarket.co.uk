import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, LayoutGrid, X } from "lucide-react";

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

const TRUST_BULLETS = [
  { icon: ShieldCheck, text: "Secure payments via Stripe",        color: "text-emerald-500" },
  { icon: Users,       text: "Independent sellers across the UK", color: "text-[#2563EB]"   },
  { icon: LayoutGrid,  text: "Multi-category marketplace",        color: "text-violet-500"  },
];

const HeroSection = () => {
  const [time, setTime] = useState(getTimeLeft);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined;
    // Defer timer start until after the browser's first idle period so it
    // does not compete with LCP painting or inflate INP on low-end devices.
    // Falls back to immediate start in environments without requestIdleCallback.
    const startTimer = () => { id = setInterval(() => setTime(getTimeLeft()), 1000); };
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(startTimer);
      return () => { window.cancelIdleCallback(handle); if (id !== undefined) clearInterval(id); };
    }
    startTimer();
    return () => { if (id !== undefined) clearInterval(id); };
  }, []);

  const expired =
    time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  return (
    <>
      {/* ── 2-column hero ─────────────────────────────────────────────────── */}
      <section
        className="bg-white overflow-hidden"
        aria-label="Hero banner"
      >
        <div className="flex flex-col lg:flex-row min-h-[540px] lg:min-h-[600px]">

          {/* ── LEFT: Text / CTA ─────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-0 py-12 lg:py-20">
            {/* Constrains the text to ~640 px max and right-aligns it toward the split */}
            <div className="w-full max-w-[580px] mx-auto lg:ml-auto lg:mr-0 lg:pr-14 xl:pr-20">

              {/* Platform badge */}
              <span className="inline-flex items-center gap-1.5 bg-blue-50 text-[#2563EB] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
                🇬🇧 UK Multi-Category Marketplace
              </span>

              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-[#0F172A] leading-tight tracking-tight mb-4">
                Buy &amp; Sell Products<br />
                <span className="text-[#2563EB]">Across the UK</span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-[#475569] leading-relaxed mb-2">
                From electronics to fashion — discover trusted UK sellers in one place.
              </p>
              <p className="text-sm font-semibold text-[#64748B] mb-8">
                Businesses and individuals can sell on Loadify Market.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 mb-8">
                <Link to="/catalog">
                  <button className="h-12 px-8 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-bold text-base rounded-full shadow-md transition-all hover:-translate-y-0.5">
                    Browse Marketplace
                  </button>
                </Link>
                <button
                  className="h-12 px-8 border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white font-bold text-base rounded-full transition-all hover:-translate-y-0.5 bg-transparent"
                  onClick={() => setRoleModalOpen(true)}
                >
                  Start Selling →
                </button>
              </div>

              {/* Trust bullets */}
              <div className="flex flex-col gap-2.5">
                {TRUST_BULLETS.map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-2 text-sm font-medium text-[#334155]">
                    <Icon className={`h-4 w-4 ${color} shrink-0`} aria-hidden="true" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Hero image (desktop) ──────────────────────────────── */}
          <div className="hidden lg:block lg:w-[48%] relative overflow-hidden">
            {/* LCP image — WebP first, JPEG fallback */}
            <picture>
              <source srcSet="/hero.webp" type="image/webp" />
              <img
                src="/hero.jpeg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-center"
                fetchPriority="high"
                loading="eager"
                width="960"
                height="720"
              />
            </picture>

            {/* Left-edge fade — smooth blend from white left column into image */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent pointer-events-none" />

            {/* Badge + countdown — top-right of the image */}
            {!expired && (
              <div className="absolute top-6 right-6 flex flex-col items-end gap-2.5 z-10">
                <span className="bg-amber-400 text-amber-900 font-bold text-sm px-4 py-2 rounded-xl shadow-lg whitespace-nowrap">
                  🎉 0% Fees Until July 1
                </span>
                <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl px-5 py-3.5 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Offer ends in</span>
                  <span
                    className="text-2xl font-extrabold text-[#0F172A] tabular-nums whitespace-nowrap"
                    aria-live="off"
                  >
                    {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">days · hours · minutes</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile: small accent image strip below text ───────────────── */}
          <div className="lg:hidden h-52 overflow-hidden relative">
            <picture>
              <source srcSet="/hero.webp" type="image/webp" />
              <img
                src="/hero.jpeg"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-top"
                loading="lazy"
                width="960"
                height="416"
              />
            </picture>
            {/* Mobile badge */}
            {!expired && (
              <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 font-bold text-xs px-3 py-1.5 rounded-lg shadow">
                🎉 0% Fees Until July 1
              </div>
            )}
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
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#2563EB] hover:bg-blue-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Buyer</p>
                    <p className="text-xs text-gray-500">Browse and buy products</p>
                  </div>
                </div>
              </Link>
              <Link to="/signup?type=seller" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 rounded-xl p-4 cursor-pointer transition-all">
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
