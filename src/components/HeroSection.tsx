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
    let id: ReturnType<typeof setInterval> | undefined;
    // Defer timer start until after the browser's first idle period so it
    // does not compete with LCP painting or inflate INP on low-end devices.
    // Falls back to immediate start in environments without requestIdleCallback.
    const startTimer = () => { id = setInterval(() => setTime(getTimeLeft()), 1000); };
    if ('requestIdleCallback' in window) {
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
      {/* scoped styles — kept inside this file so HeroSection is self-contained */}
      <style>{`
        .lfy-hero {
          position: relative;
          height: 100vh;
          min-height: 600px;
          overflow: hidden;
        }
        .lfy-hero-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center right;
          z-index: 0;
        }

        /* ── Badge + countdown block — upper-center / slightly-right sky ── */
        .lfy-hero-promo {
          position: absolute;
          top: 7%;
          left: 55%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          z-index: 3;
        }
        .lfy-hero-badge {
          background: #FEF3C7;
          color: #92400E;
          font-size: 1.125rem;
          font-weight: 800;
          padding: 10px 28px;
          border-radius: 999px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.22);
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .lfy-hero-promo-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0A2239;
          opacity: 0.7;
          margin-bottom: -4px;
        }
        .lfy-hero-countdown-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 18px;
          border: 1.5px solid rgba(255,255,255,0.9);
          box-shadow: 0 8px 32px rgba(0,0,0,0.22);
          padding: 18px 32px 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 280px;
        }
        .lfy-hero-countdown {
          color: #0A2239;
          font-size: 2.25rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
          letter-spacing: 0.06em;
          line-height: 1;
        }
        .lfy-hero-countdown-sub {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        /* ── Left text block — left sky area ── */
        .lfy-hero-text {
          position: absolute;
          top: 8%;
          left: 0;
          width: 44%;
          padding: 0 24px 0 52px;
          z-index: 2;
          display: flex;
          flex-direction: column;
        }
        .lfy-hero-headline {
          font-size: clamp(1.875rem, 3vw, 2.875rem);
          font-weight: 800;
          color: #0A2239;
          line-height: 1.15;
          max-width: 500px;
          margin-bottom: 16px;
          text-shadow: 0 1px 6px rgba(255,255,255,0.7);
        }
        .lfy-hero-subtext {
          font-size: 1.0625rem;
          line-height: 1.65;
          color: #1e293b;
          font-weight: 500;
          max-width: 420px;
          margin-bottom: 34px;
          text-shadow: 0 1px 4px rgba(255,255,255,0.55);
        }
        .lfy-hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .lfy-btn-primary {
          background: #15803d;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9375rem;
          padding: 13px 32px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(21,128,61,0.45);
          transition: background 0.15s ease, transform 0.1s ease;
          white-space: nowrap;
        }
        .lfy-btn-primary:hover {
          background: #14532d;
          transform: translateY(-1px);
        }
        .lfy-btn-secondary {
          background: rgba(255,255,255,0.88);
          color: #0A2239;
          font-weight: 700;
          font-size: 0.9375rem;
          padding: 12px 30px;
          border-radius: 10px;
          border: 2px solid rgba(10,34,57,0.55);
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
          white-space: nowrap;
        }
        .lfy-btn-secondary:hover {
          background: #0A2239;
          color: #ffffff;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .lfy-hero-promo {
            top: 6%;
            left: 50%;
            transform: translateX(-50%);
          }
          .lfy-hero-countdown-card {
            min-width: 220px;
            padding: 14px 20px 10px;
          }
          .lfy-hero-countdown {
            font-size: 1.625rem;
          }
          .lfy-hero-badge {
            font-size: 0.9375rem;
            padding: 8px 18px;
          }
          .lfy-hero-text {
            top: auto;
            bottom: 6%;
            width: 90%;
            padding: 0 20px;
          }
          .lfy-hero-headline {
            font-size: 1.5rem;
          }
        }
      `}</style>

      <section className="lfy-hero" aria-label="Hero banner">
        {/* LCP image — served as explicit <img> so browsers can discover and
            prioritise it via the preload scanner. WebP (smaller) for modern
            browsers; JPEG as fallback. fetchPriority="high" + loading="eager" +
            decoding="sync" eliminate any scheduling or decode delay for LCP. */}
        <picture>
          <source srcSet="/hero.webp" type="image/webp" />
          <img
            src="/hero.jpeg"
            alt=""
            aria-hidden="true"
            className="lfy-hero-bg"
            fetchPriority="high"
            loading="eager"
            width="1536"
            height="1024"
          />
        </picture>

        {/* Badge + countdown — top center / slightly right sky area */}
        {!expired && (
          <div className="lfy-hero-promo">
            <span className="lfy-hero-badge">🎉 0% Fees Until July 1</span>
            <div className="lfy-hero-countdown-card">
              <span className="lfy-hero-promo-label">Offer ends in</span>
              <span className="lfy-hero-countdown">
                {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
              </span>
              <span className="lfy-hero-countdown-sub">days · hours · minutes · seconds</span>
            </div>
          </div>
        )}

        {/* Left text block — left sky area */}
        <div className="lfy-hero-text">
          <h1 className="lfy-hero-headline">
            Buy &amp; Sell Products Across the UK — All in One Marketplace
          </h1>
          <p className="lfy-hero-subtext">
            Browse products from independent sellers across multiple categories — from everyday items to wholesale and clearance deals.
          </p>
          <div className="lfy-hero-cta">
            <Link to="/catalog">
              <button className="lfy-btn-primary">
                Browse Marketplace
              </button>
            </Link>
            <button
              className="lfy-btn-secondary"
              onClick={() => setRoleModalOpen(true)}
            >
              Start Selling
            </button>
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
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#15803d] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Buyer</p>
                    <p className="text-xs text-gray-500">Browse and buy products</p>
                  </div>
                </div>
              </Link>
              <Link to="/signup?type=seller" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#15803d] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
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
