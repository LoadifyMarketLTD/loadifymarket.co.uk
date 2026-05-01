/**
 * MobileAppHeader — mobile-only top header bar.
 *
 * Shows: LM logo + branding (left) | Bell notification icon + filter button (right)
 * Hidden on desktop via the parent's md:hidden wrapper.
 */

import { Bell, SlidersHorizontal } from 'lucide-react';

export default function MobileAppHeader() {
  return (
    <header
      className="flex items-center justify-between px-4"
      style={{
        background: '#07080B',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.75rem',
      }}
    >
      {/* ── Left: logo + brand name ─── */}
      <div className="flex items-center gap-2.5">
        {/* Hexagonal LM badge */}
        <div
          style={{
            width: 40,
            height: 40,
            border: '2px solid #F2B84B',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #1E1A0E 0%, #111216 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#F2B84B',
              letterSpacing: 0.5,
              fontFamily: 'var(--font-display)',
            }}
          >
            LM
          </span>
        </div>

        {/* Brand text */}
        <div className="flex flex-col leading-none gap-0">
          <div className="flex items-baseline gap-1">
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: 1.5,
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              LOADIFY
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: 1.5,
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
              }}
            >
              MARKET
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(242,184,75,0.8)',
              letterSpacing: 0.5,
              marginTop: 2,
            }}
          >
            0% COMMISSION
          </span>
        </div>
      </div>

      {/* ── Right: bell + filter ─── */}
      <div className="flex items-center gap-2">
        {/* Bell with badge */}
        <div className="relative p-1">
          <Bell
            style={{ width: 20, height: 20, color: '#FFFFFF' }}
            aria-label="Notifications"
          />
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              minWidth: 16,
              height: 16,
              borderRadius: 9999,
              background: '#F2B84B',
              color: '#000',
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: 2,
              paddingRight: 2,
            }}
          >
            3
          </span>
        </div>

        {/* Filter button */}
        <button
          aria-label="Filter"
          style={{
            width: 36,
            height: 36,
            background: '#1E1A0E',
            border: '1px solid rgba(242,184,75,0.4)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal
            style={{ width: 18, height: 18, color: '#F2B84B' }}
            aria-hidden="true"
          />
        </button>
      </div>
    </header>
  );
}
