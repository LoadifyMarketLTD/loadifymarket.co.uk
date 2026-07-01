/**
 * DesktopConversationView
 *
 * Shared two-panel desktop messages view used by both BuyerMessages and
 * SellerMessages for conversation lists, threads, and realtime updates.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Archive, MessageSquare, Send, User } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { parseConversationRouteSearch } from "@/lib/routeSearch";
import type { ConversationParticipant, InboxConversation } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConversationRow {
  id: string;
  subject: string | null;
  lastMessageAt: string;
  isArchived: boolean | null;
  user1Id: string;
  user2Id: string;
  productId: string | null;
}

type Conversation = InboxConversation & ConversationRow;

interface Message {
  id: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}


// ── Constants ─────────────────────────────────────────────────────────────────

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

/** Decode archived/system message JSON to a human-readable inbox preview. */
function previewText(raw: string | null): string {
  if (!raw) return "";
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed._t === "offer") {
        return "💬 Offer (archived)";
      }
      if (parsed._t === "system" && parsed.event === "listing_unavailable") {
        return "🔒 Listing unavailable";
      }
    } catch {
      /* ignore */
    }
  }
  return raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
}

/** Parse a message string that may be JSON-encoded archived/system event. */
function parseMessage(raw: unknown): {
  type: "text" | "system";
  text?: string;
  event?: string;
} {
  const rawText = typeof raw === "string" ? raw : "";
  if (rawText.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      if (parsed._t === "offer") {
        return { type: "text", text: "Offer (archived)" };
      }
      if (parsed._t === "system") {
        return {
          type: "system",
          event: typeof parsed.event === "string" ? parsed.event : undefined,
        };
      }
    } catch {
      /* ignore invalid JSON; treat as plain text */
    }
  }
  return { type: "text", text: rawText };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SystemEventCard({ event }: { event?: string }) {
  if (event !== "listing_unavailable") return null;

  return (
    <div className="flex justify-center">
      <div className="max-w-[75%] rounded-2xl px-4 py-2 bg-muted border border-border text-center">
        <span className="mr-1">🔒</span>
        <span className="text-xs text-muted-foreground">
          This listing has been purchased. It is no longer available.
        </span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DesktopConversationView() {
  const { user } = useAuthStore();
  const location = useLocation();
  const { conversationId: routeConversationId } = parseConversationRouteSearch(location.search);

  // ── Conversation list state ──────────────────────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [archivingConversationId, setArchivingConversationId] = useState<string | null>(null);

  // ── Thread state ─────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Track which route conversation ID has already been auto-selected so that
  // user-initiated conversation clicks are not silently overridden by the effect.
  const lastAutoSelectedRouteRef = useRef<string | null>(null);
  // Retry counter for deep-link hydration recovery (max 2 auto-retries)
  const hydrationRetryRef = useRef(0);
  // Gate for the one-shot post-auth-hydration delayed re-fetch
  const postHydrationRefetchFired = useRef(false);
  // Show debug state panel when ?debug=1 is in the URL (or in dev mode)
  const showDebug = new URLSearchParams(location.search).get("debug") === "1" || import.meta.env.DEV;
  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoadingConvs(true);
    // Force-verify the auth session before making RLS-protected queries.
    // This prevents silent empty results caused by expired or not-yet-restored tokens.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.info("[InboxHydration] session check", {
      userId: user.id,
      hasSession: !!session,
      sessionUserId: session?.user?.id,
      sessionMatchesStore: session?.user?.id === user.id,
      expiresAt: session?.expires_at ?? null,
      sessionError: sessionError?.message ?? null,
      retryAttempt: hydrationRetryRef.current,
      routeConversationId,
    });
    if (!session?.user) {
      console.warn("[InboxHydration] No valid session — conversations query skipped", {
        userId: user.id,
        sessionError: sessionError?.message ?? null,
      });
      setLoadingConvs(false);
      return;
    }
    console.info("[DesktopConversationView] loadConversations:start", {
      userId: user.id,
      routeConversationId,
      rawSearch: location.search,
    });
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, subject, lastMessageAt, isArchived, user1Id, user2Id, productId")
        .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
        .not("isArchived", "is", true)
        .order("lastMessageAt", { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data ?? []) as ConversationRow[];
      const participantMatches = rows.filter((r) => r.user1Id === user.id || r.user2Id === user.id).length;
      console.info("[DesktopConversationView] loadConversations:result", {
        userId: user.id,
        count: rows.length,
        participantMatches,
        ids: rows.map((r) => r.id),
      });
      if (rows.length === 0) {
        console.warn("[InboxHydration] RLS returned empty conversations list", {
          userId: user.id,
          sessionUserId: session?.user?.id,
          routeConversationId,
          supabasePayload: data,
        });
      }

      // Resolve other participants
      const otherIds = [...new Set(rows.map((r) => r.user1Id === user.id ? r.user2Id : r.user1Id))];
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

      // Last message preview per conversation
      const convIds = rows.map((r) => r.id);
      const lastMsgMap = new Map<string, string>();
      if (convIds.length > 0) {
        const { data: lastMsgs } = await supabase
          .from("messages")
          .select("conversationId, message")
          .in("conversationId", convIds)
          .order("createdAt", { ascending: false })
          .limit(Math.max(convIds.length * 5, 20));
        (lastMsgs ?? []).forEach((m: { conversationId: string; message: string }) => {
          if (!lastMsgMap.has(m.conversationId)) lastMsgMap.set(m.conversationId, m.message);
        });
      }

      // Product images for conversation thumbnails
      const productIds = [...new Set(rows.map((r) => r.productId).filter((x): x is string => x != null))];
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

      const enriched: Conversation[] = rows.map((r) => {
        const otherId = r.user1Id === user.id ? r.user2Id : r.user1Id;
        return {
          ...r,
          isArchived: r.isArchived === true,
          other: userMap.get(otherId) ?? { id: otherId, firstName: null, lastName: null },
          unreadCount: unreadMap.get(r.id) ?? 0,
          lastMessagePreview: previewText(lastMsgMap.get(r.id) ?? null),
          productImage: r.productId ? (productImageMap.get(r.productId) ?? null) : null,
        };
      });

      setConversations(enriched);
    } catch (error) {
      console.error("[DesktopConversationView] loadConversations:error", {
        userId: user.id,
        routeConversationId,
        error,
      });
      toast({ title: "Failed to load conversations", variant: "destructive" });
    } finally {
      setLoadingConvs(false);
    }
  }, [user?.id, routeConversationId, location.search]);

  // ── Fetch conversation list ──────────────────────────────────────────────────
  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  // ── Fallback: fetch a single conversation by ID when it is not in the list ──
  // This covers the edge case where a notification deep-link targets a conversation
  // that is not yet visible in the paginated list (e.g., first message ever sent).
  useEffect(() => {
    if (!routeConversationId || !user?.id) return;
    if (conversations.some((c) => c.id === routeConversationId)) return;
    if (loadingConvs) return;

    const fetchSingle = async () => {
      try {
        console.info("[DesktopConversationView] fetchSingle:start", {
          userId: user.id,
          routeConversationId,
          listCount: conversations.length,
        });
        const { data } = await supabase
          .from("conversations")
          .select("id, subject, lastMessageAt, isArchived, user1Id, user2Id, productId")
          .eq("id", routeConversationId)
          .maybeSingle<ConversationRow>();

        if (!data) {
          console.warn("[DesktopConversationView] fetchSingle:not_found", {
            userId: user.id,
            routeConversationId,
          });
          return;
        }
        if (data.isArchived === true) {
          console.warn("[DesktopConversationView] fetchSingle:archived", {
            userId: user.id,
            routeConversationId,
          });
          return;
        }
        console.info("[DesktopConversationView] fetchSingle:found", {
          userId: user.id,
          routeConversationId,
          conversationId: data.id,
          user1Id: data.user1Id,
          user2Id: data.user2Id,
        });

        const otherId = data.user1Id === user.id ? data.user2Id : data.user1Id;
        const { data: users } = await supabase
          .from("user_display_names")
          .select("id, firstName, lastName")
          .eq("id", otherId)
          .limit(1);
        const other: ConversationParticipant = (users ?? [])[0] ?? { id: otherId, firstName: null, lastName: null };

        let productImage: string | null = null;
        if (data.productId) {
          const { data: prod } = await supabase
            .from("products")
            .select("images")
            .eq("id", data.productId)
            .maybeSingle<{ images?: string[] | null }>();
          productImage = (prod?.images ?? [])[0] ?? null;
        }

        const conv: Conversation = {
          ...data,
          isArchived: false,
          other,
          unreadCount: 0,
          lastMessagePreview: null,
          productImage,
        };
        setConversations((prev) => {
          if (prev.some((c) => c.id === conv.id)) return prev;
          return [conv, ...prev];
        });
      } catch (error) {
        console.error("[DesktopConversationView] fetchSingle:error", {
          userId: user.id,
          routeConversationId,
          error,
        });
        // Non-fatal — the conversation list without this entry is still usable.
      }
    };

    void fetchSingle();
  }, [routeConversationId, user?.id, conversations, loadingConvs]);

  useEffect(() => {
    // Auto-select the conversation specified in the URL — but only once per
    // unique conversationId so that subsequent user-initiated clicks are NOT
    // overridden by this effect re-firing (e.g. when Realtime refreshes the list).
    if (
      routeConversationId &&
      lastAutoSelectedRouteRef.current !== routeConversationId &&
      conversations.some((c) => c.id === routeConversationId)
    ) {
      console.info("[DesktopConversationView] routeSelect:auto", {
        routeConversationId,
      });
      setSelectedId(routeConversationId);
      lastAutoSelectedRouteRef.current = routeConversationId;
      return;
    }
    // Default: when there is no route-specified conversation, pick the first one.
    if (!selectedId && !routeConversationId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [routeConversationId, conversations, selectedId]);

  // ── Realtime refresh for conversation list ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`desktop-inbox-live:${user.id}`)
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
    if (!loadingConvs) return;
    const timeout = setTimeout(() => {
      console.warn("[InboxHydration] Loading timeout — forcing off after 10s", {
        userId: user?.id,
        routeConversationId,
      });
      setLoadingConvs(false);
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [loadingConvs, user?.id, routeConversationId]);

  // ── Post-auth-hydration delayed re-fetch (catches auth race conditions) ──────
  // Fires once, 2 s after the user first becomes available, to handle the edge
  // case where the Supabase session token wasn't ready when loadConversations
  // was first called.
  useEffect(() => {
    if (!user?.id || postHydrationRefetchFired.current) return;
    postHydrationRefetchFired.current = true;
    const timer = setTimeout(() => {
      console.info("[InboxHydration] Post-auth-hydration delayed re-fetch", {
        userId: user.id,
        routeConversationId,
        currentCount: conversations.length,
      });
      void loadConversations();
    }, 2000);
    return () => clearTimeout(timer);
    // loadConversations intentionally omitted — one-shot guard prevents loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ── Deep-link recovery retry ─────────────────────────────────────────────────
  // If the conversation list loads empty while a conversationId deep-link is
  // active, retry up to twice with increasing backoff.  Stops once the target
  // conversation appears or max retries are exhausted.
  useEffect(() => {
    if (!routeConversationId || !user?.id) return;
    if (loadingConvs) return;
    if (conversations.some((c) => c.id === routeConversationId)) return;
    if (hydrationRetryRef.current >= 2) return;

    hydrationRetryRef.current++;
    const attempt = hydrationRetryRef.current;
    const delay = attempt * 1500;
    console.info("[InboxHydration] Deep-link recovery retry scheduled", {
      userId: user.id,
      routeConversationId,
      attempt,
      delayMs: delay,
    });
    const timer = setTimeout(() => {
      console.info("[InboxHydration] Deep-link recovery retry firing", {
        userId: user.id,
        routeConversationId,
        attempt,
      });
      void loadConversations();
    }, delay);
    return () => clearTimeout(timer);
  }, [conversations, loadingConvs, routeConversationId, user?.id, loadConversations]);

  // ── Load thread metadata (otherId, productTitle) ─────────────────────────────
  useEffect(() => {
    if (!selectedId || !user?.id) {
      setOtherId(null);
      setProductTitle(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      const conv = conversations.find((c) => c.id === selectedId);
      if (!conv) return;

      const other = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
      if (!cancelled) setOtherId(other);

      if (conv.productId) {
        const { data: listing } = await supabase
          .from("products")
          .select("title")
          .eq("id", conv.productId)
          .maybeSingle<{ title: string }>();
        if (!cancelled) {
          setProductTitle(listing?.title ?? conv.subject ?? null);
        }
      } else if (!cancelled) {
        setProductTitle(conv.subject ?? null);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedId, user?.id, conversations]);

  // ── Load messages ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingMsgs(true);
      setMessages([]);
      console.info("[DesktopConversationView] loadMessages:start", {
        userId: user.id,
        selectedId,
      });
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, senderId, message, isRead, createdAt")
          .eq("conversationId", selectedId)
          .order("createdAt", { ascending: true })
          .limit(200);

        if (error) throw error;
        if (cancelled) return;
        setMessages((data as Message[]) ?? []);
        console.info("[DesktopConversationView] loadMessages:result", {
          userId: user.id,
          selectedId,
          count: (data as Message[] | null)?.length ?? 0,
        });

        // Mark incoming as read
        await supabase
          .from("messages")
          .update({ isRead: true, readAt: new Date().toISOString() })
          .eq("conversationId", selectedId)
          .eq("receiverId", user.id)
          .eq("isRead", false);

        // Clear unread badge locally
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
        );
      } catch (error) {
        console.error("[DesktopConversationView] loadMessages:error", {
          userId: user.id,
          selectedId,
          error,
        });
        toast({ title: "Failed to load messages", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedId, user?.id]);

  // ── Supabase Realtime: messages ──────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !user?.id) return;

    const channel = supabase
      .channel(`desktop-chat-msgs:${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversationId=eq.${selectedId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.senderId !== user.id) {
            void supabase
              .from("messages")
              .update({ isRead: true, readAt: new Date().toISOString() })
              .eq("id", msg.id);
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedId, user?.id]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !selectedId || !otherId || !user?.id) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const res = await authorizedFetch("/.netlify/functions/send-message", {
        method: "POST",
        body: JSON.stringify({ conversationId: selectedId, receiverId: otherId, message: text }),
      });

      const json = await res.json() as {
        id?: string; senderId?: string; message?: string;
        isRead?: boolean; createdAt?: string; error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (!json.id || !json.senderId || !json.message || !json.createdAt) {
        throw new Error("Unexpected response from server");
      }

      const msg: Message = {
        id:        json.id,
        senderId:  json.senderId,
        message:   json.message,
        isRead:    json.isRead ?? false,
        createdAt: json.createdAt,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    } catch (err) {
      setDraft(text);
      toast({ title: "Failed to send message", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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
      setConversations((prev) => {
        const remaining = prev.filter((conversation) => conversation.id !== conversationId);
        if (selectedId === conversationId) {
          setSelectedId(remaining[0]?.id ?? null);
        }
        return remaining;
      });
    } catch {
      toast({ title: "Failed to archive conversation", variant: "destructive" });
    } finally {
      setArchivingConversationId((prev) => (prev === conversationId ? null : prev));
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Conversation list ── */}
      <aside
        className={`w-full lg:w-72 shrink-0 border-r border-border bg-card flex flex-col ${
          selectedId ? "hidden lg:flex" : "flex"
        }`}
      >
        <div className="px-4 py-4 border-b border-border">
          <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Messages
            {totalUnread > 0 && (
              <span className="ml-auto text-xs bg-primary text-black rounded-full px-2 py-0.5 font-medium">
                {totalUnread}
              </span>
            )}
          </h1>
        </div>

        {/* ── Debug state panel — activate with ?debug=1 in the URL ── */}
        {showDebug && (
          <div className="px-3 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-[10px] font-mono text-yellow-400 space-y-0.5">
            <div>uid: {user?.id ?? "—"}</div>
            <div>convs: {conversations.length} | selected: {selectedId ?? "none"}</div>
            <div>msgs: {messages.length} | retries: {hydrationRetryRef.current}</div>
          </div>
        )}

        {loadingConvs ? (
          <div className="flex-1 p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your conversations will appear here.
            </p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-border">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <div className="w-full flex items-center gap-1 pr-2">
                  <button
                    onClick={() => setSelectedId(conv.id)}
                    className={`flex-1 w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
                      selectedId === conv.id ? "bg-primary/5" : ""
                    }`}
                  >
                    {/* Thumbnail or avatar placeholder */}
                    <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                      {conv.productImage ? (
                        <img
                          src={conv.productImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-foreground truncate">
                          {participantName(conv.other)}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDate(conv.lastMessageAt)}
                        </span>
                      </div>
                      {(conv.subject ?? conv.lastMessagePreview) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessagePreview || conv.subject}
                        </p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-black text-[10px] font-medium flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="h-8 w-8 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center justify-center shrink-0"
                    aria-label="Archive conversation"
                    disabled={archivingConversationId === conv.id}
                    onClick={() => {
                      void archiveConversation(conv.id);
                    }}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* ── Message thread ── */}
      {selectedId && selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Thread header */}
          <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedId(null)}
              aria-label="Back to conversations"
            >
              ←
            </button>
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 overflow-hidden">
              {selectedConv.productImage ? (
                <img src={selectedConv.productImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {participantName(selectedConv.other)}
              </p>
              {(productTitle ?? selectedConv.subject) && (
                <p className="text-xs text-muted-foreground truncate">
                  {productTitle ?? selectedConv.subject}
                </p>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingMsgs ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-10 rounded-xl bg-muted animate-pulse max-w-[60%] ${
                      i % 2 === 0 ? "ml-auto" : ""
                    }`}
                  />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === user?.id;
                const parsed = parseMessage(msg.message);

                if (parsed.type === "system") {
                  return (
                    <SystemEventCard
                      key={msg.id}
                      event={parsed.event}
                    />
                  );
                }
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMine
                          ? "bg-primary text-black rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{parsed.text}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose bar */}
          <div className="px-4 py-3 border-t border-border bg-card shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                rows={2}
                className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
              />
              <Button
                size="icon"
                onClick={() => void handleSend()}
                disabled={!draft.trim() || sending}
                aria-label="Send message"
                className="shrink-0 rounded-xl"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : selectedId && !selectedConv ? (
        /* selectedId is set (deep-link from notification) but the conversation
           is not in the list yet — fallback single-fetch is in progress. */
        <div className="hidden lg:flex flex-1 items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-center">
          <div>
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 mx-auto" />
            <p className="text-sm font-medium text-foreground">Select a conversation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a conversation from the left to read your messages.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
