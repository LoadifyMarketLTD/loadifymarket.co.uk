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
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import MobileBottomNav from '@/components/MobileBottomNav';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const RELEVANT_TYPES = ['message', 'order', 'new_offer', 'offer'] as const;

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

  const [items, setItems] = useState<NotificationRow[]>([]);
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
        .in('type', RELEVANT_TYPES)
        .order('createdAt', { ascending: false })
        .limit(50);
      setItems((data as NotificationRow[]) ?? []);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ isRead: true, readAt: new Date().toISOString() })
      .eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const handleTap = (item: NotificationRow) => {
    if (!item.isRead) markRead(item.id);
    if (item.link) navigate(item.link);
  };

  return (
    <div
      className="md:hidden min-h-screen"
      style={{
        background: '#07080B',
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
          <ChevronLeft style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.70)' }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Notifications</h1>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: 32 }}>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 56,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.05)',
                marginBottom: 8,
              }}
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
          <Bell style={{ width: 36, height: 36, color: 'rgba(255,255,255,0.20)' }} aria-hidden="true" />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.40)', margin: 0 }}>
            No notifications yet
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: 0, maxWidth: 240 }}>
            Messages, orders, and offers will appear here.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {items.map((item, i) => (
            <div key={item.id}>
              <button
                onClick={() => handleTap(item)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  width: '100%',
                  paddingInline: 'var(--mob-side, 16px)',
                  paddingTop: 14,
                  paddingBottom: 14,
                  background: item.isRead ? 'transparent' : 'rgba(242,184,75,0.04)',
                  border: 'none',
                  cursor: item.link ? 'pointer' : 'default',
                  textAlign: 'left',
                  gap: 10,
                }}
              >
                {/* Unread dot */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.isRead ? 'transparent' : '#F2B84B', flexShrink: 0, marginTop: 6 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: item.isRead ? 500 : 700, color: 'rgba(255,255,255,0.90)', margin: 0, lineHeight: 1.3 }}>
                    {item.title}
                  </p>
                  {item.message ? (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {item.message}
                    </p>
                  ) : null}
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', margin: '4px 0 0' }}>
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </button>
              {i < items.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginInlineStart: 'var(--mob-side, 16px)' }}
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
