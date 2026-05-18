import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useUnreadNotificationsCount(userId?: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const loadCount = async () => {
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('userId', userId)
        .eq('isRead', false)
        .not('isArchived', 'is', true);

      if (!cancelled) {
        setCount(unreadCount ?? 0);
      }
    };

    void loadCount();

    const channel = supabase
      .channel(`notifications-unread-count:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${userId}`,
        },
        () => {
          void loadCount();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return userId ? count : 0;
}
