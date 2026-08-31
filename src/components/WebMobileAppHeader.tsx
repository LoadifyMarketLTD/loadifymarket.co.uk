/**
 * WebMobileAppHeader — premium mobile-browser homepage header.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, SlidersHorizontal } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { MOBILE_NOTIFICATION_QUERY_TYPES } from '@/lib/notificationUtils';
import WebMobileSearchOverlay from '@/components/WebMobileSearchOverlay';
import logo from '@/assets/LOGO.png';

export default function WebMobileAppHeader() {
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
          paddingTop: 'calc(0.7rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.75rem',
          paddingLeft: 16,
          paddingRight: 16,
        }}
        className="border-b border-[#0A234F]/[0.07] bg-[#F8F7F4] text-[#0A234F]"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Loadify Market home"
            className="flex min-w-0 flex-1 items-center border-0 bg-transparent p-0 text-left"
          >
            <img
              src={logo}
              alt=""
              aria-hidden="true"
              className="h-9 w-auto max-w-[170px] object-contain"
            />
          </button>

          <button
            onClick={() => navigate('/profile/notifications')}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            className="relative flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#0A234F]/[0.08] bg-white p-0 text-[#334155]"
          >
            <Bell style={{ width: 20, height: 20 }} aria-hidden="true" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="bg-[#0A234F] text-white"
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
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
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search products and categories"
            className="flex h-11 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-[#0A234F]/10 bg-white px-3.5 text-left shadow-[0_2px_8px_rgba(15,23,42,0.025)]"
          >
            <Search style={{ width: 18, height: 18, flexShrink: 0 }} className="text-[#64748B]" aria-hidden="true" />
            <span
              className="text-[#7A8492]"
              style={{
                fontSize: 13.5,
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
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#0A234F]/10 bg-white text-[#475569] shadow-[0_2px_8px_rgba(15,23,42,0.025)]"
          >
            <SlidersHorizontal style={{ width: 18, height: 18 }} aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && <WebMobileSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
