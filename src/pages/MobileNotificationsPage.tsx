/**
 * MobileNotificationsPage — /profile/notifications
 *
 * Simple mobile notifications list. Shows messages, orders and offers.
 * No advanced controls, no daily limits, no email/push split.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  MOBILE_NOTIFICATION_QUERY_TYPES,
  normalizeNotification,
} from '@/lib/notificationUtils';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import MobileBottomNav from '@/components/MobileBottomNav';
import type { AppNotification } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MobileNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { open: promptAuth } = useAuthPromptStore();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      promptAuth('message');
      return;
    }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, link, isRead, createdAt')
        .eq('userId', user.id)
        .in('type', MOBILE_NOTIFICATION_QUERY_TYPES)
        .order('createdAt', { ascending: false })
        .limit(50);
      setItems(((data as AppNotification[]) ?? []).map(normalizeNotification));
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`mobile-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${user.id}`,
        },
        async () => {
          const { data } = await supabase
            .from('notifications')
            .select('id, type, title, message, link, isRead, createdAt')
            .eq('userId', user.id)
            .in('type', MOBILE_NOTIFICATION_QUERY_TYPES)
            .order('createdAt', { ascending: false })
            .limit(50);

          setItems(((data as AppNotification[]) ?? []).map(normalizeNotification));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ isRead: true, readAt: new Date().toISOString() })
      .eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleTap = (item: AppNotification) => {
    if (!item.isRead) markRead(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <button
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft className="text-foreground/70" style={{ width: 22, height: 22 }} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground m-0">Activity</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: 32 }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white/[0.05]"
              style={{ height: 56, borderRadius: 12, marginBottom: 8 }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 64,
            gap: 12,
            textAlign: 'center',
          }}
        >
          <Bell className="text-foreground/20" style={{ width: 36, height: 36 }} aria-hidden="true" />
          <p className="text-[15px] font-semibold text-foreground/40 m-0">
            No notifications yet
          </p>
          <p className="text-[13px] text-foreground/25 m-0" style={{ maxWidth: 240 }}>
            Messages, orders, and offers will appear here.
          </p>
        </div>
      ) : (
        <div
          className="bg-white/[0.04]"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {items.map((item, i) => (
            <div key={item.id}>
              <button
                onClick={() => handleTap(item)}
                className={item.isRead ? 'bg-transparent' : 'bg-primary/[0.04]'}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  width: '100%',
                  paddingInline: 'var(--mob-side, 16px)',
                  paddingTop: 14,
                  paddingBottom: 14,
                  border: 'none',
                  cursor: item.link ? 'pointer' : 'default',
                  textAlign: 'left',
                  gap: 10,
                }}
              >
                {/* Unread dot */}
                <div
                  className={item.isRead ? '' : 'bg-primary'}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: item.isRead ? 'transparent' : undefined, flexShrink: 0, marginTop: 6 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className={`text-sm text-foreground/90 m-0 ${item.isRead ? 'font-medium' : 'font-bold'}`} style={{ lineHeight: 1.3 }}>
                    {item.title}
                  </p>
                  {item.message ? (
                    <p className="text-[13px] text-muted-foreground" style={{ margin: '3px 0 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.message}
                    </p>
                  ) : null}
                  <p className="text-[11px] text-foreground/25" style={{ margin: '4px 0 0' }}>
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </button>
              {i < items.length - 1 && (
                <div
                  aria-hidden="true"
                  className="bg-white/[0.05]"
                  style={{ height: 1, marginInlineStart: 'var(--mob-side, 16px)' }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
