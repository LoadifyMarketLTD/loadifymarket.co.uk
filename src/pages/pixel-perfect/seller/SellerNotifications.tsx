import { useEffect, useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
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
  offer_received:   "bg-violet-500/10 text-violet-700",
  listing_published: "bg-success/10 text-success",
  listing_sold:      "bg-success/10 text-success",
  share_reminder:   "bg-primary/10 text-primary",
  rfq:              "bg-violet-500/10 text-violet-700",
  review:           "bg-rose-500/10 text-rose-700",
  dispute:          "bg-danger/100/10 text-danger",
  system:           "bg-muted text-muted-foreground",
  general:          "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const SellerNotifications = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, message, link, isRead, createdAt")
        .eq("userId", user.id)
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

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ isRead: true, readAt: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
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
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 transition-colors ${
                n.isRead
                  ? "border-border bg-card"
                  : "border-primary/20 bg-primary/5"
              }`}
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
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground mt-1">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(n.createdAt)}
                  </p>
                </div>
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs shrink-0"
                    onClick={() => markAsRead(n.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerNotifications;
