/**
 * MobileHeroBanner
 *
 * Dominant 0% commission banner card for the mobile APK home screen.
 * Premium dark card with large gold "0%" 3D text, pitch copy, and a CTA.
 * Static pagination dots (no carousel interaction needed for MVP).
 */

import { Link } from 'react-router-dom';

export default function MobileHeroBanner() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #111216 0%, #1a1608 100%)',
        borderRadius: 20,
        minHeight: 200,
        margin: '0 16px',
        padding: '24px 20px',
        border: '1px solid rgba(242,184,75,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(242,184,75,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Left column ── */}
      <div style={{ flex: 1, paddingRight: 12 }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: '#F2B84B',
            lineHeight: 1,
            fontFamily: 'var(--font-display)',
          }}
        >
          0% COMMISSION
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#FFFFFF',
            marginTop: 6,
            lineHeight: 1.2,
          }}
        >
          KEEP 100% OF YOUR SALE
        </div>
        <div
          style={{
            fontSize: 12,
            color: '#A6A6A6',
            marginTop: 4,
            lineHeight: 1.4,
          }}
        >
          Buy. Sell. Save more with Loadify.
        </div>
        <Link
          to="/register?type=seller"
          style={{
            display: 'inline-block',
            marginTop: 14,
            background: 'linear-gradient(135deg, #D89A28, #F7C867)',
            color: '#000',
            fontWeight: 700,
            fontSize: 13,
            padding: '8px 16px',
            borderRadius: 12,
            textDecoration: 'none',
            lineHeight: 1,
          }}
        >
          Start Selling
        </Link>
      </div>

      {/* ── Right column: 3D gold 0% visual ── */}
      <div
        style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {/* Large italic 0% */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: '#F2B84B',
            lineHeight: 1,
            letterSpacing: -2,
            textShadow:
              '0 0 30px rgba(242,184,75,0.6), 0 0 60px rgba(242,184,75,0.3)',
            fontStyle: 'italic',
            fontFamily: 'var(--font-display)',
          }}
        >
          0%
        </div>

        {/* COMMISSION badge */}
        <div
          style={{
            marginTop: 4,
            background: 'linear-gradient(135deg, #D89A28, #F7C867)',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: '#000',
            letterSpacing: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ◆ COMMISSION
        </div>

        {/* Pedestal base */}
        <div
          style={{
            marginTop: 4,
            width: 80,
            height: 14,
            background: 'linear-gradient(135deg, #8B6914, #D89A28)',
            borderRadius: 6,
            opacity: 0.7,
          }}
        />
      </div>

      {/* ── Pagination dots ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
        aria-hidden="true"
      >
        {/* Active dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            background: '#FFFFFF',
          }}
        />
        {/* Inactive dots */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.3)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
