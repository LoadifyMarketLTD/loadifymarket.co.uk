import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
      {/* ── CTA buttons overlaid on the image's built-in button area ── */}
      <div
        className="absolute z-10 flex flex-wrap gap-4"
        style={{
          left: "clamp(24px, 6vw, 80px)",
          bottom: "clamp(80px, 16%, 140px)",
        }}
      >
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
