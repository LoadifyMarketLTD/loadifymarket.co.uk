import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";

/**
 * Countdown target: 31 August 2026 23:59:59 Europe/London (BST = UTC+1).
 * BST is UTC+1, so 23:59:59 BST == 2026-08-31T22:59:59Z.
 * Must match ZERO_COMMISSION_PROMO_END_UTC in stripe-webhook.ts exactly.
 */
const TARGET_TIME = new Date("2026-08-31T22:59:59Z").getTime();

/**
 * Combined height of fixed Header row (64px) + Header category nav (48px).
 */
const HEADER_HEIGHT_PX = 112;

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

const BULLETS = [
  "Reach UK Buyers",
  "Sell Any Product",
  "Get Paid Fast with Stripe",
];

const TRUST_ITEMS = [
  { icon: "🔒", label: "Secure Payments via Stripe" },
  { icon: "🇬🇧", label: "Independent UK Sellers" },
  { icon: "🏷️", label: "Over 20 Categories" },
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
    <section
      className="relative overflow-hidden"
      aria-label="Hero — sell online, grow your business with Loadify Market"
      style={{
        background: "#0A1930",
        minHeight: `clamp(520px, calc(100vh - ${HEADER_HEIGHT_PX}px), 820px)`,
      }}
    >
      {/*
       * ── HERO IMAGE — right-anchored ──────────────────────────────────────
       * The source hero.jpeg has text composited into its left ~40%.
       * By positioning the img to cover only the RIGHT 68% of the container
       * (with object-position: right center) the baked-in text is cropped off
       * the left edge while the laptop / phone / warehouse fills the right side.
       */}
      <img
        src="/hero.jpeg"
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "68%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "right center",
          zIndex: 0,
        }}
      />

      {/* ── Blend gradient — smooth dark→image transition ────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, #0A1930 0%, #0A1930 28%, rgba(10,25,48,0.85) 42%, rgba(10,25,48,0.20) 58%, transparent 70%)",
          zIndex: 1,
        }}
      />

      {/* ── LEFT SIDE HTML OVERLAY ─────────────────────────────────────────── */}
      <div
        className="absolute z-10 flex flex-col"
        style={{
          left: "clamp(24px, 5.5vw, 88px)",
          top: "50%",
          transform: "translateY(-50%)",
          maxWidth: 540,
          width: "clamp(280px, 44vw, 540px)",
        }}
      >
        {/* Heading */}
        <h1
          className="leading-[1.05] tracking-tight"
          style={{
            fontWeight: 900,
            fontSize: "clamp(2.25rem, 5vw, 4rem)",
            color: "#ffffff",
          }}
        >
          Sell Online,{" "}
          <br />
          <span style={{ color: "#22C55E" }}>Grow Your Business.</span>
        </h1>

        {/* Paragraph */}
        <p
          className="mt-5"
          style={{
            fontSize: "clamp(0.9375rem, 1.4vw, 1.125rem)",
            color: "rgba(255,255,255,0.72)",
            lineHeight: 1.65,
            maxWidth: 480,
          }}
        >
          Join thousands of UK sellers already reaching more customers every day.
        </p>

        {/* Checklist */}
        <ul className="mt-6 flex flex-col gap-3" aria-label="Key benefits">
          {BULLETS.map((text) => (
            <li key={text} className="flex items-center gap-3">
              <svg
                width="20" height="20" viewBox="0 0 20 20"
                fill="none" aria-hidden="true" style={{ flexShrink: 0 }}
              >
                <circle cx="10" cy="10" r="10" fill="rgba(34,197,94,0.20)" />
                <path
                  d="M6 10.5l3 3 5-5.5"
                  stroke="#22C55E" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
              <span style={{ fontSize: "1rem", color: "rgba(255,255,255,0.90)", fontWeight: 500 }}>
                {text}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap gap-4">
          <button
            className="inline-flex items-center justify-center font-bold rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
            style={{
              height: 58,
              paddingLeft: 36,
              paddingRight: 36,
              fontSize: "1rem",
              color: "#fff",
              background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
              boxShadow: "0 4px 20px rgba(34,197,94,0.45)",
              cursor: "pointer",
              border: "none",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(34,197,94,0.55)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.filter = "";
              (e.currentTarget as HTMLButtonElement).style.transform = "";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(34,197,94,0.45)";
            }}
            onClick={() => navigate(user ? "/dashboard/seller" : "/register?role=seller")}
            aria-label="Start selling on Loadify Market"
          >
            Start Selling →
          </button>

          <button
            className="inline-flex items-center justify-center font-semibold rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{
              height: 58,
              paddingLeft: 36,
              paddingRight: 36,
              fontSize: "1rem",
              color: "rgba(255,255,255,0.90)",
              background: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.35)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.60)";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.35)";
              (e.currentTarget as HTMLButtonElement).style.transform = "";
            }}
            onClick={() => navigate("/catalog")}
            aria-label="Browse products on Loadify Market"
          >
            Browse Products
          </button>
        </div>

        {/* Trust mini-features */}
        <div
          className="mt-8 flex flex-wrap gap-x-5 gap-y-2"
          aria-label="Trust indicators"
        >
          {TRUST_ITEMS.map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span style={{ fontSize: "0.9rem" }} aria-hidden="true">{icon}</span>
              <span style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Countdown widget — positioned in visual gap between left text and laptop ── */}
      {!expired && (
        <div
          className="absolute z-20 hidden sm:block"
          style={{ top: "20%", left: "64%" }}
        >
          <div
            className="rounded-2xl border px-4 py-3 flex flex-col items-center gap-1.5"
            style={{
              width: 210,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderColor: "rgba(255,255,255,0.12)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.40)",
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
              0% Fees Until 31 August
            </span>
            <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.40)" }}>
              Offer ends in
            </span>
            <div className="flex items-baseline gap-1 tabular-nums" style={{ color: "#fff" }}>
              <span className="font-display font-extrabold text-2xl leading-none">{pad2(time.days)}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>d</span>
              <span className="font-display font-extrabold text-xl leading-none">{pad2(time.hours)}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>h</span>
              <span className="font-display font-extrabold text-xl leading-none">{pad2(time.minutes)}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>m</span>
              <span className="font-display font-extrabold text-xl leading-none">{pad2(time.seconds)}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.30)" }}>s</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
