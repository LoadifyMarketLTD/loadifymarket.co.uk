import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Users, LayoutGrid } from "lucide-react";
import { useAuthStore } from "@/store";

/**
 * Countdown target: UK midnight at start of July 1, 2026 (Europe/London).
 * July 1 is in BST (UTC+1), so UK midnight == 2026-06-30T23:00:00Z.
 * LOCKED per instruction.
 */
const TARGET_TIME = new Date("2026-06-30T23:00:00Z").getTime();

/**
 * Combined height of fixed TopBar (40px) + Header row (64px) + Header category nav (48px).
 * Used to size the hero so it fills the visible viewport below the fixed headers.
 */
const HEADER_HEIGHT_PX = 152;

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number };

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, TARGET_TIME - Date.now());
  return {
    days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours:   Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: "Secure Payments via Stripe" },
  { icon: Users,       text: "Independent UK Sellers"     },
  { icon: LayoutGrid,  text: "Over 20 Categories"         },
];

/** Avatar stack colours — brand-purple and brand-green variants */
const AVATAR_COLORS = ["#a855f7", "#22c55e", "#818cf8", "#34d399", "#c084fc"] as const;

const BULLETS = [
  "Reach UK Buyers",
  "Sell Any Product",
  "Get Paid Fast with Stripe",
];

const HeroSection = () => {
  const [time, setTime] = useState(getTimeLeft);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const expired =
    time.days === 0 && time.hours === 0 &&
    time.minutes === 0 && time.seconds === 0;

  return (
    <>
      {/* ══════════════════════════════════════════════════════════════
          HERO
          hero-final.jpg as CSS background — warehouse + product
          photography fills the full section naturally.
          Left gradient overlay ensures white text stays readable.
          No artificial dark backgrounds, no dot grids, no glows.
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        aria-label="Hero — warehouse and product photography showing the Loadify Market platform"
        style={{
          backgroundImage: "url('/hero-final.jpg?v=2')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          minHeight: `clamp(520px, calc(100vh - ${HEADER_HEIGHT_PX}px), 800px)`,
        }}
      >
        {/* ── Left-side gradient overlay — dark left → transparent right
            Makes white text readable against the image without hiding
            the product photography on the right.                    ── */}
        <div
          className="absolute inset-0 pointer-events-none hidden lg:block"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.72) 28%, rgba(0,0,0,0.40) 52%, rgba(0,0,0,0.08) 72%, transparent 90%)",
          }}
        />
        {/* Mobile overlay: covers full width since text spans the whole screen */}
        <div
          className="absolute inset-0 pointer-events-none lg:hidden"
          style={{ background: "rgba(0,0,0,0.70)" }}
        />

        {/* Mobile: extra bottom fade so content doesn't clash with image edge */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none lg:hidden"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)" }}
        />

        {/* ── Content column (left-anchored) ──────────────────────── */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-20">
          <div
            className="flex flex-col justify-center py-14 sm:py-20 lg:py-24 w-full lg:max-w-[52%] xl:max-w-[48%]"
          >
            {/* Badge */}
            <span className="inline-flex items-center gap-2 border border-white/30 text-white/80 text-[11px] font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-7 w-fit">
              🇬🇧 UK Multi-Category Marketplace
            </span>

            {/* Headline */}
            <h1
              className="font-display font-extrabold leading-[0.96] tracking-tight mb-5"
              style={{ fontSize: "clamp(2.5rem, 5.5vw, 4.25rem)" }}
            >
              <span className="block text-white">SELL ONLINE,</span>
              <span className="block" style={{ color: "#22C55E" }}>GROW YOUR</span>
              <span className="block text-white">BUSINESS.</span>
            </h1>

            {/* Sub-headline */}
            <p className="text-base sm:text-lg leading-relaxed mb-8 max-w-[440px]" style={{ color: "rgba(255,255,255,0.70)" }}>
              Join thousands of UK sellers already reaching more customers every day.
            </p>

            {/* Checkmark bullets */}
            <ul className="flex flex-col gap-3 mb-9">
              {BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm sm:text-base font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>
                  {/* Filled green circle tick */}
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center justify-center shrink-0 rounded-full"
                    style={{ width: 22, height: 22, background: "#22C55E" }}
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6.2l2.8 2.8 5.2-5.2" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3 mb-9">
              {/* Primary — green gradient pill, auth-aware navigation */}
              <button
                className="inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#22C55E] focus-visible:outline-offset-2"
                style={{
                  height: 52,
                  paddingLeft: 32,
                  paddingRight: 32,
                  fontSize: "0.9375rem",
                  color: "#fff",
                  background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
                  boxShadow: "0 2px 16px rgba(34,197,94,0.45)",
                  cursor: "pointer",
                }}
                onClick={() => navigate(user ? "/dashboard/seller" : "/register?role=seller")}
                aria-label="Start selling on Loadify Market"
              >
                Start Selling →
              </button>

              {/* Secondary — white outline pill */}
              <Link to="/catalog">
                <button
                  className="inline-flex items-center justify-center font-bold rounded-full border transition-all duration-200 hover:bg-white/10 hover:-translate-y-0.5"
                  style={{
                    height: 52,
                    paddingLeft: 32,
                    paddingRight: 32,
                    fontSize: "0.9375rem",
                    color: "rgba(255,255,255,0.90)",
                    background: "rgba(255,255,255,0.06)",
                    borderColor: "rgba(255,255,255,0.40)",
                    cursor: "pointer",
                  }}
                >
                  Browse Products →
                </button>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-7">
              {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2" style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.50)" }}>
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {text}
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div>
              <p className="mb-2" style={{ fontSize: "0.6875rem", color: "rgba(255,255,255,0.38)" }}>
                Trusted by sellers across the United Kingdom
              </p>
              <div className="flex items-center gap-3">
                {/* Avatar stack */}
                <div className="flex -space-x-2" aria-hidden="true">
                  {AVATAR_COLORS.map((bg, i) => (
                    <div
                      key={i}
                      className="rounded-full border-2"
                      style={{
                        width: 28, height: 28,
                        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.4) 0%, ${bg} 100%)`,
                        borderColor: "rgba(0,0,0,0.40)",
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.48)" }}>
                  <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 700 }}>10,000+</span>
                  {"  "}⭐⭐⭐⭐⭐{"  "}Rated 4.5/5 by Sellers
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Countdown widget (position + content LOCKED) ────────── */}
        {!expired && (
          <div className="absolute top-6 right-6 z-20 hidden sm:block">
            <div
              className="w-[192px] rounded-2xl border px-4 py-3 flex flex-col items-end gap-1.5"
              style={{
                background: "rgba(0,0,0,0.52)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <span
                className="text-[10.5px] font-bold px-3 py-1 rounded-xl border whitespace-nowrap"
                style={{
                  color: "#86efac",
                  background: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.32)",
                }}
              >
                0% Fees Until July 1
              </span>
              <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
                Offer ends in
              </span>
              <div className="flex items-baseline gap-1.5 tabular-nums" style={{ color: "#fff" }}>
                <span className="font-display font-extrabold text-2xl leading-none">{pad2(time.days)}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>:</span>
                <span className="font-display font-extrabold text-xl leading-none">{pad2(time.hours)}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>:</span>
                <span className="font-display font-extrabold text-xl leading-none">{pad2(time.minutes)}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
};

export default HeroSection;
