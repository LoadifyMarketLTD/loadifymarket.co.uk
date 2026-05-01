/**
 * MobileTopBar — fixed top bar matching the reference design (< md).
 *
 * LEFT : gold logo icon + "LOADIFY" / "MARKET" / "0% COMMISSION" text stack
 * RIGHT: bell icon with unread badge + gold filter/settings button
 *
 * Height: 70px (accommodates 3-line brand text)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, SlidersHorizontal } from 'lucide-react';
import logo from '@/assets/loadify-logo.svg';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';

export default function MobileTopBar() {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiverId', user.id)
        .eq('isRead', false);
      if (!cancelled) setUnread(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 bg-[#0B0B0F]"
      style={{
        minHeight: '70px',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
      aria-label="Loadify Market top bar"
    >
      {/* ── LEFT: Brand ─────────────────────────────────────────────────── */}
      <Link
        to="/"
        aria-label="Loadify Market — Home"
        style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}
      >
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          style={{ width: '42px', height: '42px', objectFit: 'contain' }}
        />

        {/* Brand text stack */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: '1px' }}>
          {/* "LOADIFY MARKET" — two-word row */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '0.01em',
              }}
            >
              LOADIFY
            </span>
            <span
              style={{
                fontSize: '18px',
                fontWeight: 400,
                color: '#FFFFFF',
                letterSpacing: '0.08em',
              }}
            >
              MARKET
            </span>
          </div>
          {/* "0% COMMISSION" tiny gold tag */}
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#C8860A',
              letterSpacing: '0.12em',
              marginTop: '2px',
            }}
          >
            0% COMMISSION
          </span>
        </div>
      </Link>

      {/* ── RIGHT: Bell + Filter ────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* Bell with unread badge */}
        <Link
          to="/inbox"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
          style={{ position: 'relative', padding: '6px', display: 'flex' }}
        >
          <Bell
            style={{ width: '23px', height: '23px', color: 'rgba(255,255,255,0.80)' }}
            aria-hidden="true"
          />
          {unread > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: '1px',
                right: '1px',
                minWidth: '18px',
                height: '18px',
                backgroundColor: '#F5B942',
                color: '#0B0B0F',
                fontSize: '10px',
                fontWeight: 800,
                borderRadius: '9px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
              }}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        {/* Gold filter / sliders button */}
        <Link
          to="/catalog"
          aria-label="Filter and sort marketplace"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245,185,66,0.12)',
            border: '1px solid rgba(200,134,10,0.40)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal
            style={{ width: '18px', height: '18px', color: '#F5B942' }}
            aria-hidden="true"
          />
        </Link>
      </div>
    </header>
  );
}
