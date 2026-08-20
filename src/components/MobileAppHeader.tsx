/**
 * MobileAppHeader — mobile-only top header bar.
 *
 * Shows: logo + branding (left) | notifications (right)
 *        marketplace search + catalogue filter (second row)
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Filter } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { MOBILE_NOTIFICATION_QUERY_TYPES } from '@/lib/notificationUtils';
import MobileSearchOverlay from '@/components/MobileSearchOverlay';
import logo from '@/assets/loadify-logo.svg';

export default function MobileAppHeader() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadUnreadNotifications = useCallback(async () => {
    if (!user?.id) {
      setUnread(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('isRead', false)
        .not('isArchived', 'is', true)
        .in('type', MOBILE_NOTIFICATION_QUERY_TYPES);

      if (error) throw error;
      setUnread(count ?? 0);
    } catch {
      // Non-critical: unread badge stays at its current value on error.
    }
  }, [user?.id]);

  useEffect(() => {
    void loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`mobile-header-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        },
        () => {
          void loadUnreadNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadUnreadNotifications, user?.id]);

  return (
    <>
      <header
        style={{
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.75rem',
          paddingLeft: 16,
          paddingRight: 16,
        }}
        className="bg-background"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              width={38}
              height={38}
              style={{ width: 38, height: 38, flexShrink: 0 }}
            />

            <div className="flex flex-col leading-none" style={{ minWidth: 0, gap: 2 }}>
              <span
                className="text-foreground"
                style={{
                  fontSize: 'clamp(14px, 4.2vw, 19px)',
                  fontWeight: 800,
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
                  letterSpacing: 'clamp(0.5px, 0.3vw, 1.5px)',
                  lineHeight: 1,
                  fontFamily: 'var(--font-display)',
                  whiteSpace: 'nowrap',
                }}
                className="text-primary"
              >
                MARKET
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile/notifications')}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            className="relative h-11 w-11 shrink-0 cursor-pointer border-0 bg-transparent p-0 flex items-center justify-center"
          >
            <Bell style={{ width: 22, height: 22 }} className="text-white" aria-hidden="true" />
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
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingLeft: 2,
                  paddingRight: 2,
                }}
                className="bg-primary text-black"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search products and categories"
            className="h-11 flex-1 rounded-xl border border-white/15 bg-white/[0.07] px-3.5 text-left flex items-center gap-2.5 cursor-pointer"
          >
            <Search style={{ width: 18, height: 18, flexShrink: 0 }} className="text-white/65" aria-hidden="true" />
            <span
              className="text-foreground/70"
              style={{
                fontSize: 14,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              Search products and categories
            </span>
          </button>

          <button
            aria-label="Browse and filter catalogue"
            onClick={() => navigate('/catalog')}
            className="h-11 w-11 shrink-0 rounded-xl border border-[#f2b84b66] bg-[#1c1400] flex items-center justify-center cursor-pointer"
          >
            <Filter style={{ width: 18, height: 18 }} className="text-primary" aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && <MobileSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
