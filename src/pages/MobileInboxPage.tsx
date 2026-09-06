/**
 * MobileInboxPage — /inbox
 * Native marketplace conversation list. Data access, RLS boundaries, realtime
 * refresh and archive behaviour remain unchanged; presentation is mobile-first.
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

const DEFAULT_DISPLAY_NAME = "Loadify User";

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

function previewText(raw: string | null): string {
  if (!raw) return "";
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed._t === "offer") return "Offer update";
      if (parsed._t === "system" && parsed.event === "listing_unavailable") return "Listing unavailable";
    } catch {
      // Ignore invalid JSON and display the plain message preview.
    }
  }
  return raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
}

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
  const hydrationRetryRef = useRef(0);
  const postHydrationRefetchFired = useRef(false);
  const showDebug = new URLSearchParams(location.search).get("debug") === "1" || import.meta.env.DEV;

  useEffect(() => {
    if (!isLoading && !user) promptAuth('message');
  }, [user, isLoading, promptAuth]);

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
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

      const otherIds = [...new Set(convRows.map((r) => r.user1Id === user.id ? r.user2Id : r.user1Id))];
      const userMap = new Map<string, ConversationParticipant>();
      if (otherIds.length > 0) {
        const { data: users } = await supabase
          .from("user_display_names")
          .select("id, firstName, lastName")
          .in("id", otherIds);
        (users ?? []).forEach((u: ConversationParticipant) => userMap.set(u.id, u));
      }

      const { data: unreadRows } = await supabase
        .from("messages")
        .select("conversationId")
        .eq("receiverId", user.id)
        .eq("isRead", false);
      const unreadMap = new Map<string, number>();
      (unreadRows ?? []).forEach((r: { conversationId: string }) => {
        unreadMap.set(r.conversationId, (unreadMap.get(r.conversationId) ?? 0) + 1);
      });

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

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`mobile-inbox-live:${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiverId=eq.${user.id}` }, () => { void loadConversations(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `senderId=eq.${user.id}` }, () => { void loadConversations(); })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `receiverId=eq.${user.id}` }, () => { void loadConversations(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations", filter: `user1Id=eq.${user.id}` }, () => { void loadConversations(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations", filter: `user2Id=eq.${user.id}` }, () => { void loadConversations(); })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, loadConversations]);

  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => {
      console.warn("[MobileInboxPage] Loading timeout — forcing off after 10s", { userId: user?.id });
      setLoading(false);
    }, 10_000);
    return () => clearTimeout(timeout);
  }, [loading, user?.id]);

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

  const tabFiltered = conversations.filter((c) => {
    if (activeTab === "all") return !c.isArchived;
    if (activeTab === "unread") return !c.isArchived && c.unreadCount > 0;
    if (activeTab === "buyers") return !c.isArchived && c.lastMessageSenderId !== user?.id;
    if (activeTab === "sellers") return !c.isArchived && c.lastMessageSenderId === user?.id;
    return true;
  });

  const filtered = searchQuery.trim()
    ? tabFiltered.filter((c) => {
        const q = searchQuery.toLowerCase();
        return participantName(c.other).toLowerCase().includes(q) || (c.productTitle ?? "").toLowerCase().includes(q);
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A234F]/15 border-b-[#0A234F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#0A234F] md:hidden">
      <header
        className="sticky top-0 z-40 border-b border-[#0A234F]/[0.08] bg-white/95"
        style={{ backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between gap-3 px-[var(--mob-side,16px)] pb-2 pt-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#C98200]">Conversations</p>
            <h1 className="mt-1 text-[22px] font-black tracking-[-0.03em] text-[#0A234F]">Inbox</h1>
          </div>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0A234F]/10 bg-[#F7F9FC]"
            aria-label="Start a new conversation"
            onClick={() => navigate("/catalog")}
          >
            <SquarePen className="h-[19px] w-[19px] text-[#0A234F]" aria-hidden="true" />
          </button>
        </div>

        <div className="px-[var(--mob-side,16px)] pb-2">
          <label className="flex h-11 items-center gap-2.5 rounded-[14px] border border-[#0A234F]/10 bg-[#F4F6F8] px-3.5">
            <Search className="h-4 w-4 shrink-0 text-[#667085]" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] font-medium text-[#26354A] outline-none placeholder:text-[#98A2B3]"
            />
          </label>
        </div>

        <div className="flex gap-2 overflow-x-auto px-[var(--mob-side,16px)] pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const badge = tab.id === "unread" && inboxUnread > 0 ? inboxUnread : 0;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold ${active ? 'bg-[#0A234F] text-white' : 'border border-[#0A234F]/10 bg-[#F7F9FC] text-[#667085]'}`}
              >
                {tab.label}
                {badge > 0 && <span className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-black ${active ? 'bg-[#F5A300] text-[#0A234F]' : 'bg-[#0A234F] text-white'}`}>{badge > 9 ? "9+" : badge}</span>}
              </button>
            );
          })}
        </div>
      </header>

      {showDebug && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 font-mono text-[9px] text-amber-700">
          uid: {user?.id ?? "—"} | convs: {conversations.length} | loading: {String(loading)}
        </div>
      )}

      <main style={{ paddingBottom: "calc(86px + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? (
          <div className="flex flex-col gap-2.5 p-[var(--mob-side,16px)]">
            {[...Array(6)].map((_, index) => <div key={index} className="h-[82px] animate-pulse rounded-[18px] bg-[#E8EDF3]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mx-[var(--mob-side,16px)] mt-5 flex flex-col items-center rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-14 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF2F7]"><MessageSquare className="h-7 w-7 text-[#94A3B8]" aria-hidden="true" /></div>
            <p className="mt-4 text-[15px] font-extrabold text-[#0A234F]">{searchQuery ? "No results found" : "No conversations yet"}</p>
            <p className="mt-1 max-w-[280px] text-[12px] leading-[1.5] text-[#7A8493]">{searchQuery ? "Try another name or listing." : "Contact a seller from a product page to start a conversation."}</p>
            {!searchQuery && <Link to="/catalog" className="mt-5 rounded-[13px] bg-[#0A234F] px-4 py-2.5 text-[12px] font-extrabold text-white no-underline">Browse marketplace</Link>}
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {filtered.map((conv) => (
              <li key={conv.id} className="border-b border-[#0A234F]/[0.06] bg-white">
                <div className="flex items-center pr-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/inbox/${conv.id}`)}
                    className="flex min-w-0 flex-1 items-center gap-3 border-0 bg-transparent px-[var(--mob-side,16px)] py-3.5 text-left active:bg-[#F4F6F8]"
                  >
                    <div className="relative shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#0A234F]/10 bg-[#EEF2F7]">
                        {conv.productImage ? (
                          <img src={conv.productImage} alt="" aria-hidden="true" className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-[#667085]" aria-hidden="true" />
                        )}
                      </div>
                      {conv.unreadCount > 0 && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#F5A300]" aria-hidden="true" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`truncate text-[13px] ${conv.unreadCount > 0 ? 'font-black text-[#0A234F]' : 'font-bold text-[#344054]'}`}>{participantName(conv.other)}</span>
                        <span className="shrink-0 text-[9.5px] font-semibold text-[#98A2B3]">{formatDate(conv.lastMessageAt)}</span>
                      </div>
                      {conv.productTitle && <p className="mt-0.5 truncate text-[10px] font-bold text-[#1D57D8]">{conv.productTitle}</p>}
                      <div className="mt-1 flex items-center gap-2">
                        <p className={`min-w-0 flex-1 truncate text-[11px] ${conv.unreadCount > 0 ? 'font-semibold text-[#475467]' : 'font-medium text-[#7A8493]'}`}>{previewText(conv.lastMessagePreview)}</p>
                        {conv.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#0A234F] px-1.5 text-[9px] font-black text-white">{conv.unreadCount > 99 ? "99+" : conv.unreadCount}</span>}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    aria-label="Archive conversation"
                    disabled={archivingConversationId === conv.id}
                    onClick={() => { void archiveConversation(conv.id); }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0A234F]/10 bg-[#F7F9FC] text-[#667085] disabled:opacity-50"
                  >
                    <Archive className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
