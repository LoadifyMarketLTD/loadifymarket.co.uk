/**
 * MobileNotificationsPage — /profile/notifications
 *
 * Simple mobile notifications list. Shows messages, orders, and account activity.
 * No advanced controls, no daily limits, no email/push split.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bell, Archive, Trash2, MessageSquare, Package, Truck, WalletCards, RotateCcw, ShieldAlert, Tag, LifeBuoy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  MOBILE_NOTIFICATION_QUERY_TYPES,
  extractOrderNumber,
  formatActivityTypeLabel,
  normalizeMobileNotificationLink,
  normalizeNotification,
  notificationOrderMode,
} from '@/lib/notificationUtils';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { toast } from '@/hooks/use-toast';
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

function ActivityIcon({ type }: { type: string }) {
  let Icon = Bell;
  if (type === 'message' || type === 'product_question' || type === 'question_answered') Icon = MessageSquare;
  else if (type.startsWith('offer_')) Icon = Tag;
  else if (type === 'shipment') Icon = Truck;
  else if (type === 'delivery' || type === 'order') Icon = Package;
  else if (type === 'payment') Icon = WalletCards;
  else if (type === 'return') Icon = RotateCcw;
  else if (type === 'dispute') Icon = ShieldAlert;
  else if (type === 'support_ticket') Icon = LifeBuoy;
  return <Icon aria-hidden="true" style={{ width: 17, height: 17 }} />;
}

export default function MobileNotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { open: promptAuth } = useAuthPromptStore();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingNotificationId, setOpeningNotificationId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      promptAuth('message');
      return;
    }

    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, link, isRead, isArchived, createdAt')
        .eq('userId', user.id)
        .not('isArchived', 'is', true)
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
            .select('id, type, title, message, link, isRead, isArchived, createdAt')
            .eq('userId', user.id)
            .not('isArchived', 'is', true)
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

  const handleTap = async (item: AppNotification) => {
    if (openingNotificationId === item.id) return;
    setOpeningNotificationId(item.id);
    try {
      if (!item.isRead) await markRead(item.id);

      const orderMode = notificationOrderMode(item.link);
      let orderId: string | null = null;
      if (orderMode && user?.id) {
        const orderNumber = extractOrderNumber(item.title, item.message);
        if (orderNumber) {
          const ownerColumn = orderMode === 'sell' ? 'sellerId' : 'buyerId';
          const { data } = await supabase
            .from('orders')
            .select('id')
            .eq(ownerColumn, user.id)
            .eq('orderNumber', orderNumber)
            .limit(1)
            .maybeSingle<{ id: string }>();
          orderId = data?.id ?? null;
        }
      }

      const target = normalizeMobileNotificationLink(item.link, orderId);
      if (target) navigate(target);
    } finally {
      setOpeningNotificationId((prev) => (prev === item.id ? null : prev));
    }
  };

  const archiveNotification = async (id: string) => {
    if (!user?.id) return;
    setArchivingId(id);
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ isArchived: true, archivedAt: new Date().toISOString() })
        .eq('id', id)
        .eq('userId', user.id);
      if (error) throw error;
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast({ title: 'Failed to archive notification', variant: 'destructive' });
    } finally {
      setArchivingId((prev) => (prev === id ? null : prev));
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('userId', user.id);
      if (error) throw error;
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast({ title: 'Failed to delete notification', variant: 'destructive' });
    } finally {
      setDeletingId((prev) => (prev === id ? null : prev));
    }
  };

  return (
    <div
      className="md:hidden min-h-screen bg-[#EEF3F8] text-[#0A234F]"
      style={{
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <header
        className="sticky top-0 z-40 bg-[#0A234F] text-white shadow-[0_5px_22px_rgba(10,35,79,0.18)]"
        style={{ paddingTop: 'calc(0.65rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-3 px-[var(--mob-side,16px)] pb-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Back to profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Loadify Market</p>
            <h1 className="m-0 mt-0.5 text-[23px] font-black tracking-[-0.03em] text-white">Activity</h1>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">Orders, messages and account updates</p>
          </div>
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0A234F]">
            <Bell className="h-5 w-5" aria-hidden="true" />
            {items.some((item) => !item.isRead) ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-[#0A234F] bg-[#F5A300] px-1 text-[9px] font-black text-[#0A234F]" style={{ height: 18 }}>
                {Math.min(items.filter((item) => !item.isRead).length, 9)}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[118px] animate-pulse rounded-[18px] border border-[#0A234F]/[0.06] bg-white/80" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-14 text-center shadow-[0_8px_24px_rgba(10,35,79,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF3F8] text-[#0A234F]">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mb-0 mt-4 text-[15px] font-extrabold text-[#0A234F]">No activity yet</p>
            <p className="mx-auto mb-0 mt-1 max-w-[250px] text-[12px] leading-relaxed text-[#667085]">
              Orders, messages, offers and account updates will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <article
                key={item.id}
                className={`overflow-hidden rounded-[18px] border bg-white shadow-[0_7px_20px_rgba(10,35,79,0.05)] ${item.isRead ? 'border-[#0A234F]/[0.07]' : 'border-[#F5A300]/45'}`}
              >
                <div className="flex items-stretch">
                  <button
                    type="button"
                    onClick={() => void handleTap(item)}
                    disabled={openingNotificationId === item.id}
                    aria-label={`Open notification: ${item.title}`}
                    className="flex min-w-0 flex-1 items-start gap-3 border-0 bg-transparent p-4 text-left"
                    style={{ cursor: openingNotificationId === item.id ? 'wait' : (item.link ? 'pointer' : 'default') }}
                  >
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
                      <ActivityIcon type={item.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.13em] text-[#C98200]">
                          {formatActivityTypeLabel(item.type)}
                        </span>
                        {!item.isRead ? (
                          <span className="rounded-full bg-[#FFF4D6] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-[#9A6500]">New</span>
                        ) : null}
                      </span>
                      <span className="block text-[14px] font-extrabold leading-[1.3] text-[#0A234F]">{item.title}</span>
                      {item.message ? (
                        <span className="mt-1 block text-[12px] leading-[1.45] text-[#667085]" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {item.message}
                        </span>
                      ) : null}
                      <span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-[#98A2B3]">
                        {formatDate(item.createdAt)}
                        {item.link ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      </span>
                    </span>
                  </button>

                  <div className="flex w-[48px] shrink-0 flex-col items-center justify-center gap-2 border-l border-[#0A234F]/[0.06] bg-[#F9FBFD] py-3">
                    <button
                      type="button"
                      aria-label="Archive notification"
                      disabled={archivingId === item.id}
                      onClick={() => void archiveNotification(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0A234F]/[0.08] bg-white text-[#667085] disabled:opacity-40"
                    >
                      <Archive className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete notification"
                      disabled={deletingId === item.id}
                      onClick={() => void deleteNotification(item.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[#0A234F]/[0.08] bg-white text-[#667085] disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
