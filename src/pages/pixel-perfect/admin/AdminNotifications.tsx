import { useEffect, useState } from "react";
import { Archive, Bell, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const typeColor: Record<string, string> = {
  order:            "bg-blue-500/10 text-blue-700",
  seller_approved:  "bg-success/10 text-success",
  seller_rejected:  "bg-danger/100/10 text-danger",
  product_approved: "bg-success/10 text-success",
  product_rejected: "bg-danger/100/10 text-danger",
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

const AdminNotifications = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
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
      setNotifications((data as Notification[]) ?? []);
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

  const archiveNotification = async (id: string) => {
    if (!user?.id) return;
    setArchivingId(id);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ isArchived: true, archivedAt: new Date().toISOString() })
        .eq("id", id);
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
        .eq("id", id);
      if (error) throw error;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    } finally {
      setDeletingId((prev) => (prev === id ? null : prev));
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
            Your personal admin notification inbox.{" "}
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up."}
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
            System alerts and updates will appear here.
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
                      {n.type.replace("_", " ")}
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
                <div className="flex items-center gap-1 shrink-0">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={archivingId === n.id}
                    onClick={() => {
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
                    onClick={() => {
                      void deleteNotification(n.id);
                    }}
                    aria-label="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
