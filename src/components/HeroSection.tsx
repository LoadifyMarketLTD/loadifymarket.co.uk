import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Users, LayoutGrid, X } from "lucide-react";

/**
 * Countdown target: UK midnight at start of July 1, 2026 (Europe/London).
 * July 1 is in BST (UTC+1), so UK midnight == 2026-06-30T23:00:00Z.
 *
 * LOCKED per instruction.
 */
const TARGET_TIME = new Date("2026-06-30T23:00:00Z").getTime();

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, TARGET_TIME - Date.now());
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const TRUST_BULLETS = [
  { icon: ShieldCheck, text: "Secure payments via Stripe", color: "text-emerald-500" },
  { icon: Users, text: "Independent sellers across the UK", color: "text-[#2563EB]" },
  { icon: LayoutGrid, text: "Multi-category marketplace", color: "text-violet-500" },
];

const HeroSection = () => {
  const [time, setTime] = useState(getTimeLeft);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  useEffect(() => {
    // Live updates; no hardcoded values.
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired = time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  return (
    <>
      {/* ── 2-column hero ─────────────────────────────────────────────────── */}
      <section className="bg-white overflow-hidden" aria-label="Hero banner">
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
                Buy &amp; Sell Products
                <br />
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
              <div className="flex flex-wrap gap-3 mb-4">
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

              {/* Sign-in link for returning users */}
              <p className="text-sm text-[#64748B] mb-8">
                Already have an account?{" "}
                <Link to="/login" className="font-semibold text-[#2563EB] hover:underline">
                  Sign In →
                </Link>
              </p>

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
            {/* LCP image */}
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

            {/* Left-edge fade — smooth blend from white left column into image */}
            <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent pointer-events-none" />

            {/* ── Countdown (LOCKED position + UI) ───────────────────────── */}
            {!expired && (
              <div className="absolute top-6 right-6 z-10">
                <div
                  className={`
                    w-[200px]
                    rounded-2xl
                    bg-white/90
                    backdrop-blur-md
                    shadow-lg
                    px-4 py-3
                    flex flex-col items-end gap-1.5
                  `}
                >
                  {/* Top pill */}
                  <div className="text-amber-900 font-bold text-[11px] px-3 py-1 rounded-xl bg-amber-300/70 whitespace-nowrap">
                    0% Fees Until July 1
                  </div>

                  {/* Label */}
                  <div className="text-[10px] font-medium text-[#64748B]">Offer ends in</div>

                  {/* DD : HH : MM */}
                  <div className="flex items-baseline justify-end gap-2 tabular-nums whitespace-nowrap text-[#0F172A]">
                    <span className="font-display font-extrabold text-2xl leading-none">{pad2(time.days)}</span>
                    <span className="text-xs font-semibold text-[#64748B] leading-none">:</span>
                    <span className="font-display font-extrabold text-xl leading-none">{pad2(time.hours)}</span>
                    <span className="text-xs font-semibold text-[#64748B] leading-none">:</span>
                    <span className="font-display font-extrabold text-xl leading-none">{pad2(time.minutes)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Mobile: small accent image strip below text ───────────────── */}
          <div className="lg:hidden h-52 overflow-hidden relative">
            <img
                src="/hero.jpeg"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-top"
                loading="lazy"
                width="960"
                height="416"
              />

            {/* ── Mobile countdown (same structure, ~30% smaller) ─────────── */}
            {!expired && (
              <div className="absolute top-3 right-3 z-10">
                <div
                  className={`
                    w-[150px]
                    rounded-xl
                    bg-white/90
                    backdrop-blur-md
                    shadow-md
                    px-3 py-2.5
                    flex flex-col items-end gap-1
                  `}
                >
                  <div className="text-amber-900 font-bold text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-300/70 whitespace-nowrap">
                    0% Fees Until July 1
                  </div>
                  <div className="text-[9px] font-medium text-[#64748B]">Offer ends in</div>

                  <div className="flex items-baseline justify-end gap-1.5 tabular-nums whitespace-nowrap text-[#0F172A]">
                    <span className="font-display font-extrabold text-lg leading-none">{pad2(time.days)}</span>
                    <span className="text-[10px] font-semibold text-[#64748B] leading-none">:</span>
                    <span className="font-display font-extrabold text-base leading-none">{pad2(time.hours)}</span>
                    <span className="text-[10px] font-semibold text-[#64748B] leading-none">:</span>
                    <span className="font-display font-extrabold text-base leading-none">{pad2(time.minutes)}</span>
                  </div>
                </div>
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
            <h2 className="text-xl font-bold text-[#0A2239] mb-1 text-center">Join Loadify Market</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">How would you like to get started?</p>
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
}

export default HeroSection;