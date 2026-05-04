/**
 * AppOnboarding — /welcome
 *
 * First-launch onboarding flow for the Loadify Market APK.
 * Shows 4 screens: Welcome → Discover → Sell → Get Started.
 * Persisted via @capacitor/preferences on APK, localStorage on web.
 * After completing or skipping, navigates to "/" and never shows again.
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isCapacitorNative } from "@/lib/capacitorUtils";

const ONBOARDING_KEY = "loadify_onboarding_v1";

async function markOnboardingSeen(): Promise<void> {
  if (isCapacitorNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key: ONBOARDING_KEY, value: "1" });
  } else {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* ignore */ }
  }
}

export async function hasSeenOnboarding(): Promise<boolean> {
  if (isCapacitorNative()) {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key: ONBOARDING_KEY });
    return value === "1";
  }
  try { return localStorage.getItem(ONBOARDING_KEY) === "1"; } catch { return false; }
}

// ── Slide content ─────────────────────────────────────────────────────────────

interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
  accentColor: string;
}

const SLIDES: Slide[] = [
  {
    emoji: "🛍️",
    title: "Welcome to Loadify Market",
    subtitle: "The UK marketplace built for modern buyers and sellers.",
    accentColor: "#F5B942",
  },
  {
    emoji: "🔍",
    title: "Discover Products",
    subtitle: "Browse thousands of listings from verified UK sellers — all in one place.",
    accentColor: "#A78BFA",
  },
  {
    emoji: "💰",
    title: "Sell Easily",
    subtitle: "List your products in minutes. 0% commission until December 2026.",
    accentColor: "#34D399",
  },
  {
    emoji: "🚀",
    title: "Ready to Start?",
    subtitle: "Create your account and join the Loadify community today.",
    accentColor: "#F5B942",
  },
];

// ── Dot indicator ─────────────────────────────────────────────────────────────

function DotIndicator({ total, active }: { total: number; active: number }) {
  return (
    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          style={{
            width: i === active ? "20px" : "6px",
            height: "6px",
            borderRadius: "3px",
            background: i === active ? "#F5B942" : "rgba(255,255,255,0.25)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "block",
          }}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AppOnboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  // If onboarding has already been seen, skip immediately to home
  useEffect(() => {
    hasSeenOnboarding().then((seen) => {
      if (seen) navigate("/", { replace: true });
    });
  }, [navigate]);

  const finish = async () => {
    setExiting(true);
    await markOnboardingSeen();
    // Short pause so the fade-out is visible
    setTimeout(() => navigate("/", { replace: true }), 250);
  };

  const next = () => {
    if (isLast) {
      void finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#07080B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 0 calc(env(safe-area-inset-bottom, 0px) + 32px)",
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.25s ease",
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      {/* Top bar — skip button */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
          padding: "calc(env(safe-area-inset-top, 0px) + 16px) 20px 0",
        }}
      >
        <button
          onClick={() => void finish()}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "none",
            borderRadius: "20px",
            padding: "6px 16px",
            color: "rgba(255,255,255,0.60)",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div
        key={step}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 32px",
          textAlign: "center",
          animation: "onboard-fade-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) both",
        }}
      >
        {/* Emoji icon in a glowing circle */}
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: `${slide.accentColor}18`,
            border: `2px solid ${slide.accentColor}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "44px",
            marginBottom: "32px",
            boxShadow: `0 0 48px ${slide.accentColor}25`,
          }}
        >
          {slide.emoji}
        </div>

        <h1
          style={{
            fontSize: "clamp(24px, 6vw, 30px)",
            fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1.2,
            marginBottom: "14px",
          }}
        >
          {slide.title}
        </h1>
        <p
          style={{
            fontSize: "clamp(14px, 4vw, 16px)",
            color: "rgba(255,255,255,0.60)",
            lineHeight: 1.55,
            maxWidth: "320px",
          }}
        >
          {slide.subtitle}
        </p>
      </div>

      {/* Bottom controls */}
      <div
        style={{
          width: "100%",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          alignItems: "center",
        }}
      >
        {/* Dot indicator */}
        <DotIndicator total={SLIDES.length} active={step} />

        {/* Primary CTA button */}
        <button
          onClick={next}
          style={{
            width: "100%",
            maxWidth: "360px",
            padding: "17px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #F5C842, #C8860A)",
            color: "#0B0B0F",
            fontSize: "16px",
            fontWeight: 800,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(200,134,10,0.40)",
            letterSpacing: "0.01em",
          }}
          className="active:opacity-80 transition-opacity"
        >
          {isLast ? "Get Started" : "Next"}
        </button>

        {/* Secondary: sign in link on last slide */}
        {isLast && (
          <button
            onClick={() => { void finish(); setTimeout(() => navigate("/login"), 250); }}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.50)",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            Already have an account? <span style={{ color: "#F5B942", fontWeight: 700 }}>Sign in</span>
          </button>
        )}
      </div>

      {/* Slide-in animation keyframes */}
      <style>{`
        @keyframes onboard-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
