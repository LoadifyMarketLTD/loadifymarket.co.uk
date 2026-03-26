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
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
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
          background-image: url('/hero.jpeg');
          background-size: cover;
          background-position: center right;
          background-repeat: no-repeat;
          overflow: hidden;
        }

        /* ── Badge + countdown block — upper-center / slightly-right sky ── */
        .lfy-hero-promo {
          position: absolute;
          top: 12%;
          left: 52%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 3;
        }
        .lfy-hero-badge {
          background: #FEF3C7;
          color: #92400E;
          font-size: 1rem;
          font-weight: 800;
          padding: 9px 22px;
          border-radius: 999px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .lfy-hero-countdown {
          background: rgba(255, 255, 255, 0.93);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          color: #0A2239;
          font-size: 1.6rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          padding: 12px 28px;
          border-radius: 14px;
          border: 1.5px solid rgba(255,255,255,0.85);
          box-shadow: 0 6px 24px rgba(0,0,0,0.22);
          white-space: nowrap;
          letter-spacing: 0.07em;
        }

        /* ── Left text block — left sky area ── */
        .lfy-hero-text {
          position: absolute;
          top: 26%;
          left: 0;
          width: 42%;
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
          background: #22C55E;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9375rem;
          padding: 13px 32px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(34,197,94,0.45);
          transition: background 0.15s ease, transform 0.1s ease;
          white-space: nowrap;
        }
        .lfy-btn-primary:hover {
          background: #16a34a;
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
            top: 8%;
            left: 50%;
            transform: translateX(-50%);
          }
          .lfy-hero-countdown {
            font-size: 1.25rem;
            padding: 10px 20px;
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

        {/* Badge + countdown — top center / slightly right sky area */}
        {!expired && (
          <div className="lfy-hero-promo">
            <span className="lfy-hero-badge">0% Fees Until July 1</span>
            <span className="lfy-hero-countdown">
              {pad(time.days)}d&nbsp;{pad(time.hours)}h&nbsp;{pad(time.minutes)}m&nbsp;{pad(time.seconds)}s
            </span>
          </div>
        )}

        {/* Left text block — left sky area */}
        <div className="lfy-hero-text">
          <h1 className="lfy-hero-headline">
            Grow your sales with Loadify Market
          </h1>
          <p className="lfy-hero-subtext">
            Sell smarter. Reach more buyers. Scale your business faster.
          </p>
          <div className="lfy-hero-cta">
            <button
              className="lfy-btn-primary"
              onClick={() => setRoleModalOpen(true)}
            >
              Get Started
            </button>
            <Link to="/catalog">
              <button className="lfy-btn-secondary">
                Browse Marketplace
              </button>
            </Link>
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
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#22C55E] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
                  <span className="text-2xl">🛒</span>
                  <div>
                    <p className="font-semibold text-[#0A2239]">I'm a Buyer</p>
                    <p className="text-xs text-gray-500">Browse and buy products</p>
                  </div>
                </div>
              </Link>
              <Link to="/signup?type=seller" onClick={() => setRoleModalOpen(false)}>
                <div className="flex items-center gap-4 border-2 border-gray-200 hover:border-[#22C55E] hover:bg-green-50 rounded-xl p-4 cursor-pointer transition-all">
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
