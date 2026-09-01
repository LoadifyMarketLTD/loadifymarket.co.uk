import { useEffect, useMemo, useState } from "react";
import { Archive, Bell, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { formatNotificationTypeLabel, normalizeNotification } from "@/lib/notificationUtils";
import type { AppNotification } from "@/types";

const typeColor: Record<string, string> = {
  order:            "bg-blue-500/10 text-blue-700",
  payment:          "bg-success/10 text-success",
  shipment:         "bg-indigo-500/10 text-indigo-700",
  product_question: "bg-primary/10 text-primary",
  message:          "bg-primary/10 text-primary",
  listing_published: "bg-success/10 text-success",
  listing_sold:      "bg-success/10 text-success",
  share_reminder:   "bg-primary/10 text-primary",
  rfq:              "bg-violet-500/10 text-violet-700",
  review:           "bg-rose-500/10 text-rose-700",
  dispute:          "bg-danger/100/10 text-danger",
  system:           "bg-muted text-muted-foreground",
  general:          "bg-muted text-muted-foreground",
};

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

function extractConversationId(link?: string | null) {
  if (!link) return null;
  const match = link.match(/\/inbox\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function buildSellerMessageRoute(link?: string | null) {
  if (!link) return null;
  const conversationId = extractConversationId(link);
  if (!conversationId) return link;
  const query = new URLSearchParams({ conversationId });
  return `/seller/messages?${query.toString()}`;
}

interface NotificationGroup {
  key: string;
  latest: AppNotification;
  items: AppNotification[];
  count: number;
  unreadCount: number;
}

const SellerNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [openingGroupKey, setOpeningGroupKey] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, link, isRead, isArchived, createdAt")
        .eq("userId", user.id)
        .not("isArchived", "is", true)
        .order("createdAt", { ascending: false })
        .limit(50);
      setNotifications(((data as AppNotification[]) ?? []).map(normalizeNotification));
    } catch {
      // Silently fail — empty list shown instead.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`seller-notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `userId=eq.${user.id}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const markAsRead = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ isRead: true, readAt: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
      );
    } catch {
      toast({ title: "Failed to mark notification as read", variant: "destructive" });
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;
    setMarkingAll(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ isRead: true, readAt: new Date().toISOString() })
        .eq("userId", user.id)
        .eq("isRead", false);
      if (error) throw error;
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      toast({ title: "Failed to mark all as read", variant: "destructive" });
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groupedNotifications = useMemo<NotificationGroup[]>(() => {
    const groups = new Map<string, AppNotification[]>();

    notifications.forEach((n) => {
      const conversationId = extractConversationId(n.link);
      const key = conversationId
        ? `conversation:${conversationId}:${n.type}`
        : `text:${n.type}:${n.title.trim().toLowerCase()}:${n.message.trim().toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.push(n);
      } else {
        groups.set(key, [n]);
      }
    });

    return Array.from(groups.entries())
      .map(([key, items]) => {
        const sorted = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        return {
          key,
          latest: sorted[0],
          items: sorted,
          count: sorted.length,
          unreadCount: sorted.filter((i) => !i.isRead).length,
        };
      })
      .sort((a, b) => new Date(b.latest.createdAt).getTime() - new Date(a.latest.createdAt).getTime());
  }, [notifications]);

  const handleOpen = async (group: NotificationGroup) => {
    if (openingGroupKey === group.key) return;
    setOpeningGroupKey(group.key);
    const target = buildSellerMessageRoute(group.latest.link);
    try {
      await markAsRead(group.items.map((item) => item.id));
      if (target) {
        navigate(target);
      }
    } finally {
      setOpeningGroupKey((prev) => (prev === group.key ? null : prev));
    }
  };

  const archiveNotification = async (id: string) => {
    if (!user?.id) return;
    setArchivingId(id);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ isArchived: true, archivedAt: new Date().toISOString() })
        .eq("id", id)
        .eq("userId", user.id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast({ title: "Failed to archive notification", variant: "destructive" });
    } finally {
      setArchivingId((prev) => (prev === id ? null : prev));
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user?.id) return;
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("userId", user.id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    } finally {
      setDeletingId((prev) => (prev === id ? null : prev));
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={markingAll}
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            {markingAll ? "Marking…" : "Mark all as read"}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">No notifications yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Order updates, product questions, and alerts will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groupedNotifications.map((group) => {
            const n = group.latest;
            const isRead = group.unreadCount === 0;
            const groupedTitle =
              group.count === 1
                ? n.title
                : n.type === "message"
                  ? group.unreadCount > 0
                    ? `${group.unreadCount} new message${group.unreadCount === 1 ? "" : "s"} in this conversation`
                    : `${group.count} messages in this conversation`
                  : `${group.count} similar notifications`;

            return (
            <div
              key={group.key}
              onClick={() => {
                void handleOpen(group);
              }}
              role="button"
              tabIndex={0}
              aria-disabled={openingGroupKey === group.key}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleOpen(group);
                }
              }}
              className={`rounded-lg border p-4 transition-colors ${
                isRead
                  ? "border-border bg-card"
                  : "border-primary/20 bg-primary/5"
              } w-full text-left ${openingGroupKey === group.key ? "cursor-wait opacity-85" : "cursor-pointer"}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${typeColor[n.type] ?? typeColor.general}`}
                    >
                      {formatNotificationTypeLabel(n.type)}
                    </Badge>
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                    {group.count > 1 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {group.count} items
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1">{groupedTitle}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {group.count > 1 ? `Latest: ${n.message}` : n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        void markAsRead(group.items.map((item) => item.id));
                      }}
                    >
                      Mark read
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={archivingId === n.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void archiveNotification(n.id);
                    }}
                    aria-label="Archive notification"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={deletingId === n.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteNotification(n.id);
                    }}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
};

export default SellerNotifications;