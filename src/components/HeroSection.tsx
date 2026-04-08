import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";
import { PROMO_END_UTC } from "@/lib/promoDeadline";
import { useCountdown } from "@/hooks/use-countdown";


function pad2(n: number) { return String(n).padStart(2, "0"); }

const BULLETS = [
  "Reach UK Buyers",
  "Launch Without Upfront Costs",
  "Get Paid Fast with Stripe",
];

const TRUST_ITEMS = [
  { icon: "🔒", label: "Secure Payments via Stripe" },
  { icon: "🇬🇧", label: "Independent UK Sellers" },
  { icon: "🏷️", label: "Over 20 Categories" },
];

const HeroSection = () => {
  const { days, hours, minutes, seconds, expired } = useCountdown(PROMO_END_UTC);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <section
      className="relative overflow-hidden sm:min-h-[calc(100dvh-7rem)]"
      aria-label="Hero — sell online, grow your business with Loadify Market"
      style={{ background: "#0A1930" }}
    >
      {/* min-height: none on mobile (content-driven height prevents large empty space)
          7rem=112px desktop (header row + category nav) fills the viewport on sm+ */}
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
      {/* Desktop: partial gradient revealing hero image on right */}
      <div
        aria-hidden="true"
        className="hidden sm:block"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, #0A1930 0%, #0A1930 32%, rgba(10,25,48,0.90) 45%, rgba(10,25,48,0.25) 62%, transparent 72%)",
          zIndex: 1,
        }}
      />
      {/* Mobile (<sm): full dark overlay so text is always readable over hero image */}
      <div
        aria-hidden="true"
        className="sm:hidden"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,25,48,0.82)",
          zIndex: 1,
        }}
      />

      {/* ── LEFT SIDE HTML OVERLAY ─────────────────────────────────────────── */}
      {/*
       * Mobile (<sm): position relative, full width, padded — no translateY tricks.
       * Desktop (sm+): position absolute, left/top/transform handle vertical centering.
       * Keeping these as separate Tailwind sm: classes avoids inline-style overriding
       * w-full on mobile (which caused text to be constrained to 280px on a 390px screen).
       */}
      <div
        className={[
          // Position: relative flow on mobile, absolute overlay on desktop
          "relative sm:absolute z-10 flex flex-col",
          // Size: full-width on mobile, auto (content-width) on desktop
          "w-full sm:w-auto sm:min-w-[280px]",
          // Spacing: padded on mobile, zero on desktop (section handles it via positioning)
          "px-5 py-8 sm:px-0 sm:py-0",
          // Desktop centering: top-1/2 + -translate-y-1/2 vertically centers the overlay
          "sm:top-1/2 sm:-translate-y-1/2",
          // Desktop horizontal offset via clamp (responsive left position)
          "sm:[left:clamp(24px,5.5vw,88px)]",
        ].join(" ")}
        style={{ maxWidth: 540 }}
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
          Now open for UK sellers. Be among the first to grow on Loadify with 0% commission during launch.
        </p>

        {/* Checklist */}
        <ul className="mt-5 flex flex-col gap-2.5 sm:gap-3" aria-label="Key benefits">
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

        {/* CTA Buttons — stacked on mobile, inline on sm+ */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            className="w-full sm:w-auto inline-flex items-center justify-center font-bold rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#22C55E]"
            style={{
              height: 52,
              paddingLeft: 32,
              paddingRight: 32,
              fontSize: "0.9375rem",
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
            onClick={() => navigate(user ? "/pp/seller" : "/signup?type=seller")}
            aria-label="Start selling on Loadify Market"
          >
            Start Selling in Minutes →
          </button>

          <button
            className="w-full sm:w-auto inline-flex items-center justify-center font-semibold rounded-full border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{
              height: 52,
              paddingLeft: 32,
              paddingRight: 32,
              fontSize: "0.9375rem",
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
            Browse Marketplace
          </button>
        </div>

        {/* Trust mini-features */}
        <div
          className="mt-5 sm:mt-8 flex flex-wrap gap-x-4 gap-y-2"
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

        {/* Mobile-only countdown strip (hidden on sm+ where the floating card takes over) */}
        {!expired && (
          <div
            className="mt-5 flex items-center gap-3 sm:hidden"
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: "rgba(18,18,18,0.78)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="shrink-0 font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap"
              style={{
                fontSize: 11,
                color: "#86efac",
                background: "rgba(34,197,94,0.18)",
                borderColor: "rgba(34,197,94,0.32)",
              }}
            >
              0% Fees
            </span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>ends in</span>
            <div className="flex items-baseline gap-0.5 tabular-nums" style={{ color: "#fff" }}>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{pad2(days)}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>d </span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{pad2(hours)}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>h </span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{pad2(minutes)}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>m </span>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{pad2(seconds)}</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>s</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Countdown widget — aligned with upper headline region ── */}
      {!expired && (
        <div
          className="absolute z-20 hidden sm:block"
          style={{ top: "26%", left: "52%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className="flex flex-col items-center gap-2"
            style={{
              width: 360,
              minHeight: 132,
              padding: "18px 24px",
              borderRadius: 20,
              background: "rgba(18,18,18,0.78)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
            }}
          >
            <span
              className="font-bold px-3 py-1 rounded-xl border whitespace-nowrap"
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#86efac",
                background: "rgba(34,197,94,0.18)",
                borderColor: "rgba(34,197,94,0.32)",
              }}
            >
              0% Fees Until 31 August
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
              Offer ends in
            </span>
            <div className="flex items-baseline gap-1 tabular-nums" style={{ color: "#fff" }}>
              <span className="font-display" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{pad2(days)}</span>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>d</span>
              <span className="font-display" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{pad2(hours)}</span>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>h</span>
              <span className="font-display" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{pad2(minutes)}</span>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>m</span>
              <span className="font-display" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{pad2(seconds)}</span>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>s</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
