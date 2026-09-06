/**
 * MobileAppHeader — native-app marketplace header.
 *
 * Keeps Loadify identity while prioritising discovery: compact branding,
 * notification access and a persistent full-width marketplace search entry.
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, SlidersHorizontal } from 'lucide-react';
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
      // Non-critical: keep the last known badge value.
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
        className="sticky top-0 z-[60] border-b border-[#0A234F]/[0.08] bg-white/95 text-[#0A234F] shadow-[0_3px_18px_rgba(10,35,79,0.06)]"
        style={{
          paddingTop: 'calc(0.55rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 10,
          paddingLeft: 14,
          paddingRight: 14,
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="flex min-w-0 items-center gap-2.5 border-0 bg-transparent p-0 text-left"
            aria-label="Loadify Market home"
          >
            <img src={logo} alt="" aria-hidden="true" width={38} height={38} className="h-[38px] w-[38px] shrink-0" />
            <span className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap text-[13px] font-black uppercase leading-none tracking-[0.11em]">
              <span className="text-[#0A234F]">Loadify</span>
              <span className="text-[#C98200]">Market</span>
            </span>
          </button>

          <button
            onClick={() => navigate('/profile/notifications')}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0A234F]/10 bg-[#F7F9FC] p-0"
          >
            <Bell className="h-5 w-5 text-[#0A234F]" strokeWidth={2} aria-hidden="true" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full border-2 border-white bg-[#F5A300] px-0.5 text-[9px] font-black text-[#0A234F]"
                style={{ height: 17 }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search Loadify Market"
            className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-[14px] border border-[#0A234F]/10 bg-[#F4F6F8] px-3.5 text-left"
          >
            <Search className="h-[19px] w-[19px] shrink-0 text-[#526071]" strokeWidth={2} aria-hidden="true" />
            <span className="truncate text-[14px] font-medium text-[#667085]">Search for items, brands or categories</span>
          </button>

          <button
            type="button"
            aria-label="Browse catalogue filters"
            onClick={() => navigate('/catalog')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[#0A234F]/10 bg-white"
          >
            <SlidersHorizontal className="h-5 w-5 text-[#0A234F]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && <MobileSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}
