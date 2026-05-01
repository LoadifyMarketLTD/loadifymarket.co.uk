// MobileHeroBanner.tsx
//
// Premium 3-slide hero carousel with swipe, auto-advance, and clickable dots.
// Each slide has real text, a real CTA button, real navigation, and an inline
// SVG visual on the right side only (no full-background images).

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';

/* ─── Slide 1: 3D gold "0%" commission visual ─────────────────────────────── */
function Commission3D() {
  return (
    <svg
      viewBox="0 0 240 268"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s1-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFF8C0" />
          <stop offset="18%"  stopColor="#F5D06E" />
          <stop offset="50%"  stopColor="#C8860A" />
          <stop offset="80%"  stopColor="#8A5200" />
          <stop offset="100%" stopColor="#3D2000" />
        </linearGradient>
        <linearGradient id="s1-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E8A820" />
          <stop offset="50%"  stopColor="#B87010" />
          <stop offset="100%" stopColor="#4A2800" />
        </linearGradient>
        <radialGradient id="s1-glow" cx="50%" cy="55%" r="52%">
          <stop offset="0%"   stopColor="#C8860A" stopOpacity="0.50" />
          <stop offset="70%"  stopColor="#C8860A" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C8860A" stopOpacity="0"    />
        </radialGradient>
        <filter id="s1-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.90" />
        </filter>
      </defs>

      <ellipse cx="120" cy="168" rx="118" ry="110" fill="url(#s1-glow)" />

      {/* "0" — 3D extrusion */}
      <text x="84" y="220" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="172" fontWeight="900" fill="#2A1200" textAnchor="middle">0</text>
      <text x="82" y="218" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="172" fontWeight="900" fill="#5A3200" textAnchor="middle">0</text>
      <text x="80" y="216" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="172" fontWeight="900" fill="#8A5200" textAnchor="middle">0</text>
      <text x="78" y="214" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="172" fontWeight="900" fill="url(#s1-gold)" filter="url(#s1-shadow)" textAnchor="middle">0</text>

      {/* "%" — 3D extrusion */}
      <text x="200" y="186" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="92" fontWeight="900" fill="#2A1200" textAnchor="middle">%</text>
      <text x="198" y="184" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="92" fontWeight="900" fill="#5A3200" textAnchor="middle">%</text>
      <text x="196" y="182" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="92" fontWeight="900" fill="#8A5200" textAnchor="middle">%</text>
      <text x="194" y="180" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="92" fontWeight="900" fill="url(#s1-gold)" filter="url(#s1-shadow)" textAnchor="middle">%</text>

      {/* Cylindrical pedestal */}
      <path d="M 28 234 Q 28 252 120 256 Q 212 252 212 234 L 212 244 Q 212 262 120 266 Q 28 262 28 244 Z" fill="url(#s1-rim)" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="#130C00" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="none" stroke="#D4940A" strokeWidth="1.5" />
      <ellipse cx="88" cy="230" rx="28" ry="5" fill="rgba(255,215,80,0.20)" />
      <text x="120" y="239" fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="800" fill="#C8860A" textAnchor="middle" letterSpacing="1.4">◎ COMMISSION</text>
      <ellipse cx="120" cy="268" rx="84" ry="11" fill="#000000" opacity="0.45" />
    </svg>
  );
}

/* ─── Slide 2: 3D gold "30s" speed visual ────────────────────────────────── */
function SellFastVisual() {
  return (
    <svg
      viewBox="0 0 240 268"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s2-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFF8C0" />
          <stop offset="18%"  stopColor="#F5D06E" />
          <stop offset="50%"  stopColor="#C8860A" />
          <stop offset="80%"  stopColor="#8A5200" />
          <stop offset="100%" stopColor="#3D2000" />
        </linearGradient>
        <linearGradient id="s2-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E8A820" />
          <stop offset="50%"  stopColor="#B87010" />
          <stop offset="100%" stopColor="#4A2800" />
        </linearGradient>
        <radialGradient id="s2-glow" cx="50%" cy="55%" r="52%">
          <stop offset="0%"   stopColor="#C8860A" stopOpacity="0.50" />
          <stop offset="70%"  stopColor="#C8860A" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C8860A" stopOpacity="0"    />
        </radialGradient>
        <filter id="s2-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.90" />
        </filter>
      </defs>

      <ellipse cx="120" cy="168" rx="118" ry="110" fill="url(#s2-glow)" />

      {/* "30" — 3D extrusion */}
      <text x="104" y="218" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="138" fontWeight="900" fill="#2A1200" textAnchor="middle">30</text>
      <text x="102" y="216" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="138" fontWeight="900" fill="#5A3200" textAnchor="middle">30</text>
      <text x="100" y="214" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="138" fontWeight="900" fill="#8A5200" textAnchor="middle">30</text>
      <text x="98"  y="212" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="138" fontWeight="900" fill="url(#s2-gold)" filter="url(#s2-shadow)" textAnchor="middle">30</text>

      {/* "s" — 3D extrusion */}
      <text x="204" y="184" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="74" fontWeight="900" fill="#2A1200" textAnchor="middle">s</text>
      <text x="202" y="182" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="74" fontWeight="900" fill="#5A3200" textAnchor="middle">s</text>
      <text x="200" y="180" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="74" fontWeight="900" fill="#8A5200" textAnchor="middle">s</text>
      <text x="198" y="178" fontFamily="'Arial Black','Impact','Haettenschweiler',sans-serif" fontSize="74" fontWeight="900" fill="url(#s2-gold)" filter="url(#s2-shadow)" textAnchor="middle">s</text>

      {/* Cylindrical pedestal */}
      <path d="M 28 234 Q 28 252 120 256 Q 212 252 212 234 L 212 244 Q 212 262 120 266 Q 28 262 28 244 Z" fill="url(#s2-rim)" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="#130C00" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="none" stroke="#D4940A" strokeWidth="1.5" />
      <ellipse cx="88" cy="230" rx="28" ry="5" fill="rgba(255,215,80,0.20)" />
      <text x="120" y="239" fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="800" fill="#C8860A" textAnchor="middle" letterSpacing="1.4">◎ IN SECONDS</text>
      <ellipse cx="120" cy="268" rx="84" ry="11" fill="#000000" opacity="0.45" />
    </svg>
  );
}

/* ─── Slide 3: 3D gold shield with checkmark visual ──────────────────────── */
function TrustedShieldVisual() {
  const shield = "M 120 40 L 196 68 L 196 150 Q 196 196 120 222 Q 44 196 44 150 L 44 68 Z";
  const shieldInner = "M 120 54 L 184 78 L 184 150 Q 184 190 120 212 Q 56 190 56 150 L 56 78 Z";
  return (
    <svg
      viewBox="0 0 240 268"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="s3-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#FFF8C0" />
          <stop offset="18%"  stopColor="#F5D06E" />
          <stop offset="50%"  stopColor="#C8860A" />
          <stop offset="80%"  stopColor="#8A5200" />
          <stop offset="100%" stopColor="#3D2000" />
        </linearGradient>
        <linearGradient id="s3-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E8A820" />
          <stop offset="50%"  stopColor="#B87010" />
          <stop offset="100%" stopColor="#4A2800" />
        </linearGradient>
        <radialGradient id="s3-glow" cx="50%" cy="52%" r="52%">
          <stop offset="0%"   stopColor="#C8860A" stopOpacity="0.50" />
          <stop offset="70%"  stopColor="#C8860A" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C8860A" stopOpacity="0"    />
        </radialGradient>
        <filter id="s3-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.90" />
        </filter>
      </defs>

      <ellipse cx="120" cy="140" rx="108" ry="100" fill="url(#s3-glow)" />

      {/* Shield — 3D extrusion */}
      <g transform="translate(6,6)"><path d={shield} fill="#2A1200" /></g>
      <g transform="translate(4,4)"><path d={shield} fill="#5A3200" /></g>
      <g transform="translate(2,2)"><path d={shield} fill="#8A5200" /></g>
      <path d={shield} fill="url(#s3-gold)" filter="url(#s3-shadow)" />

      {/* Shield inner dark fill */}
      <path d={shieldInner} fill="rgba(0,0,0,0.42)" />

      {/* Checkmark */}
      <path d="M 88 132 L 111 157 L 158 104" fill="none" stroke="#FFF8C0" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />

      {/* Cylindrical pedestal */}
      <path d="M 28 234 Q 28 252 120 256 Q 212 252 212 234 L 212 244 Q 212 262 120 266 Q 28 262 28 244 Z" fill="url(#s3-rim)" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="#130C00" />
      <ellipse cx="120" cy="234" rx="92" ry="16" fill="none" stroke="#D4940A" strokeWidth="1.5" />
      <ellipse cx="88" cy="230" rx="28" ry="5" fill="rgba(255,215,80,0.20)" />
      <text x="120" y="239" fontFamily="Arial,sans-serif" fontSize="9.5" fontWeight="800" fill="#C8860A" textAnchor="middle" letterSpacing="1.4">◎ VERIFIED</text>
      <ellipse cx="120" cy="268" rx="84" ry="11" fill="#000000" opacity="0.45" />
    </svg>
  );
}

/* ─── Slide definitions ───────────────────────────────────────────────────── */
const SLIDES = [
  {
    title:    '0% COMMISSION',
    subtitle: 'KEEP 100% OF YOUR SALE',
    desc:     'Buy. Sell. Save more with Loadify.',
    cta:      'Start Selling',
    action:   '/register?type=seller',
    Visual:   Commission3D,
  },
  {
    title:    'SELL IN MINUTES',
    subtitle: 'POST YOUR ITEM IN 30 SECONDS',
    desc:     'No fees. No hassle. Just upload and start earning.',
    cta:      'Sell Now',
    action:   '/seller/products/new',
    Visual:   SellFastVisual,
  },
  {
    title:    'SAFE & TRUSTED',
    subtitle: 'VERIFIED USERS ONLY',
    desc:     'Secure deals. Real people. No scams.',
    cta:      'Explore Now',
    action:   '/catalog',
    Visual:   TrustedShieldVisual,
  },
] as const;

/* ─── Carousel component ──────────────────────────────────────────────────── */
export default function MobileHeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % SLIDES.length);
    }, 4000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goTo = useCallback((idx: number) => {
    setCurrent(idx);
    startTimer();
  }, [startTimer]);

  const handleCTA = (action: string) => {
    if ((action === '/register?type=seller' || action === '/seller/products/new') && hasSellerAccess(user)) {
      navigate('/seller/products/new');
    } else {
      navigate(action);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) {
      goTo(delta > 0
        ? (current + 1) % SLIDES.length
        : (current + SLIDES.length - 1) % SLIDES.length
      );
    }
    touchStartX.current = null;
  };

  return (
    <div className="px-4 mt-4">
      {/* Carousel container */}
      <div
        className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0F0F14] to-[#1A1A22] shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track */}
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {SLIDES.map((slide, i) => {
            const { Visual } = slide;
            return (
              <div
                key={i}
                className="relative flex-shrink-0 w-full p-5 flex items-center min-h-[200px]"
                aria-hidden={i !== current}
              >
                {/* Left text */}
                <div className="z-10 max-w-[55%]">
                  <h2 className="text-[34px] leading-[38px] font-extrabold text-[#F5C76E]">
                    {slide.title}
                  </h2>
                  <p className="text-white font-semibold mt-1 text-sm leading-snug">
                    {slide.subtitle}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {slide.desc}
                  </p>
                  <button
                    onClick={() => handleCTA(slide.action)}
                    className="mt-4 bg-gradient-to-r from-[#F5C76E] to-[#D4A94D] text-black font-semibold px-4 py-2 rounded-lg shadow-md active:scale-95 transition-transform"
                  >
                    {slide.cta}
                  </button>
                </div>

                {/* Right visual — inline SVG only, no background image */}
                <div className="absolute right-0 bottom-0 w-[52%] h-full flex items-end justify-end pointer-events-none">
                  <Visual />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clickable dots */}
      <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Carousel navigation">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-[#F5C76E]' : 'bg-gray-500'}`}
          />
        ))}
      </div>
    </div>
  );
}
