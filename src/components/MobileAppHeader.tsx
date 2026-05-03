/**
 * MobileAppHeader — mobile-only top header bar.
 *
 * Shows: LM logo + branding (left) | Bell notification icon + filter button (right)
 * Hidden on desktop via the parent's md:hidden wrapper.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, SlidersHorizontal } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import MobileSearchOverlay from '@/components/MobileSearchOverlay';

export default function MobileAppHeader() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { count } = await supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiverId', user.id)
          .eq('isRead', false);
        if (!cancelled) setUnread(count ?? 0);
      } catch {
        // Non-critical: unread badge stays at 0 on error
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);
  return (
    <>
    <header
      className="flex items-center justify-between px-4"
      style={{
        background: '#07080B',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.75rem',
      }}
    >
      {/* ── Left: logo + brand name ─── */}
      <div className="flex items-center gap-2.5" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        {/* Hexagonal LM badge */}
        <div
          style={{
            width: 36,
            height: 36,
            border: '2px solid #F2B84B',
            borderRadius: 9,
            background: 'linear-gradient(135deg, #1E1A0E 0%, #111216 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 'clamp(11px, 3.2vw, 14px)',
              fontWeight: 900,
              color: '#F2B84B',
              letterSpacing: 0.5,
              fontFamily: 'var(--font-display)',
            }}
          >
            LM
          </span>
        </div>

        {/* Brand text — fluid font size so it never overflows on narrow screens */}
        <div className="flex flex-col leading-none gap-0" style={{ minWidth: 0 }}>
          <div className="flex items-baseline gap-1" style={{ flexWrap: 'nowrap' }}>
            <span
              style={{
                fontSize: 'clamp(13px, 4vw, 18px)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: 'clamp(0.5px, 0.3vw, 1.5px)',
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
              }}
            >
              LOADIFY
            </span>
            <span
              style={{
                fontSize: 'clamp(13px, 4vw, 18px)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: 'clamp(0.5px, 0.3vw, 1.5px)',
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
              }}
            >
              MARKET
            </span>
          </div>
          <span
            style={{
              fontSize: 'clamp(8px, 2.5vw, 10px)',
              fontWeight: 600,
              color: 'rgba(242,184,75,0.8)',
              letterSpacing: 0.5,
              marginTop: 2,
              whiteSpace: 'nowrap',
            }}
          >
            0% COMMISSION
          </span>
        </div>
      </div>

      {/* ── Right: search + bell + filter ─── */}
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        {/* Search icon — opens full-screen overlay */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Open search"
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Search
            style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.80)' }}
            aria-hidden="true"
          />
        </button>

        {/* Bell with badge — navigates to inbox */}
        <button
          onClick={() => navigate('/inbox')}
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
          style={{
            position: 'relative',
            padding: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bell
            style={{ width: 20, height: 20, color: '#FFFFFF' }}
            aria-hidden="true"
          />
          {unread > 0 && (
            <span
              aria-hidden="true"
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
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Filter button — navigates to catalog */}
        <button
          aria-label="Filter"
          onClick={() => navigate('/catalog')}
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
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal
            style={{ width: 18, height: 18, color: '#F2B84B' }}
            aria-hidden="true"
          />
        </button>
      </div>
    </header>

    {/* Full-screen search overlay — rendered outside the header flow */}
    {searchOpen && <MobileSearchOverlay onClose={() => setSearchOpen(false)} />}
  </>
  );
}
