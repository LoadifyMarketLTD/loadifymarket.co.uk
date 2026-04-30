/**
 * MobileInboxPage — /inbox
 *
 * Standalone full-screen conversation list for mobile users.
 * Accessible from MobileBottomNav "Inbox" tab.
 *
 * Clicking a conversation navigates to /inbox/:conversationId.
 * Unauthenticated users are redirected to /login.
 */

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MessageSquare, User, ChevronRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface ConversationRow {
  id: string;
  subject: string | null;
  lastMessageAt: string;
  isArchived: boolean;
  user1Id: string;
  user2Id: string;
}

interface Conversation extends ConversationRow {
  other: Participant;
  unreadCount: number;
  lastMessagePreview: string | null;
  productTitle: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function participantName(p: Participant) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || p.email;
}

/** Decode offer messages to a human-readable preview */
function previewText(raw: string | null): string {
  if (!raw) return "";
  if (raw.startsWith('{"_t":"offer"')) {
    try {
      const parsed = JSON.parse(raw) as { amount_pence?: number };
      if (typeof parsed.amount_pence === "number") {
        return `💰 Offer: £${(parsed.amount_pence / 100).toFixed(2)}`;
      }
    } catch {}
  }
  return raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileInboxPage() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true, state: { from: "/inbox" } });
    }
  }, [user, isLoading, navigate]);

  // Fetch conversations
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from("conversations")
          .select("id, subject, lastMessageAt, isArchived, user1Id, user2Id")
          .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
          .eq("isArchived", false)
          .order("lastMessageAt", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (cancelled) return;

        const convRows = (rows ?? []) as ConversationRow[];

        // Resolve other participants
        const otherIds = [...new Set(convRows.map((r) => r.user1Id === user.id ? r.user2Id : r.user1Id))];
        const userMap = new Map<string, Participant>();
        if (otherIds.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("id, firstName, lastName, email")
            .in("id", otherIds);
          (users ?? []).forEach((u: Participant) => userMap.set(u.id, u));
        }

        // Unread counts
        const { data: unreadRows } = await supabase
          .from("messages")
          .select("conversationId")
          .eq("receiverId", user.id)
          .eq("isRead", false);
        const unreadMap = new Map<string, number>();
        (unreadRows ?? []).forEach((r: { conversationId: string }) => {
          unreadMap.set(r.conversationId, (unreadMap.get(r.conversationId) ?? 0) + 1);
        });

        // Last message per conversation
        const convIds = convRows.map((r) => r.id);
        const lastMsgMap = new Map<string, string>();
        if (convIds.length > 0) {
          const { data: lastMsgs } = await supabase
            .from("messages")
            .select("conversationId, message")
            .in("conversationId", convIds)
            .order("createdAt", { ascending: false });
          // Keep only the most recent message per conversation (rows are DESC)
          (lastMsgs ?? []).forEach((m: { conversationId: string; message: string }) => {
            if (!lastMsgMap.has(m.conversationId)) {
              lastMsgMap.set(m.conversationId, m.message);
            }
          });
        }

        const enriched: Conversation[] = convRows.map((r) => {
          const otherId = r.user1Id === user.id ? r.user2Id : r.user1Id;
          return {
            ...r,
            other: userMap.get(otherId) ?? { id: otherId, firstName: null, lastName: null, email: "Unknown" },
            unreadCount: unreadMap.get(r.id) ?? 0,
            lastMessagePreview: lastMsgMap.get(r.id) ?? null,
            productTitle: r.subject ?? null,
          };
        });

        if (!cancelled) setConversations(enriched);
      } catch {
        toast({ title: "Failed to load conversations", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FBBF24]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Sub-header */}
      <div
        className="sticky z-40 flex items-center gap-3 px-4 py-3 border-b border-white/10"
        style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))", background: "rgba(11,15,26,0.97)" }}
      >
        <Link to="/" className="text-white/60 hover:text-white transition-colors p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="flex-1 text-base font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#FBBF24]" />
          Inbox
          {totalUnread > 0 && (
            <span className="ml-1 text-[11px] bg-[#FBBF24] text-[#020617] rounded-full px-2 py-0.5 font-bold">
              {totalUnread}
            </span>
          )}
        </h1>
      </div>

      {/* List */}
      <div className="flex-1 pb-[80px]">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-white/30" />
            </div>
            <p className="text-base font-semibold text-white mb-1">No conversations yet</p>
            <p className="text-sm text-white/40 mb-6">
              Contact a seller from a product page to start chatting.
            </p>
            <Link
              to="/catalog"
              className="px-5 py-2.5 rounded-full bg-[#FBBF24] text-[#020617] text-sm font-semibold"
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => navigate(`/inbox/${conv.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-white/5 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-white/40" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-sm font-semibold truncate ${conv.unreadCount > 0 ? "text-white" : "text-white/80"}`}>
                        {participantName(conv.other)}
                      </span>
                      <span className="text-[11px] text-white/40 shrink-0">
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    {conv.productTitle && (
                      <p className="text-xs text-[#FBBF24]/70 truncate mb-0.5">{conv.productTitle}</p>
                    )}
                    {conv.lastMessagePreview && (
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-white/70" : "text-white/40"}`}>
                        {previewText(conv.lastMessagePreview)}
                      </p>
                    )}
                  </div>

                  {/* Unread badge or chevron */}
                  {conv.unreadCount > 0 ? (
                    <span className="shrink-0 min-w-[20px] h-5 rounded-full bg-[#FBBF24] text-[#020617] text-[10px] font-bold flex items-center justify-center px-1">
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-white/20 shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
