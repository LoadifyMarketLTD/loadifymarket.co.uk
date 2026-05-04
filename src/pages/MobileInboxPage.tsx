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

import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MessageSquare, User, Search, SquarePen } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import { toast } from "@/hooks/use-toast";
import MobileBottomNav from "@/components/MobileBottomNav";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface ConversationRow {
  id: string;
  subject: string | null;
  lastMessageAt: string;
  isArchived: boolean;
  user1Id: string;
  user2Id: string;
  productId: string | null;
}

interface Conversation extends ConversationRow {
  other: Participant;
  unreadCount: number;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  productTitle: string | null;
  productImage: string | null;
}

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

function participantName(p: Participant) {
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
  const { user, isLoading } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Auth gate — show prompt modal instead of hard redirect to /login
  useEffect(() => {
    if (!isLoading && !user) {
      promptAuth();
    }
  }, [user, isLoading, promptAuth]);

  // Fetch conversations
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from("conversations")
          .select("id, subject, lastMessageAt, isArchived, user1Id, user2Id, productId")
          .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
          .order("lastMessageAt", { ascending: false })
          .limit(100);

        if (error) throw error;
        if (cancelled) return;

        const convRows = (rows ?? []) as ConversationRow[];

        // Resolve other participants
        const otherIds = [...new Set(convRows.map((r) => r.user1Id === user.id ? r.user2Id : r.user1Id))];
        const userMap = new Map<string, Participant>();
        if (otherIds.length > 0) {
          const { data: users } = await supabase
            .from("user_display_names")
            .select("id, firstName, lastName")
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07080B] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F5B942]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#07080B" }}>
      {/* ── Header ── */}
      <div
        className="shrink-0 sticky top-0 z-40"
        style={{
          background: "rgba(7,8,11,0.97)",
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
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#FFFFFF" }}>Messages</h1>
          <button
            className="p-2 rounded-xl active:bg-white/10 transition-colors"
            style={{ background: "rgba(255,255,255,0.05)" }}
            aria-label="New message"
            onClick={() => navigate("/catalog")}
          >
            <SquarePen style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.75)" }} />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "0 16px 10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "12px",
              padding: "10px 14px",
            }}
          >
            <Search style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
            <input
              type="search"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "14px",
                color: "#FFFFFF",
              }}
              className="placeholder:text-white/35"
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
                style={{
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? "#F5B942" : "rgba(255,255,255,0.65)",
                  whiteSpace: "nowrap",
                  background: "transparent",
                  border: "none",
                  borderBottom: isActive ? "2px solid #F5B942" : "2px solid transparent",
                  cursor: "pointer",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "color 0.2s, border-color 0.2s",
                }}
              >
                {tab.label}
                {badge > 0 && (
                  <span
                    style={{
                      minWidth: "18px",
                      height: "18px",
                      borderRadius: "9px",
                      background: "#F5B942",
                      color: "#0B0B0F",
                      fontSize: "10px",
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
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

      {/* ── List ── */}
      <div style={{ flex: 1, paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}>
        {loading ? (
          <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: "72px", borderRadius: "12px", background: "rgba(255,255,255,0.05)" }} className="animate-pulse" />
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
                className="px-5 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "#F5B942", color: "#0B0B0F" }}
              >
                Browse listings
              </Link>
            )}
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filtered.map((conv) => (
              <li key={conv.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
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
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.10)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User style={{ width: "22px", height: "22px", color: "rgba(255,255,255,0.60)" }} />
                    </div>
                    {conv.unreadCount > 0 && (
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          bottom: "1px",
                          right: "1px",
                          width: "11px",
                          height: "11px",
                          borderRadius: "50%",
                          background: "#22C55E",
                          border: "2px solid #07080B",
                        }}
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "2px" }}>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: conv.unreadCount > 0 ? 700 : 600,
                          color: conv.unreadCount > 0 ? "#FFFFFF" : "rgba(255,255,255,0.80)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {participantName(conv.other)}
                      </span>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", flexShrink: 0 }}>
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    {conv.lastMessagePreview && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: conv.unreadCount > 0 ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.60)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {previewText(conv.lastMessagePreview)}
                      </p>
                    )}
                  </div>

                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <span
                      style={{
                        minWidth: "22px",
                        height: "22px",
                        borderRadius: "11px",
                        background: "#F5B942",
                        color: "#0B0B0F",
                        fontSize: "11px",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0 5px",
                        flexShrink: 0,
                      }}
                    >
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}

                  {/* Product thumbnail */}
                  {conv.productImage && (
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        overflow: "hidden",
                        flexShrink: 0,
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
