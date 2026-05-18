/**
 * MobileInboxPage — /inbox
 *
 * Standalone full-screen conversation list for mobile users.
 * Accessible from MobileBottomNav "Messages" tab.
 *
 * Tabs: Inbox | Unread | Sent | Archive
 * Search bar filters by participant name or product title.
 * Clicking a conversation navigates to /inbox/:conversationId.
 * Unauthenticated users are redirected to /login.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Archive, MessageSquare, User, Search, SquarePen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import { toast } from "@/hooks/use-toast";
import MobileBottomNav from "@/components/MobileBottomNav";
import type { ConversationParticipant, InboxConversation } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  subject: string | null;
  lastMessageAt: string;
  isArchived: boolean;
  user1Id: string;
  user2Id: string;
  productId: string | null;
}

type Conversation = InboxConversation & ConversationRow;

type Tab = "all" | "unread" | "buyers" | "sellers";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "buyers", label: "Buyers" },
  { id: "sellers", label: "Sellers" },
];

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fallback name shown when a participant has not set a display name. */
const DEFAULT_DISPLAY_NAME = "Loadify User";

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

function participantName(p: ConversationParticipant) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || DEFAULT_DISPLAY_NAME;
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
    } catch {
      // ignore invalid offer JSON; fall back to raw preview
    }
  }
  return raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileInboxPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [archivingConversationId, setArchivingConversationId] = useState<string | null>(null);
  // Retry counter and one-shot post-hydration re-fetch gate
  const hydrationRetryRef = useRef(0);
  const postHydrationRefetchFired = useRef(false);
  // Show debug state panel when ?debug=1 is in the URL (or in dev mode)
  const showDebug = new URLSearchParams(location.search).get("debug") === "1" || import.meta.env.DEV;

  // Auth gate — show prompt modal instead of hard redirect to /login
  useEffect(() => {
    if (!isLoading && !user) {
      promptAuth('message');
    }
  }, [user, isLoading, promptAuth]);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    // Force-verify auth session before RLS-protected queries.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.info("[MobileInboxPage] session check", {
      userId: user.id,
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionMatchesStore: session?.user?.id === user.id,
      expiresAt: session?.expires_at ?? null,
      sessionError: sessionError?.message ?? null,
      retryAttempt: hydrationRetryRef.current,
    });
    if (!session?.user) {
      console.warn("[MobileInboxPage] No valid session — conversations query skipped", {
        userId: user.id,
        sessionError: sessionError?.message ?? null,
      });
      setLoading(false);
      return;
    }
    try {
      const { data: rows, error } = await supabase
        .from("conversations")
        .select("id, subject, lastMessageAt, isArchived, user1Id, user2Id, productId")
        .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
        .not("isArchived", "is", true)
        .order("lastMessageAt", { ascending: false })
        .limit(100);

      if (error) throw error;
      const convRows = (rows ?? []) as ConversationRow[];
      console.info("[MobileInboxPage] conversations loaded", {
        userId: user.id,
        count: convRows.length,
        sessionUserId: session?.user?.id,
      });
      if (convRows.length === 0) {
        console.warn("[MobileInboxPage] RLS returned empty conversations list", {
          userId: user.id,
          sessionUserId: session?.user?.id,
          supabasePayload: rows,
        });
      }

      // Resolve other participants
      const otherIds = [...new Set(convRows.map((r) => r.user1Id === user.id ? r.user2Id : r.user1Id))];
      const userMap = new Map<string, ConversationParticipant>();
      if (otherIds.length > 0) {
        const { data: users } = await supabase
          .from("user_display_names")
          .select("id, firstName, lastName")
          .in("id", otherIds);
        (users ?? []).forEach((u: ConversationParticipant) => userMap.set(u.id, u));
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

      // Last message per conversation (with senderId for "Sent" tab)
      const convIds = convRows.map((r) => r.id);
      const lastMsgMap = new Map<string, string>();
      const lastMsgSenderMap = new Map<string, string>();
      if (convIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("conversationId, message, senderId")
          .in("conversationId", convIds)
          .order("createdAt", { ascending: false })
          .limit(Math.max(convIds.length * 5, 20));
        (lastMsgs ?? []).forEach((m: { conversationId: string; message: string; senderId: string }) => {
          if (!lastMsgMap.has(m.conversationId)) {
            lastMsgMap.set(m.conversationId, m.message);
            lastMsgSenderMap.set(m.conversationId, m.senderId);
          }
        });
      }

      // Product images for conversation thumbnails
      const productIds = [...new Set(convRows.map((r) => r.productId).filter((x): x is string => x != null))];
      const productImageMap = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, images")
          .in("id", productIds);
        (products ?? []).forEach((p: { id: string; images?: string[] | null }) => {
          const firstImg = (p.images ?? [])[0];
          if (firstImg) productImageMap.set(p.id, firstImg);
        });
      }

      const enriched: Conversation[] = convRows.map((r) => {
        const otherId = r.user1Id === user.id ? r.user2Id : r.user1Id;
        return {
          ...r,
          other: userMap.get(otherId) ?? { id: otherId, firstName: null, lastName: null },
          unreadCount: unreadMap.get(r.id) ?? 0,
          lastMessagePreview: lastMsgMap.get(r.id) ?? null,
          lastMessageSenderId: lastMsgSenderMap.get(r.id) ?? null,
          productTitle: r.subject ?? null,
          productImage: r.productId ? (productImageMap.get(r.productId) ?? null) : null,
        };
      });

      setConversations(enriched);
    } catch {
      toast({ title: "Failed to load conversations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch conversations
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // Realtime refresh for inbox list (new messages + read-state changes + new conversations)
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`mobile-inbox-live:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiverId=eq.${user.id}` },
        () => { void loadConversations(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `senderId=eq.${user.id}` },
        () => { void loadConversations(); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `receiverId=eq.${user.id}` },
        () => { void loadConversations(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `user1Id=eq.${user.id}` },
        () => { void loadConversations(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `user2Id=eq.${user.id}` },
        () => { void loadConversations(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, loadConversations]);

  // ── Timeout protection — prevent infinite loading spinner ───────────────────
  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.warn("[MobileInboxPage] Loading timeout — forcing off after 10s", {
        userId: user?.id,
      });
      setLoading(false);
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [loading, user?.id]);

  // ── Post-auth-hydration delayed re-fetch (catches auth race conditions) ──────
  useEffect(() => {
    if (!user?.id || postHydrationRefetchFired.current) return;
    postHydrationRefetchFired.current = true;
    const timer = setTimeout(() => {
      console.info("[MobileInboxPage] Post-auth-hydration delayed re-fetch", {
        userId: user.id,
        currentCount: conversations.length,
      });
      void loadConversations();
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Filter by tab
  const tabFiltered = conversations.filter((c) => {
    if (activeTab === "all") return !c.isArchived;
    if (activeTab === "unread") return !c.isArchived && c.unreadCount > 0;
    if (activeTab === "buyers") return !c.isArchived && c.lastMessageSenderId !== user?.id;
    if (activeTab === "sellers") return !c.isArchived && c.lastMessageSenderId === user?.id;
    return true;
  });

  // Filter by search query
  const filtered = searchQuery.trim()
    ? tabFiltered.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          participantName(c.other).toLowerCase().includes(q) ||
          (c.productTitle ?? "").toLowerCase().includes(q)
        );
      })
    : tabFiltered;

  const inboxUnread = conversations.filter((c) => !c.isArchived && c.unreadCount > 0).length;

  const archiveConversation = async (conversationId: string) => {
    if (!user?.id) return;
    setArchivingConversationId(conversationId);
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ isArchived: true })
        .eq("id", conversationId)
        .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`);
      if (error) throw error;
      setConversations((prev) => prev.filter((conversation) => conversation.id !== conversationId));
    } catch {
      toast({ title: "Failed to archive conversation", variant: "destructive" });
    } finally {
      setArchivingConversationId((prev) => (prev === conversationId ? null : prev));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ── */}
      <div
        className="shrink-0 sticky top-0 z-40 bg-background/[0.97]"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Title row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
            paddingBottom: "10px",
          }}
        >
          <h1 className="text-2xl font-extrabold text-foreground">Messages</h1>
          <button
            className="p-2 rounded-xl active:bg-white/10 transition-colors bg-white/[0.05]"
            aria-label="New message"
            onClick={() => navigate("/catalog")}
          >
            <SquarePen className="text-foreground/75" style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "0 16px 10px" }}>
          <div
            className="bg-white/[0.06] flex items-center gap-2"
            style={{
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "12px",
              padding: "10px 14px",
            }}
          >
            <Search className="text-foreground/55" style={{ width: "16px", height: "16px", flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-foreground text-sm placeholder:text-white/35"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
          className="[-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = tab.id === "unread" && inboxUnread > 0 ? inboxUnread : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-[13px] whitespace-nowrap bg-transparent border-none cursor-pointer shrink-0 flex items-center gap-1.5 transition-colors duration-200 ${isActive ? 'text-primary font-bold border-b-2 border-primary' : 'text-foreground/65 font-normal border-b-2 border-transparent'}`}
                style={{
                  padding: "10px 18px",
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {tab.label}
                {badge > 0 && (
                  <span
                    className="bg-primary text-surface text-[10px] font-extrabold flex items-center justify-center"
                    style={{
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "9px",
                      padding: "0 4px",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Debug state panel — activate with ?debug=1 in the URL ── */}
      {showDebug && (
        <div
          style={{ padding: "6px 12px", background: "rgba(234,179,8,0.08)", borderBottom: "1px solid rgba(234,179,8,0.18)" }}
          className="text-[10px] font-mono text-yellow-400"
        >
          uid: {user?.id ?? "—"} | convs: {conversations.length} | loading: {String(loading)}
        </div>
      )}

      {/* ── List ── */}
      <div style={{ flex: 1, paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white/[0.05]" style={{ height: "72px", borderRadius: "12px" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageSquare className="h-7 w-7 text-white/30" />
            </div>
            <p className="text-base font-semibold text-white mb-1">
              {searchQuery ? "No results found" : "No conversations yet"}
            </p>
            <p className="text-sm text-white/75 mb-6">
              {searchQuery ? "Try a different search term." : "Contact a seller from a product page to start chatting."}
            </p>
            {!searchQuery && (
              <Link
                to="/catalog"
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-primary text-black"
              >
                Browse listings
              </Link>
            )}
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filtered.map((conv) => (
              <li key={conv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingRight: "10px" }}>
                  <button
                    onClick={() => navigate(`/inbox/${conv.id}`)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "14px 16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    className="active:bg-white/5 transition-colors"
                  >
                    {/* Avatar with online indicator */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div
                        className="bg-white/[0.08] flex items-center justify-center"
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "50%",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <User className="text-foreground/60" style={{ width: "22px", height: "22px" }} />
                      </div>
                      {conv.unreadCount > 0 && (
                        <span
                          aria-hidden="true"
                          className="bg-success border-background"
                          style={{
                            position: "absolute",
                            bottom: "1px",
                            right: "1px",
                            width: "11px",
                            height: "11px",
                            borderRadius: "50%",
                            borderWidth: "2px",
                            borderStyle: "solid",
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "2px" }}>
                        <span
                          className={`text-sm overflow-hidden text-ellipsis whitespace-nowrap ${conv.unreadCount > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'}`}
                        >
                          {participantName(conv.other)}
                        </span>
                        <span className="text-[11px] text-foreground/65 shrink-0">
                          {formatDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      {conv.lastMessagePreview && (
                        <p
                          className={`text-xs overflow-hidden text-ellipsis whitespace-nowrap ${conv.unreadCount > 0 ? 'text-foreground/80' : 'text-foreground/60'}`}
                        >
                          {previewText(conv.lastMessagePreview)}
                        </p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {conv.unreadCount > 0 && (
                      <span
                        className="bg-primary text-surface text-[11px] font-extrabold flex items-center justify-center shrink-0"
                        style={{
                          minWidth: "22px",
                          height: "22px",
                          borderRadius: "11px",
                          padding: "0 5px",
                        }}
                      >
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}

                    {/* Product thumbnail */}
                    {conv.productImage && (
                      <div
                        className="bg-white/[0.06] shrink-0 overflow-hidden"
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        <img
                          src={conv.productImage}
                          alt={conv.productTitle ?? "Product"}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="Archive conversation"
                    disabled={archivingConversationId === conv.id}
                    onClick={() => {
                      void archiveConversation(conv.id);
                    }}
                    className="rounded-md border border-white/10 bg-white/[0.04] text-foreground/75 hover:text-foreground h-8 w-8 inline-flex items-center justify-center shrink-0"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
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
