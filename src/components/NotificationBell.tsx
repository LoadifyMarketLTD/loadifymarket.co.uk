import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface NotificationBellProps {
  /** Route to navigate to when bell is clicked (e.g. "/dashboard/notifications") */
  href: string;
}

/**
 * Notification bell with a live unread-count badge.
 *
 * Fetches the count of unread notifications for the current user from the
 * `notifications` table once on mount.  The badge is hidden when the count
 * is zero so users are never misled by a hardcoded dot.
 */
const NotificationBell = ({ href }: NotificationBellProps) => {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("userId", user.id)
          .eq("isRead", false);
        if (!cancelled) setUnreadCount(count ?? 0);
      } catch {
        // Non-critical — badge simply won't show on error.
      }
    };

    fetchCount();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to={href} aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}>
        <Bell className="h-4 w-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-destructive rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
};

export default NotificationBell;
