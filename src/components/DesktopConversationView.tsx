/**
 * DesktopConversationView
 *
 * Shared two-panel desktop messages view used by both BuyerMessages and
 * SellerMessages.  Handles the full message + offer lifecycle:
 *   - Conversation list with unread badges and last-message previews
 *   - Message thread: plain text, offer bubbles, system event cards
 *   - Sending messages via the send-message Netlify function (push notifications)
 *   - Sending offers via the conversation-offer Netlify function (buyer only)
 *   - Accepting/declining offers via offer-accept/offer-decline (seller only)
 *   - Pay Now button for accepted offers (buyer)
 *   - Supabase Realtime subscriptions for messages, offers, and orders
 *
 * The component determines per-conversation whether the current user is the
 * seller by checking listing.sellerId === user.id after loading the selected
 * conversation's linked product.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Archive, MessageSquare, Send, User, Tag,
  CheckCircle, XCircle, CreditCard,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { openExternalUrl } from "@/lib/capacitorUtils";
import { getOfferActionAvailability } from "@/lib/offerActions";
import { parseConversationRouteSearch } from "@/lib/routeSearch";
import MakeOfferSheet from "@/components/MakeOfferSheet";
import { trackOfferAccepted } from "@/lib/analytics";
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

interface OfferRecord {
  id: string;
  amountPence: number;
  status: string;
  proposedById: string;
  recipientId: string;
  orderId?: string | null;
  orderStatus?: string | null;
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

/** Decode offer/system message JSON to a human-readable inbox preview. */
function previewText(raw: string | null): string {
  if (!raw) return "";
  if (raw.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed._t === "offer" && typeof parsed.amount_pence === "number") {
        return `💰 Offer: £${(parsed.amount_pence as number / 100).toFixed(2)}`;
      }
      if (parsed._t === "offer" && typeof parsed.offerId === "string") {
        return "💰 Offer";
      }
      if (parsed._t === "system") {
        const events: Record<string, string> = {
          offer_accepted: "✓ Offer accepted",
          offer_declined: "✗ Offer declined",
          offer_rejected: "✗ Offer rejected",
          offer_cancelled: "↺ Offer cancelled",
          offer_expired: "⌛ Offer expired",
          listing_unavailable: "🔒 Listing unavailable",
        };
        if (typeof parsed.event === "string" && events[parsed.event]) {
          return events[parsed.event];
        }
      }
    } catch {
      /* ignore */
    }
  }
  return raw.length > 60 ? raw.slice(0, 60) + "…" : raw;
}

/** Parse a message string that may be JSON-encoded offer / system event. */
function parseMessage(raw: unknown): {
  type: "text" | "offer" | "system";
  text?: string;
  amount_pence?: number;
  offerId?: string;
  productTitle?: string;
  note?: string;
  event?: string;
  orderId?: string;
  amountPence?: number;
} {
  const rawText = typeof raw === "string" ? raw : "";
  if (rawText.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      if (
        parsed._t === "offer" &&
        (typeof parsed.amount_pence === "number" || typeof parsed.offerId === "string")
      ) {
        return {
          type:         "offer",
          amount_pence: typeof parsed.amount_pence === "number" ? parsed.amount_pence : undefined,
          offerId:      typeof parsed.offerId === "string" ? parsed.offerId : undefined,
          productTitle: typeof parsed.productTitle === "string" ? parsed.productTitle : undefined,
          note:         typeof parsed.note === "string" ? parsed.note : undefined,
        };
      }
      if (parsed._t === "system") {
        return {
          type:        "system",
          event:       typeof parsed.event === "string" ? parsed.event : undefined,
          orderId:     typeof parsed.orderId === "string" ? parsed.orderId : undefined,
          amountPence: typeof parsed.amountPence === "number" ? parsed.amountPence : undefined,
        };
      }
    } catch {
      /* ignore invalid JSON; treat as plain text */
    }
  }
  return { type: "text", text: rawText };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OfferBubble({
  amount_pence,
  offerId,
  isMine,
  isSeller,
  currentUserId,
  productTitle,
  note,
  offerRecord,
  actingOnOffer,
  onAccept,
  onDecline,
  onCounter,
  onCancel,
  highlightedOfferId,
  onPayNow,
}: {
  amount_pence: number;
  offerId?: string;
  isMine: boolean;
  isSeller: boolean;
  currentUserId?: string;
  productTitle?: string;
  note?: string;
  offerRecord?: OfferRecord | null;
  actingOnOffer: string | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onCounter?: (amountPence: number, message?: string) => void;
  onCancel?: () => void;
  highlightedOfferId?: string | null;
  onPayNow?: () => void;
}) {
  const pounds = (amount_pence / 100).toFixed(2);
  const status = offerRecord?.status ?? "pending";
  const [counterOpen, setCounterOpen] = useState(false);
  const [customCounter, setCustomCounter] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const actions = getOfferActionAvailability({
    status,
    currentUserId,
    proposedById: offerRecord?.proposedById,
    recipientId: offerRecord?.recipientId,
  });

  const statusLabel: Record<string, string> = {
    pending:   isMine ? "You offered · Pending" : "Offer received · Pending",
    countered: "Countered",
    accepted:  "Accepted ✓",
    rejected:  "Rejected",
    declined:  "Declined",
    expired:   "Expired",
    cancelled: "Cancelled",
  };

  const statusColour: Record<string, string> = {
    pending:   "text-muted-foreground",
    countered: "text-primary",
    accepted:  "text-success dark:text-success",
    rejected:  "text-destructive",
    declined:  "text-destructive",
    expired:   "text-muted-foreground",
    cancelled: "text-muted-foreground",
  };

  const busy = offerId ? actingOnOffer === offerId : false;

  return (
    <div
      data-offer-id={offerId}
      className={`rounded-2xl px-4 py-3 max-w-[80%] border ${
        isMine
          ? "bg-primary/10 border-primary/30 rounded-br-sm ml-auto"
          : "bg-muted border-border rounded-bl-sm"
      } ${offerId && highlightedOfferId === offerId ? "ring-2 ring-primary/70" : ""}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Offer</span>
      </div>
      {productTitle && (
        <p className="text-xs text-muted-foreground mb-1 truncate">{productTitle}</p>
      )}
      {note && (
        <p className="text-xs text-muted-foreground mb-1 whitespace-pre-wrap break-words">{note}</p>
      )}
      <p className="text-xl font-bold text-foreground">£{pounds}</p>
      <p className={`text-[11px] mt-1 ${statusColour[status] ?? "text-muted-foreground"}`}>
        {statusLabel[status] ?? status}
      </p>

      {actions.canAccept && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAccept}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-success/10 border border-success/30 text-green-700 text-xs font-semibold hover:bg-green-100 disabled:opacity-40 transition-colors dark:bg-success/10 dark:border-success/30 dark:text-success dark:hover:bg-success/100/20"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {busy ? "…" : "Accept"}
          </button>
          <button
            onClick={onDecline}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs font-semibold hover:bg-red-100 disabled:opacity-40 transition-colors dark:bg-danger/100/10 dark:border-danger/30 dark:text-danger dark:hover:bg-danger/100/20"
          >
            <XCircle className="h-3.5 w-3.5" />
            {busy ? "…" : "Reject"}
          </button>
          <button
            onClick={() => setCounterOpen((v) => !v)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 disabled:opacity-40 transition-colors"
          >
            {busy ? "…" : "Counter"}
          </button>
        </div>
      )}
      {actions.canCounter && counterOpen && (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {[1.05, 1.1, 1.15].map((factor) => {
              const suggested = Math.round(amount_pence * factor);
              return (
                <button
                  key={factor}
                  onClick={() => onCounter?.(suggested, counterMessage || undefined)}
                  disabled={busy}
                  className="rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40"
                >
                  Counter £{(suggested / 100).toFixed(2)}
                </button>
              );
            })}
            <input
              value={customCounter}
              onChange={(e) => setCustomCounter(e.target.value)}
              placeholder="Custom £"
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
            />
            <button
              onClick={() => {
                const poundsValue = Number(customCounter);
                if (!Number.isFinite(poundsValue) || poundsValue <= 0) return;
                onCounter?.(Math.round(poundsValue * 100), counterMessage || undefined);
              }}
              disabled={busy}
              className="rounded-lg border border-primary/40 px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
            >
              Send custom
            </button>
          </div>
          <textarea
            value={counterMessage}
            onChange={(e) => setCounterMessage(e.target.value)}
            placeholder="Optional message"
            maxLength={500}
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs"
          />
        </div>
      )}
      {actions.canCancel && (
        <button
          onClick={onCancel}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40 transition-colors"
        >
          {busy ? "…" : "Cancel offer"}
        </button>
      )}

      {/* Buyer: Pay Now button for accepted offers awaiting payment */}
      {!isSeller && status === "accepted" && offerRecord?.orderStatus !== "paid" && (
        <Button
          size="sm"
          className="mt-3 w-full gap-1.5"
          onClick={onPayNow}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Pay Now
        </Button>
      )}

      {/* Buyer: payment confirmed state */}
      {!isSeller && status === "accepted" && offerRecord?.orderStatus === "paid" && (
        <p className="mt-3 text-center text-xs font-semibold text-success dark:text-success">
          ✓ Payment confirmed
        </p>
      )}
    </div>
  );
}

function SystemEventCard({ event, amountPence }: { event?: string; amountPence?: number }) {
  const pounds = amountPence ? `£${(amountPence / 100).toFixed(2)}` : "";

  const content: Record<string, { icon: string; text: string }> = {
    offer_accepted: {
      icon: "🎉",
      text: pounds
        ? `Offer of ${pounds} accepted! Complete payment to secure the item.`
        : "Offer accepted!",
    },
    offer_declined: {
      icon: "❌",
      text: pounds ? `Offer of ${pounds} was declined.` : "Offer declined.",
    },
    offer_rejected: {
      icon: "❌",
      text: pounds ? `Offer of ${pounds} was rejected.` : "Offer rejected.",
    },
    offer_cancelled: {
      icon: "↺",
      text: pounds ? `Offer of ${pounds} was cancelled.` : "Offer cancelled.",
    },
    offer_expired: {
      icon: "⌛",
      text: pounds ? `Offer of ${pounds} expired before anyone responded.` : "Offer expired.",
    },
    listing_unavailable: {
      icon: "🔒",
      text: "This listing has been purchased. It is no longer available.",
    },
  };

  const info = event ? content[event] : null;
  if (!info) return null;

  return (
    <div className="flex justify-center">
      <div className="max-w-[75%] rounded-2xl px-4 py-2 bg-muted border border-border text-center">
        <span className="mr-1">{info.icon}</span>
        <span className="text-xs text-muted-foreground">{info.text}</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DesktopConversationView() {
  const { user } = useAuthStore();
  const location = useLocation();
  const { conversationId: routeConversationId, offerId: routeOfferId } = parseConversationRouteSearch(location.search);

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
  const [isSeller, setIsSeller] = useState(false);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [productTitle, setProductTitle] = useState<string | null>(null);
  const [offerMap, setOfferMap] = useState<Map<string, OfferRecord>>(new Map());
  const [actingOnOffer, setActingOnOffer] = useState<string | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offersFeatureUnavailable, setOffersFeatureUnavailable] = useState(false);

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

  // ── Load thread metadata (isSeller, otherId, productTitle) ──────────────────
  useEffect(() => {
    if (!selectedId || !user?.id) {
      setIsSeller(false);
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
          .select("sellerId, title")
          .eq("id", conv.productId)
          .maybeSingle<{ sellerId: string; title: string }>();
        if (!cancelled && listing) {
          setIsSeller(listing.sellerId === user.id);
          setProductTitle(listing.title);
        }
      } else {
        if (!cancelled) {
          setIsSeller(false);
          setProductTitle(conv.subject ?? null);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedId, user?.id, conversations]);

  // Load offers for selected conversation and keep offerMap up-to-date.
  // Orders are fetched in a separate query to avoid PostgREST embedded-resource
  // relationship resolution (PGRST200) errors when the schema cache is stale.
  const loadOffers = useCallback(async () => {
    if (!selectedId || offersFeatureUnavailable || !user?.id) return;

    await authorizedFetch("/.netlify/functions/offer-sync", {
      method: "POST",
      body: JSON.stringify({ conversationId: selectedId }),
    }).catch((error) => {
      console.warn("desktop chat: offer-sync failed (non-fatal):", error);
    });

    const { data: offerRows, error } = await supabase
      .from("offers")
      .select("id, amountPence, status, proposedById, recipientId")
      .eq("conversationId", selectedId)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === "42P01") {
        setOffersFeatureUnavailable(true);
        setOfferMap(new Map());
        return;
      }
      console.warn("desktop chat: failed to load offers:", error.message);
      return;
    }

    if (!offerRows?.length) {
      setOfferMap(new Map());
      return;
    }

    // Fetch related orders via explicit FK column query — no PostgREST join needed.
    const offerIds = offerRows.map((o) => o.id);
    const { data: orderRows } = await supabase
      .from("orders")
      .select("id, status, offerId")
      .in("offerId", offerIds);

    const orderByOfferId = new Map(
      (orderRows ?? []).map((o) => [o.offerId as string, { orderId: o.id as string, orderStatus: o.status as string }]),
    );

    const mapped = (offerRows as Array<{
      id: string;
      amountPence: number;
      status: string;
      proposedById: string;
      recipientId: string;
    }>).map((o) => ({
      id:           o.id,
      amountPence:  o.amountPence,
      status:       o.status,
      proposedById: o.proposedById,
      recipientId:  o.recipientId,
      orderId:      orderByOfferId.get(o.id)?.orderId ?? null,
      orderStatus:  orderByOfferId.get(o.id)?.orderStatus ?? null,
    }));
    setOfferMap(new Map(mapped.map((o) => [o.id, o])));
  }, [selectedId, offersFeatureUnavailable, user?.id]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

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
    if (!selectedId || !user?.id || offersFeatureUnavailable) return;

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
          const parsed = parseMessage(msg.message);
          if (parsed.type === "offer" || parsed.type === "system") {
            void loadOffers();
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedId, user?.id, loadOffers, offersFeatureUnavailable]);

  // ── Supabase Realtime: offers ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId || !user?.id) return;

    const channel = supabase
      .channel(`desktop-chat-offers:${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "offers", filter: `conversationId=eq.${selectedId}` },
        () => {
          void loadOffers();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "offers", filter: `conversationId=eq.${selectedId}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          let found = false;
          setOfferMap((prev) => {
            const existing = prev.get(updated.id);
            if (!existing) return prev;
            found = true;
            const next = new Map(prev);
            next.set(updated.id, { ...existing, status: updated.status });
            return next;
          });
          if (!found) {
            void loadOffers();
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [selectedId, user?.id, offersFeatureUnavailable, loadOffers]);

  // ── Supabase Realtime: orders (Pay Now / payment-confirmed live update) ──────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`desktop-chat-orders:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `buyerId=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string; offerId: string | null };
          const offerId = updated.offerId;
          if (!offerId) return;
          setOfferMap((prev) => {
            const existing = prev.get(offerId);
            if (!existing) return prev;
            if (existing.orderId === updated.id && existing.orderStatus === updated.status) return prev;
            const next = new Map(prev);
            next.set(offerId, { ...existing, orderId: updated.id, orderStatus: updated.status });
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `buyerId=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as { id: string; status: string; offerId: string | null };
          const offerId = updated.offerId;
          if (!offerId) return;
          setOfferMap((prev) => {
            const existing = prev.get(offerId);
            if (!existing) return prev;
            if (existing.orderId === updated.id && existing.orderStatus === updated.status) return prev;
            const next = new Map(prev);
            next.set(offerId, { ...existing, orderId: updated.id, orderStatus: updated.status });
            return next;
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]);

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

  // ── Offer action handlers ────────────────────────────────────────────────────
  const handleAcceptOffer = async (offerId: string) => {
    setActingOnOffer(offerId);
    try {
      const res = await authorizedFetch("/.netlify/functions/offer-accept", {
        method: "POST",
        body: JSON.stringify({ offerId }),
      });
      const json = await res.json() as { orderId?: string; error?: string; details?: string };
      if (!res.ok) throw new Error(json.details ?? json.error ?? `HTTP ${res.status}`);

      if (json.orderId) {
        setOfferMap((prev) => {
          const existing = prev.get(offerId);
          if (!existing) return prev;
          const next = new Map(prev);
          next.set(offerId, {
            ...existing,
            status: "accepted",
            orderId: json.orderId,
            orderStatus: existing.orderStatus ?? "awaiting_payment",
          });
          return next;
        });
      }

      toast({ title: "Offer accepted! Buyer has been notified to pay." });
      const rec = offerMap.get(offerId);
      if (rec) trackOfferAccepted({ offerId, amountPence: rec.amountPence });
      void loadOffers();
    } catch (err) {
      toast({ title: "Failed to accept offer", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActingOnOffer(null);
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    setActingOnOffer(offerId);
    try {
      const res = await authorizedFetch("/.netlify/functions/offer-decline", {
        method: "POST",
        body: JSON.stringify({ offerId }),
      });
      const json = await res.json() as { success?: boolean; error?: string; details?: string };
      if (!res.ok) throw new Error(json.details ?? json.error ?? `HTTP ${res.status}`);

      toast({ title: "Offer declined." });
      void loadOffers();
    } catch (err) {
      toast({ title: "Failed to decline offer", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActingOnOffer(null);
    }
  };

  const handlePayNow = async (offerId: string, orderId: string, status: string) => {
    console.log("PAY_NOW_CLICK", { offerId, orderId, status });
    try {
      const res = await authorizedFetch("/.netlify/functions/checkout-from-offer", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
      const json = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (!json.checkoutUrl) throw new Error("No checkout URL returned");

      await openExternalUrl(json.checkoutUrl);
    } catch (err) {
      toast({ title: "Failed to start checkout", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handleCounterOffer = async (offerId: string, amountPence: number, message?: string) => {
    setActingOnOffer(offerId);
    try {
      const res = await authorizedFetch("/.netlify/functions/offer-counter", {
        method: "POST",
        body: JSON.stringify({ offerId, amountPence, message }),
      });
      const json = await res.json() as { offerId?: string; error?: string; details?: string };
      if (!res.ok) throw new Error(json.details ?? json.error ?? `HTTP ${res.status}`);
      toast({ title: "Counter offer sent." });
      void loadOffers();
    } catch (err) {
      toast({ title: "Failed to send counter offer", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActingOnOffer(null);
    }
  };

  const handleCancelOffer = async (offerId: string) => {
    setActingOnOffer(offerId);
    try {
      const res = await authorizedFetch("/.netlify/functions/offer-cancel", {
        method: "POST",
        body: JSON.stringify({ offerId }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      toast({ title: "Offer cancelled." });
      void loadOffers();
    } catch (err) {
      toast({ title: "Failed to cancel offer", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActingOnOffer(null);
    }
  };

  useEffect(() => {
    if (!routeOfferId || !selectedId) return;
    const el = document.querySelector(`[data-offer-id="${routeOfferId}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [routeOfferId, selectedId, messages, offerMap]);

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
            {/* Make Offer — buyers only (not the listing seller) */}
            {otherId && !isSeller && (
              <button
                onClick={() => setOfferOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors shrink-0"
                aria-label="Make an offer"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Offer</span>
              </button>
            )}
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
                const offerRecord = parsed.offerId ? offerMap.get(parsed.offerId) ?? null : null;

                if (import.meta.env.DEV) {
                  console.log("RAW MESSAGE:", msg.message);
                  let parsedDebug: unknown = null;
                  if (typeof msg.message === "string") {
                    try {
                      parsedDebug = JSON.parse(msg.message);
                    } catch {
                      parsedDebug = null;
                    }
                  }
                  const parsedRecord =
                    parsedDebug && typeof parsedDebug === "object"
                      ? (parsedDebug as Record<string, unknown>)
                      : null;
                  const parsedOfferId =
                    typeof parsedRecord?.offerId === "string" ? parsedRecord.offerId : undefined;
                  console.log("PARSED:", parsedDebug);
                  console.log("TYPE:", parsedRecord?._t);
                  console.log("OFFER ID:", parsedOfferId);
                  console.log("offerMap:", Object.fromEntries(offerMap.entries()));
                  console.log("MATCHED OFFER:", parsedOfferId ? offerMap.get(parsedOfferId) : undefined);
                }

                if (parsed.type === "system") {
                  return (
                    <SystemEventCard
                      key={msg.id}
                      event={parsed.event}
                      amountPence={parsed.amountPence}
                    />
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    {parsed.type === "offer" ? (
                      <OfferBubble
                        amount_pence={parsed.amount_pence ?? offerRecord?.amountPence ?? 0}
                        offerId={parsed.offerId}
                        isMine={isMine}
                        isSeller={isSeller}
                        currentUserId={user?.id}
                        productTitle={parsed.productTitle}
                        note={parsed.note}
                        offerRecord={offerRecord}
                        actingOnOffer={actingOnOffer}
                        onAccept={parsed.offerId ? () => void handleAcceptOffer(parsed.offerId!) : undefined}
                        onDecline={parsed.offerId ? () => void handleDeclineOffer(parsed.offerId!) : undefined}
                        onCounter={parsed.offerId ? (amountPence, message) => void handleCounterOffer(parsed.offerId!, amountPence, message) : undefined}
                        onCancel={parsed.offerId ? () => void handleCancelOffer(parsed.offerId!) : undefined}
                        highlightedOfferId={routeOfferId}
                        onPayNow={(() => {
                          if (!parsed.offerId) return undefined;
                          return () => {
                            const rec = offerMap.get(parsed.offerId!);
                            const oid = rec?.orderId ?? null;
                            const status = rec?.status ?? "accepted";
                            if (!oid) {
                              console.log("PAY_NOW_CLICK", { offerId: parsed.offerId, orderId: oid, status });
                              toast({
                                title: "Checkout not ready",
                                description: "Order is still syncing. Please try again in a moment.",
                                variant: "destructive",
                              });
                              void loadOffers();
                              return;
                            }
                            void handlePayNow(parsed.offerId!, oid, status);
                          };
                        })()}
                      />
                    ) : (
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
                    )}
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

      {/* Make Offer Sheet — buyer only */}
      {otherId && !isSeller && selectedId && (
        <MakeOfferSheet
          open={offerOpen}
          onOpenChange={setOfferOpen}
          conversationId={selectedId}
          receiverId={otherId}
          productTitle={productTitle ?? selectedConv?.subject ?? undefined}
          onSent={() => void loadOffers()}
        />
      )}
    </div>
  );
}
