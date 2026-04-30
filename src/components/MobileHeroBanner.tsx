/**
 * MobileHeroBanner — 0% COMMISSION brand hero for the mobile homepage.
 *
 * Spec (from design direction):
 *   - Full width (16px margins), height 190–210px, radius 20px
 *   - Background: gradient #0F0F14 → #1A1A22
 *   - LEFT: "0% COMMISSION" (large gold dominant), "KEEP 100% OF YOUR SALE" (white),
 *            "Buy. Sell. Save more with Loadify." (gray), "Start Selling" gold CTA
 *   - RIGHT: Large premium gold "0%" visual with glow, "COMMISSION" label below
 *   - Gold radial glow behind the right visual
 *   - Carousel indicator dots below the banner
 *
 * This is the core brand identity of the homepage — it must visually dominate.
 */

import { Link } from 'react-router-dom';

export default function MobileHeroBanner() {
  return (
    <div className="px-4 pb-2" aria-label="0% Commission — Start Selling Today">
      {/* ── Banner card ─────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F0F14 0%, #1C1B14 50%, #1A1A22 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.07)',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'stretch',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Radial gold glow — behind the right "0%" visual */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '-10px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,185,66,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── LEFT: Text content ────────────────────────────────────────── */}
        <div
          style={{
            flex: '0 0 auto',
            width: '55%',
            padding: '20px 0 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* "0% COMMISSION" — dominant headline */}
          <p
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#F5B942',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              marginBottom: '7px',
              textTransform: 'uppercase',
            }}
          >
            0% COMMISSION
          </p>

          {/* "KEEP 100% OF YOUR SALE" */}
          <p
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.25,
              letterSpacing: '0.01em',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            KEEP 100% OF YOUR SALE
          </p>

          {/* Supporting description */}
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.50)',
              lineHeight: 1.4,
              marginBottom: '16px',
            }}
          >
            Buy. Sell. Save more with Loadify.
          </p>

          {/* "Start Selling" CTA */}
          <Link
            to="/register?type=seller"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F5B942',
              color: '#0B0B0F',
              fontWeight: 700,
              fontSize: '13px',
              padding: '10px 18px',
              borderRadius: '10px',
              textDecoration: 'none',
              alignSelf: 'flex-start',
              whiteSpace: 'nowrap',
            }}
          >
            Start Selling
          </Link>
        </div>

        {/* ── RIGHT: Premium "0%" visual ────────────────────────────────── */}
        <div
          style={{
            flex: '0 0 auto',
            width: '45%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 12px 12px 0',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Large gold "0%" */}
          <span
            aria-hidden="true"
            style={{
              display: 'block',
              fontSize: '76px',
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: '-0.05em',
              background: 'linear-gradient(160deg, #FFE066 0%, #F5B942 40%, #C8860A 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 18px rgba(245,185,66,0.55)) drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
            }}
          >
            0%
          </span>

          {/* "COMMISSION" platform label */}
          <div
            aria-hidden="true"
            style={{
              marginTop: '8px',
              backgroundColor: 'rgba(245,185,66,0.15)',
              border: '1px solid rgba(245,185,66,0.35)',
              borderRadius: '6px',
              padding: '3px 8px',
            }}
          >
            <span
              style={{
                fontSize: '8px',
                fontWeight: 800,
                color: '#F5B942',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              }}
            >
              COMMISSION
            </span>
          </div>
        </div>
      </div>

      {/* ── Carousel indicator dots ──────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}
      >
        {/* Active dot */}
        <div style={{ width: '20px', height: '4px', borderRadius: '2px', backgroundColor: '#F5B942' }} />
        <div style={{ width: '8px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.22)' }} />
        <div style={{ width: '8px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.22)' }} />
        <div style={{ width: '8px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.22)' }} />
      </div>
    </div>
  );
}
