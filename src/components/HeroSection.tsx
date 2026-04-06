import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store";

/**
 * Countdown target: UK midnight at start of July 1, 2026 (Europe/London).
 * July 1 is in BST (UTC+1), so UK midnight == 2026-06-30T23:00:00Z.
 * LOCKED per instruction.
 */
const TARGET_TIME = new Date("2026-06-30T23:00:00Z").getTime();

/**
 * Combined height of fixed Header row (64px) + Header category nav (48px).
 * Used to size the hero so it fills the visible viewport below the fixed headers.
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
        backgroundImage: "url('/hero-final.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        minHeight: `clamp(520px, calc(100vh - ${HEADER_HEIGHT_PX}px), 800px)`,
      }}
    >
      {/* ── Invisible click zones aligned over the image's built-in buttons ── */}
      {/* Desktop: positioned using pixel values matching the hero-final.jpg button locations */}
      <div className="absolute z-10 hidden sm:block" style={{ left: 0, bottom: 0, right: 0, top: 0, pointerEvents: "none" }}>
        {/* Start Selling — invisible click zone */}
        <button
          style={{
            position: "absolute",
            left: 52,
            top: 549,
            width: 238,
            height: 54,
            borderRadius: 9999,
            background: "transparent",
            border: "none",
            boxShadow: "none",
            color: "transparent",
            fontSize: 0,
            padding: 0,
            outline: "none",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
          onClick={() => navigate(user ? "/dashboard/seller" : "/register?role=seller")}
          aria-label="Start selling on Loadify Market"
        >
          Start Selling
        </button>

        {/* Browse Products — invisible click zone */}
        <button
          style={{
            position: "absolute",
            left: 328,
            top: 549,
            width: 225,
            height: 54,
            borderRadius: 9999,
            background: "transparent",
            border: "none",
            boxShadow: "none",
            color: "transparent",
            fontSize: 0,
            padding: 0,
            outline: "none",
            cursor: "pointer",
            pointerEvents: "auto",
          }}
          onClick={() => navigate("/catalog")}
          aria-label="Browse products on Loadify Market"
        >
          Browse Products
        </button>
      </div>

      {/* Mobile fallback — visible buttons below image area when pixel positioning won't align */}
      <div
        className="absolute z-10 flex flex-wrap gap-3 sm:hidden"
        style={{ left: "clamp(16px, 5vw, 48px)", bottom: "clamp(24px, 8%, 64px)" }}
      >
        <button
          className="inline-flex items-center justify-center font-bold rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#22C55E] focus-visible:outline-offset-2"
          style={{
            height: 48,
            paddingLeft: 24,
            paddingRight: 24,
            fontSize: "0.875rem",
            color: "#fff",
            background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
            boxShadow: "0 2px 12px rgba(34,197,94,0.45)",
            cursor: "pointer",
          }}
          onClick={() => navigate(user ? "/dashboard/seller" : "/register?role=seller")}
          aria-label="Start selling on Loadify Market"
        >
          Start Selling →
        </button>
        <button
          className="inline-flex items-center justify-center font-bold rounded-full border"
          style={{
            height: 48,
            paddingLeft: 24,
            paddingRight: 24,
            fontSize: "0.875rem",
            color: "rgba(255,255,255,0.90)",
            background: "rgba(255,255,255,0.06)",
            borderColor: "rgba(255,255,255,0.40)",
            cursor: "pointer",
          }}
          onClick={() => navigate("/catalog")}
          aria-label="Browse products on Loadify Market"
        >
          Browse Products →
        </button>
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
  );
};

export default HeroSection;
