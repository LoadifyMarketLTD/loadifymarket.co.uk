/**
 * MobileAppHeader — mobile-only top header bar.
 *
 * Shows: M logo + branding (left) | Bell notification icon (right)
 *        Inline search bar + filter button (second row)
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Filter, Camera } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import MobileSearchOverlay from '@/components/MobileSearchOverlay';
import logo from '@/assets/loadify-logo.svg';

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
      style={{
        background: '#0A0E1A',
        paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
        paddingBottom: '0.75rem',
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {/* ── Row 1: logo + brand name (left) | bell (right) ─── */}
      <div className="flex items-center justify-between">
        {/* Left: logo + brand */}
        <div className="flex items-center gap-2.5" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {/* Logo */}
          <img
            src={logo}
            alt=""
            aria-hidden="true"
            width={38}
            height={38}
            style={{ width: 38, height: 38, flexShrink: 0 }}
          />

          {/* Brand text */}
          <div className="flex flex-col leading-none" style={{ minWidth: 0, gap: 2 }}>
            <span
              style={{
                fontSize: 'clamp(14px, 4.2vw, 19px)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: 'clamp(0.5px, 0.2vw, 1px)',
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
              }}
            >
              Loadify
            </span>
            <span
              style={{
                fontSize: 'clamp(10px, 2.8vw, 13px)',
                fontWeight: 800,
                color: '#F2B84B',
                letterSpacing: 'clamp(0.5px, 0.3vw, 1.5px)',
                lineHeight: 1,
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
              }}
            >
              MARKET
            </span>
          </div>
        </div>

        {/* Right: bell */}
        <button
          onClick={() => navigate('/inbox')}
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
          style={{
            position: 'relative',
            width: 44,
            height: 44,
            padding: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Bell
            style={{ width: 22, height: 22, color: '#FFFFFF' }}
            aria-hidden="true"
          />
          {unread > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 17,
                height: 17,
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
      </div>

      {/* ── Row 2: search bar + filter button ─── */}
      <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
        {/* Search bar — taps open full-screen overlay */}
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search for items or members"
          style={{
            flex: 1,
            height: 44,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingLeft: 14,
            paddingRight: 14,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Search
            style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}
            aria-hidden="true"
          />
          <span
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            Search for items or members
          </span>
          <Camera
            style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}
            aria-hidden="true"
          />
        </button>

        {/* Filter button */}
        <button
          aria-label="Filter"
          onClick={() => navigate('/catalog')}
          style={{
            width: 44,
            height: 44,
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
          <Filter
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
