import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Store, LayoutGrid, X } from "lucide-react";

/**
 * Countdown target: UK midnight at start of July 1, 2026 (Europe/London).
 * July 1 is in BST (UTC+1), so UK midnight == 2026-06-30T23:00:00Z.
 * LOCKED per instruction.
 */
const TARGET_TIME = new Date("2026-06-30T23:00:00Z").getTime();

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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const TRUST_ITEMS = [
  { icon: ShieldCheck, text: "Secure payments via Stripe" },
  { icon: Store,       text: "Independent UK sellers"    },
  { icon: LayoutGrid,  text: "Multi-category marketplace" },
];

const BULLETS = [
  "Reach UK Buyers",
  "Sell Any Product",
  "Get Paid Fast with Stripe",
];

/* ─── inline animation helpers ──────────────────────────────────────────── */
function fadeUp(delay = 0): React.CSSProperties {
  return {
    animation: `fadeInUp 0.75s ease-out ${delay}s both`,
  };
}

const HeroSection = () => {
  const [time, setTime]               = useState(getTimeLeft);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

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
          HERO SECTION
          Two-column: dark left content | right hero visual
      ══════════════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden bg-[#0A0B1A]"
        aria-label="Hero banner"
      >
        {/* Subtle dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.028]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Radial glow — left green, right purple */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 55% 55% at 15% 55%, rgba(34,197,94,0.07) 0%, transparent 70%), " +
              "radial-gradient(ellipse 50% 60% at 85% 45%, rgba(124,58,237,0.07) 0%, transparent 70%)",
          }}
        />

        {/* ── Main two-column layout ──────────────────────────────── */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 sm:px-10 lg:px-14 xl:px-20 flex flex-col lg:flex-row items-center gap-0">

          {/* ══ LEFT COLUMN: content ══════════════════════════════ */}
          <div className="flex-1 flex flex-col justify-center py-14 sm:py-20 lg:py-24 max-w-[560px] lg:max-w-none lg:pr-10 xl:pr-16">

            {/* ── Badge ── */}
            <div style={fadeUp(0.05)}>
              <span className="inline-flex items-center gap-2 border border-white/20 text-white/70 text-[11px] font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-7">
                🇬🇧 UK Multi-Category Marketplace
              </span>
            </div>

            {/* ── Headline ── */}
            <div style={fadeUp(0.15)}>
              <h1 className="font-display font-extrabold leading-[0.97] tracking-tight mb-5">
                <span
                  className="block text-white"
                  style={{ fontSize: "clamp(2.4rem, 5.8vw, 4.25rem)" }}
                >
                  SELL ONLINE,
                </span>
                <span
                  className="block"
                  style={{
                    fontSize: "clamp(2.4rem, 5.8vw, 4.25rem)",
                    color: "#22C55E",
                  }}
                >
                  GROW YOUR
                </span>
                <span
                  className="block text-white"
                  style={{ fontSize: "clamp(2.4rem, 5.8vw, 4.25rem)" }}
                >
                  BUSINESS.
                </span>
              </h1>
            </div>

            {/* ── Sub-headline ── */}
            <div style={fadeUp(0.25)}>
              <p className="text-base sm:text-lg text-white/55 leading-relaxed mb-7 max-w-[460px]">
                Reach UK buyers, list products across multiple categories, and get paid securely with Stripe.
              </p>
            </div>

            {/* ── Checkmark bullets ── */}
            <ul style={fadeUp(0.32)} className="flex flex-col gap-2.5 mb-9" role="list">
              {BULLETS.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm sm:text-[0.9375rem] font-medium text-white/80">
                  <span
                    aria-hidden="true"
                    className="inline-flex items-center justify-center w-[20px] h-[20px] rounded-full shrink-0"
                    style={{ background: "#22C55E" }}
                  >
                    <svg className="w-[10px] h-[10px]" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6.2l2.8 2.8 5.2-5.2"
                        stroke="#fff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* ── CTA buttons ── */}
            <div style={fadeUp(0.42)} className="flex flex-wrap gap-3 mb-9">
              {/* Primary — green gradient */}
              <button
                className="inline-flex items-center justify-center h-[52px] px-9 text-white font-bold text-[0.9375rem] rounded-full transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#22C55E] focus-visible:outline-offset-2"
                style={{
                  background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                  boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
                }}
                onClick={() => setRoleModalOpen(true)}
                aria-haspopup="dialog"
              >
                Start Selling →
              </button>

              {/* Secondary — translucent outline */}
              <Link to="/catalog">
                <button
                  className="inline-flex items-center justify-center h-[52px] px-9 font-bold text-[0.9375rem] text-white/85 rounded-full border border-white/25 bg-white/5 hover:bg-white/10 hover:border-white/40 hover:-translate-y-0.5 transition-all duration-200"
                >
                  Browse Products →
                </button>
              </Link>
            </div>

            {/* ── Trust strip ── */}
            <div style={fadeUp(0.5)} className="flex flex-wrap gap-x-6 gap-y-2">
              {TRUST_ITEMS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-[11px] text-white/40">
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {text}
                </div>
              ))}
            </div>

          </div>

          {/* ══ RIGHT COLUMN: hero visual ══════════════════════════ */}
          <div
            className="w-full lg:flex-1 lg:self-stretch relative overflow-hidden"
            style={fadeUp(0.3)}
          >
            {/* Desktop: full-height image anchored to section */}
            <div className="hidden lg:block absolute inset-0">
              {/* Left-edge blend into dark bg */}
              <div
                className="absolute inset-y-0 left-0 z-10 w-28 xl:w-36 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, #0A0B1A 0%, transparent 100%)",
                }}
              />
              <img
                src="/hero-marketplace.png"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover object-left-top"
                fetchPriority="high"
                loading="eager"
                width="1536"
                height="1024"
              />
            </div>

            {/* Mobile: natural height image */}
            <div className="lg:hidden relative h-[260px] sm:h-[320px]">
              <div
                className="absolute inset-y-0 left-0 z-10 w-16 pointer-events-none"
                style={{
                  background: "linear-gradient(90deg, #0A0B1A 0%, transparent 100%)",
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 z-10 h-16 pointer-events-none"
                style={{
                  background: "linear-gradient(to top, #0A0B1A 0%, transparent 100%)",
                }}
              />
              <img
                src="/hero-marketplace.png"
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover object-left-top"
                loading="lazy"
                width="1536"
                height="1024"
              />
            </div>

            {/* Spacer so the desktop column has min height */}
            <div className="hidden lg:block" style={{ minHeight: "calc(100vh - 152px)" }} />
          </div>

        </div>

        {/* ── Countdown widget (LOCKED) ──────────────────────────── */}
        {!expired && (
          <div className="absolute top-6 right-6 z-20 hidden sm:block">
            <div
              className="w-[196px] rounded-2xl backdrop-blur-md border border-white/12 px-4 py-3 flex flex-col items-end gap-1.5"
              style={{ background: "rgba(10,11,26,0.72)" }}
            >
              <span
                className="text-[10.5px] font-bold px-3 py-1 rounded-xl border whitespace-nowrap"
                style={{
                  color: "#86efac",
                  background: "rgba(34,197,94,0.15)",
                  borderColor: "rgba(34,197,94,0.30)",
                }}
              >
                0% Fees Until July 1
              </span>
              <span className="text-[10px] font-medium text-white/40">Offer ends in</span>
              <div className="flex items-baseline gap-2 tabular-nums text-white">
                <span className="font-display font-extrabold text-2xl leading-none">{pad2(time.days)}</span>
                <span className="text-xs text-white/30">:</span>
                <span className="font-display font-extrabold text-xl leading-none">{pad2(time.hours)}</span>
                <span className="text-xs text-white/30">:</span>
                <span className="font-display font-extrabold text-xl leading-none">{pad2(time.minutes)}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══ Role selection modal ════════════════════════════════════ */}
      {roleModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setRoleModalOpen(false)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-modal-title"
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              onClick={() => setRoleModalOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
            <h2 id="join-modal-title" className="text-xl font-bold text-[#0A2239] mb-1 text-center">
              Join Loadify Market
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">How would you like to get started?</p>
            <div className="flex flex-col gap-3">
              <Link to="/signup" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#7C3AED] hover:bg-purple-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl" aria-hidden="true">🛒</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Buyer</p>
                    <p className="text-xs text-gray-500">Browse and buy products</p>
                  </div>
                </div>
              </Link>
              <Link to="/signup?type=seller" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#22C55E] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl" aria-hidden="true">🏪</span>
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
