/**
 * MobileChatPage — /inbox/:conversationId
 *
 * Full-screen chat thread for a single conversation.
 * Features:
 *   - Message bubbles (plain text + real offer cards with state)
 *   - Supabase Realtime for live messages
 *   - Send text message
 *   - "Make Offer" FAB → MakeOfferSheet
 *   - Accept / Decline offer buttons for the seller
 *   - "Pay Now" button for accepted offers (buyer)
 *   - Back button → /inbox
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Tag, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { openExternalUrl } from "@/lib/capacitorUtils";
import MakeOfferSheet from "@/components/MakeOfferSheet";
import { trackOfferAccepted } from "@/lib/analytics";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface ConversationMeta {
  id: string;
  user1Id: string;
  user2Id: string;
  subject: string | null;
  productId: string | null;
}

interface OfferRecord {
  id: string;
  amountPence: number;
  status: string;
  proposedById: string;
  recipientId: string;
  /** orderId from the linked order (present when status = 'accepted') */
  orderId?: string | null;
  /** Live order status from the orders table (updated via Realtime) */
  orderStatus?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fallback name shown when a participant has not set a display name. */
const DEFAULT_DISPLAY_NAME = "Loadify User";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return `Yesterday ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) +
    " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Parse a message string that may be JSON-encoded offer / system event */
function parseMessage(raw: string): {
  type: "text" | "offer" | "system";
  text?: string;
  // offer fields
  amount_pence?: number;
  offerId?: string;
  productTitle?: string;
  // system event fields
  event?: string;
  orderId?: string;
} {
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed._t === "offer" && typeof parsed.amount_pence === "number") {
        return {
          type:         "offer",
          amount_pence: parsed.amount_pence as number,
          offerId:      typeof parsed.offerId === "string" ? parsed.offerId : undefined,
          productTitle: typeof parsed.productTitle === "string" ? parsed.productTitle : undefined,
        };
      }
      if (parsed._t === "system") {
        return {
          type:    "system",
          event:   typeof parsed.event === "string" ? parsed.event : undefined,
          orderId: typeof parsed.orderId === "string" ? parsed.orderId : undefined,
          amount_pence: typeof parsed.amountPence === "number" ? parsed.amountPence : undefined,
        };
      }
    } catch {
      // ignore invalid JSON; treat as plain text
    }
  }
  return { type: "text", text: raw };
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Offer bubble with live status from the offers table */
function OfferBubble({
  amount_pence,
  offerId,
  isMine,
  isSeller,
  productTitle,
  offerRecord,
  onAccept,
  onDecline,
  onPayNow,
}: {
  amount_pence: number;
  offerId?: string;
  isMine: boolean;
  isSeller: boolean;
  productTitle?: string;
  offerRecord?: OfferRecord | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onPayNow?: () => void;
}) {
  const pounds = (amount_pence / 100).toFixed(2);
  const status = offerRecord?.status ?? "pending";

  const statusLabel: Record<string, string> = {
    pending:   isMine ? "You offered · Pending" : "Offer received · Pending",
    accepted:  "Accepted ✓",
    declined:  "Declined",
    expired:   "Expired",
    cancelled: "Cancelled",
  };

  const statusColour: Record<string, string> = {
    pending:   "text-white/40",
    accepted:  "text-success",
    declined:  "text-danger",
    expired:   "text-white/30",
    cancelled: "text-white/30",
  };

  return (
    <div
      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
        isMine
          ? "bg-primary/15 border border-primary/30 rounded-br-sm"
          : "bg-primary/10 border border-primary/20 rounded-bl-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">Offer</span>
      </div>
      {productTitle && (
        <p className="text-xs text-white/75 mb-1 truncate">{productTitle}</p>
      )}
      <p className="text-xl font-bold text-white">£{pounds}</p>
      <p className={`text-[11px] mt-1 ${statusColour[status] ?? "text-white/40"}`}>
        {statusLabel[status] ?? status}
      </p>

      {/* Seller: accept / decline buttons for pending offers */}
      {isSeller && !isMine && offerId && status === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAccept}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-success/100/20 border border-green-500/40 text-success text-xs font-semibold active:bg-success/100/30 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-danger/100/20 border border-red-500/40 text-danger text-xs font-semibold active:bg-danger/100/30 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      )}

      {/* Buyer: Pay Now button for accepted offers awaiting payment */}
      {!isSeller && isMine && status === "accepted" && offerRecord?.orderStatus !== "paid" && (
        <button
          onClick={onPayNow}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary text-background text-sm font-bold active:bg-warning transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Pay Now
        </button>
      )}

      {/* Buyer: payment confirmed state */}
      {!isSeller && isMine && status === "accepted" && offerRecord?.orderStatus === "paid" && (
        <p className="mt-3 text-center text-xs font-semibold text-success">
          ✓ Payment confirmed
        </p>
      )}
    </div>
  );
}

/** System event card (offer accepted / declined / listing unavailable) */
function SystemEventCard({ event, amountPence }: { event?: string; amountPence?: number }) {
  const pounds = amountPence ? `£${(amountPence / 100).toFixed(2)}` : "";

  const content: Record<string, { icon: string; text: string }> = {
    offer_accepted: {
      icon: "🎉",
      text: pounds ? `Offer of ${pounds} accepted! Complete payment to secure the item.` : "Offer accepted!",
    },
    offer_declined: {
      icon: "❌",
      text: pounds ? `Your offer of ${pounds} was declined.` : "Offer declined.",
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
      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-white/5 border border-white/10 text-center">
        <span className="mr-1">{info.icon}</span>
        <span className="text-xs text-white/75">{info.text}</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();

  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);

  const [convMeta, setConvMeta] = useState<ConversationMeta | null>(null);
  const [otherName, setOtherName] = useState<string>("…");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offersFeatureUnavailable, setOffersFeatureUnavailable] = useState(false);
  // Map of offerId → OfferRecord for live status display
  const [offerMap, setOfferMap] = useState<Map<string, OfferRecord>>(new Map());
  // True when the current user is the seller (listing owner) in this conversation
  const [isSeller, setIsSeller] = useState(false);
  const [actingOnOffer, setActingOnOffer] = useState<string | null>(null);
  // Typing indicator — true when the other participant is typing
  const [otherTyping, setOtherTyping] = useState(false);
  const otherTypingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the last sent message has been read by the other participant
  const [lastSentRead, setLastSentRead] = useState(false);
  // Product preview in chat header
  const [productPreview, setProductPreview] = useState<{ title: string; image: string | null } | null>(null);

  // How long to show the typing indicator after the last heartbeat (ms)
  const TYPING_INDICATOR_TIMEOUT_MS = 4000;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      promptAuth('message');
    }
  }, [user, isLoading, promptAuth]);

  // Load conversation metadata + other participant name + seller detection
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      // Fetch conversation row
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("id, user1Id, user2Id, subject, productId")
        .eq("id", conversationId)
        .maybeSingle<ConversationMeta>();

      if (error || !conv) {
        if (!cancelled) navigate("/inbox", { replace: true });
        return;
      }
      // Verify the current user is actually a participant (belt-and-suspenders
      // on top of Supabase RLS, in case of any stale session edge-case)
      if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
        if (!cancelled) navigate("/inbox", { replace: true });
        return;
      }
      if (cancelled) return;
      setConvMeta(conv);

      // Resolve the other participant's name
      const otherUserId = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
      setOtherId(otherUserId);

      const { data: otherUser } = await supabase
        .from("user_display_names")
        .select("firstName, lastName")
        .eq("id", otherUserId)
        .maybeSingle<{ firstName: string | null; lastName: string | null }>();

      if (cancelled) return;
      if (otherUser) {
        const name = [otherUser.firstName, otherUser.lastName].filter(Boolean).join(" ");
        setOtherName(name || DEFAULT_DISPLAY_NAME);
      }

      // Determine if the current user is the seller (listing owner)
      if (conv.productId) {
        const { data: listing } = await supabase
          .from("products")
          .select("sellerId, title, images")
          .eq("id", conv.productId)
          .maybeSingle<{ sellerId: string; title: string; images: string[] | null }>();
        if (!cancelled && listing) {
          setIsSeller(listing.sellerId === user.id);
          setProductPreview({
            title: listing.title,
            image: (listing.images ?? [])[0] ?? null,
          });
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [conversationId, user?.id, navigate]);

  // Load offers for this conversation and keep offerMap up-to-date.
  // We join the linked order so OfferBubble has the orderId it needs for
  // the "Pay Now" button without relying on message JSON.
  const loadOffers = useCallback(async () => {
    if (!conversationId || offersFeatureUnavailable) return;

    // PostgREST foreign-key join: orders.offerId → offers.id
    // `orders(id, status)` returns an array; we normalise to the first element.
    const { data: offers, error } = await supabase
      .from("offers")
      .select("id, amountPence, status, proposedById, recipientId, orders(id, status)")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === "42P01") {
        setOffersFeatureUnavailable(true);
        setOfferMap(new Map());
        return;
      }
      console.warn("mobile chat: failed to load offers:", error.message);
      return;
    }

    if (offers) {
      const mapped = (offers as Array<{
        id: string;
        amountPence: number;
        status: string;
        proposedById: string;
        recipientId: string;
        orders: Array<{ id: string; status: string }> | null;
      }>).map((o) => ({
        id:           o.id,
        amountPence:  o.amountPence,
        status:       o.status,
        proposedById: o.proposedById,
        recipientId:  o.recipientId,
        // orders is an array of rows that reference this offer; there is at
        // most one because of the unique index one_active_order_per_listing.
        orderId: (o.orders != null && Array.isArray(o.orders) && o.orders.length > 0)
          ? o.orders[0].id
          : null,
        orderStatus: (o.orders != null && Array.isArray(o.orders) && o.orders.length > 0)
          ? o.orders[0].status
          : null,
      }));
      setOfferMap(new Map(mapped.map((o) => [o.id, o])));
    }
  }, [conversationId, offersFeatureUnavailable]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  // Reload offers when an offer system message arrives (realtime)
  // handled inside the messages subscription below.

  // Load messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingMsgs(true);
      setMessages([]);
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, senderId, message, isRead, createdAt")
          .eq("conversationId", conversationId)
          .order("createdAt", { ascending: true })
          .limit(200);

        if (error) throw error;
        if (cancelled) return;
        setMessages((data as Message[]) ?? []);

        // Mark incoming as read
        await supabase
          .from("messages")
          .update({ isRead: true, readAt: new Date().toISOString() })
          .eq("conversationId", conversationId)
          .eq("receiverId", user.id)
          .eq("isRead", false);
      } catch {
        toast({ title: "Failed to load messages", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [conversationId, user?.id]);

  // Supabase Realtime
  useEffect(() => {
    if (!conversationId || !user?.id || offersFeatureUnavailable) return;

    const channel = supabase
      .channel(`mobile-chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversationId=eq.${conversationId}`,
        },
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
          // If a system message arrives (offer accepted/declined), refresh offers
          if (msg.message.startsWith('{"_t":"system"')) {
            void loadOffers();
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, user?.id, loadOffers, offersFeatureUnavailable]);

  // Offers table Realtime — catch direct status changes (accepted / declined /
  // cancelled) without relying solely on system messages.
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const offersChannel = supabase
      .channel(`chat-offers:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "offers",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; status: string };
          setOfferMap((prev) => {
            const existing = prev.get(updated.id);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(updated.id, { ...existing, status: updated.status });
            return next;
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(offersChannel); };
  }, [conversationId, user?.id, offersFeatureUnavailable]);

  // Orders table Realtime — update the Pay Now / payment-confirmed state live
  // when an order's status changes (e.g. awaiting_payment → paid after webhook).
  // Filter by buyerId so only the buyer receives events for their own orders.
  useEffect(() => {
    if (!user?.id) return;

    const ordersChannel = supabase
      .channel(`chat-orders:${user.id}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "orders",
          filter: `buyerId=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as {
            id: string;
            status: string;
            offerId: string | null;
          };
          if (!updated.offerId) return;
          // Only update if this order belongs to an offer in the current chat.
          setOfferMap((prev) => {
            const existing = prev.get(updated.offerId!);
            if (!existing || existing.orderId !== updated.id) return prev;
            const next = new Map(prev);
            next.set(updated.offerId!, { ...existing, orderStatus: updated.status });
            return next;
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(ordersChannel); };
  }, [user?.id]);

  // Supabase Presence channel — used for typing indicator only.
  // We join the channel for the conversation; each side broadcasts
  // {typing:true|false} via presenceState.
  useEffect(() => {
    if (!conversationId || !user?.id || !otherId) return;

    const presenceChannel = supabase.channel(
      `chat-presence:${conversationId}`,
      { config: { presence: { key: user.id } } },
    );

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState() as Record<
          string,
          Array<{ typing?: boolean }>
        >;
        const otherPresences = state[otherId] ?? [];
        const isTyping = otherPresences.some((p) => p.typing === true);
        setOtherTyping(isTyping);
        if (isTyping) {
          // Auto-clear after TYPING_INDICATOR_TIMEOUT_MS in case the other side disconnects silently
          if (otherTypingTimeout.current) clearTimeout(otherTypingTimeout.current);
          otherTypingTimeout.current = setTimeout(() => {
            setOtherTyping(false);
          }, TYPING_INDICATOR_TIMEOUT_MS);
        }
      })
      .subscribe();

    return () => {
      if (otherTypingTimeout.current) clearTimeout(otherTypingTimeout.current);
      void supabase.removeChannel(presenceChannel);
    };
  }, [conversationId, user?.id, otherId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect when the other side reads our last sent message.
  // We watch the Realtime UPDATE event on messages filtered by senderId so we
  // can flip `lastSentRead → true` when isRead becomes true.
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const readChannel = supabase
      .channel(`chat-read:${conversationId}:${user.id}`)
      .on(
        "postgres_changes",
        {
          event:  "UPDATE",
          schema: "public",
          table:  "messages",
          filter: `conversationId=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; senderId: string; isRead: boolean };
          if (updated.senderId === user.id && updated.isRead) {
            setLastSentRead(true);
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(readChannel); };
  }, [conversationId, user?.id]);

  // Send message
  const handleSend = async () => {
    if (!draft.trim() || !conversationId || !otherId || !user?.id) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const res = await authorizedFetch("/.netlify/functions/send-message", {
        method: "POST",
        body: JSON.stringify({ conversationId, receiverId: otherId, message: text }),
      });

      const json = await res.json() as {
        id?: string; senderId?: string; message?: string;
        isRead?: boolean; createdAt?: string; error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      // Append to local state; Realtime will also fire but dedup by id prevents duplicates.
      const msg: Message = {
        id:        json.id!,
        senderId:  json.senderId!,
        message:   json.message!,
        isRead:    json.isRead ?? false,
        createdAt: json.createdAt!,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      // Reset seen state — new message not yet read by receiver
      setLastSentRead(false);
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

  // Broadcast typing state to the Presence channel.
  // Uses a 1 s debounce so we don't spam on every keystroke.
  const typingBroadcastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    if (!conversationId || !user?.id) return;
    const channel = supabase.channel(`chat-presence:${conversationId}`);
    void channel.track({ typing: true });
    if (typingBroadcastTimeout.current) clearTimeout(typingBroadcastTimeout.current);
    typingBroadcastTimeout.current = setTimeout(() => {
      void channel.track({ typing: false });
    }, 1500);
  };

  // ── Offer action handlers ──────────────────────────────────────────────────

  const handleAcceptOffer = async (offerId: string) => {
    setActingOnOffer(offerId);
    try {
      const res = await authorizedFetch("/.netlify/functions/offer-accept", {
        method: "POST",
        body: JSON.stringify({ offerId }),
      });

      const json = await res.json() as { orderId?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      toast({ title: "Offer accepted! Buyer has been notified to pay." });
      // Track analytics event
      const acceptedOffer = offerMap.get(offerId);
      if (acceptedOffer) {
        trackOfferAccepted({ offerId, amountPence: acceptedOffer.amountPence });
      }
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

      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      toast({ title: "Offer declined." });
      void loadOffers();
    } catch (err) {
      toast({ title: "Failed to decline offer", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActingOnOffer(null);
    }
  };

  const handlePayNow = async (orderId: string) => {
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

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: "100dvh",
      }}
    >
      {/* Sub-header — paddingTop includes safe-area-inset-top so the background
          fills the status-bar area and content starts cleanly below it. */}
      <div
        className="border-b border-white/10 shrink-0"
        style={{
          background: "rgba(11,15,26,0.97)",
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0",
        }}
      >
        {/* Row 1: back + name + offer button */}
        <div className="flex items-center gap-3 px-4 pb-3">
          <button
            onClick={() => navigate("/inbox")}
            className="text-white/80 hover:text-white transition-colors p-1 -ml-1"
            aria-label="Back to Inbox"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{otherName}</p>
            {convMeta?.subject && !productPreview && (
              <p className="text-xs text-primary/70 truncate">{convMeta.subject}</p>
            )}
          </div>
          {/* Make Offer button — buyers only (not the listing seller) */}
          {otherId && !isSeller && (
            <button
              onClick={() => setOfferOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors"
              aria-label="Make an offer"
            >
              <Tag className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Offer</span>
            </button>
          )}
        </div>

        {/* Row 2: product preview strip (when conversation is linked to a listing) */}
        {productPreview && (
          <div
            className="flex items-center gap-2 px-4 pb-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "10px",
            }}
          >
            {productPreview.image ? (
              <img
                src={productPreview.image}
                alt={productPreview.title}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  flexShrink: 0,
                  background: "rgba(26,26,46,1)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Tag className="h-4 w-4 text-white/30" />
              </div>
            )}
            <p
              className="text-xs text-white/70 truncate"
              style={{ flex: 1, minWidth: 0, fontWeight: 500 }}
            >
              {productPreview.title}
            </p>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loadingMsgs ? (
          <div className="space-y-3 pt-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-10 rounded-2xl bg-white/5 animate-pulse max-w-[65%] ${i % 2 === 0 ? "ml-auto" : ""}`}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Send className="h-6 w-6 text-white/20" />
            </div>
            <p className="text-sm text-white/40">No messages yet. Say hello! 👋</p>
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
                  amountPence={parsed.amount_pence}
                />
              );
            }

            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                {parsed.type === "offer" ? (
                  <OfferBubble
                    amount_pence={parsed.amount_pence ?? 0}
                    offerId={parsed.offerId}
                    isMine={isMine}
                    isSeller={isSeller}
                    productTitle={parsed.productTitle}
                    offerRecord={parsed.offerId ? offerMap.get(parsed.offerId) ?? null : null}
                    onAccept={parsed.offerId && actingOnOffer !== parsed.offerId
                      ? () => void handleAcceptOffer(parsed.offerId!)
                      : undefined}
                    onDecline={parsed.offerId && actingOnOffer !== parsed.offerId
                      ? () => void handleDeclineOffer(parsed.offerId!)
                      : undefined}
                    onPayNow={(() => {
                      // Source of truth for orderId is the offers table (via
                      // offerRecord.orderId from the orders FK join), not the
                      // message JSON which never contains orderId.
                      const rec = parsed.offerId ? offerMap.get(parsed.offerId) : undefined;
                      const oid = rec?.orderId;
                      return oid ? () => void handlePayNow(oid) : undefined;
                    })()}
                  />
                ) : (
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "bg-primary text-background rounded-br-sm"
                        : "bg-white/10 text-white rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {parsed.text}
                    </p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-background/60" : "text-white/40"}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator + seen receipt */}
      <div className="shrink-0 px-4 h-5 flex items-center gap-3">
        {otherTyping && (
          <div className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/40"
                  style={{ animation: `bounce 1.2s infinite ${i * 0.2}s` }}
                />
              ))}
            </span>
            <span className="text-[11px] text-white/40">{otherName} is typing…</span>
          </div>
        )}
        {!otherTyping && lastSentRead && (
          <p className="text-[11px] text-white/35 ml-auto">Seen ✓</p>
        )}
      </div>

      {/* Compose bar */}
      <div
        className="shrink-0 px-4 py-3 border-t border-white/10"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
          background: "rgba(11,15,26,0.97)",
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 text-white placeholder:text-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/60 max-h-32"
            style={{ lineHeight: "1.4" }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 text-background" />
          </button>
        </div>
      </div>

      {/* Make Offer Sheet — buyers only */}
      {otherId && !isSeller && (
        <MakeOfferSheet
          open={offerOpen}
          onOpenChange={setOfferOpen}
          conversationId={conversationId ?? ""}
          receiverId={otherId}
          productTitle={convMeta?.subject ?? undefined}
        />
      )}
    </div>
  );
}
