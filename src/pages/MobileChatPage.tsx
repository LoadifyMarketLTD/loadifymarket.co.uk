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
import { toast } from "@/hooks/use-toast";
import MakeOfferSheet from "@/components/MakeOfferSheet";

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
}

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
    accepted:  "text-green-400",
    declined:  "text-red-400",
    expired:   "text-white/30",
    cancelled: "text-white/30",
  };

  return (
    <div
      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
        isMine
          ? "bg-[#FBBF24]/15 border border-[#FBBF24]/30 rounded-br-sm"
          : "bg-[#FBBF24]/10 border border-[#FBBF24]/20 rounded-bl-sm"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Tag className="h-3.5 w-3.5 text-[#FBBF24]" />
        <span className="text-xs font-semibold text-[#FBBF24] uppercase tracking-wide">Offer</span>
      </div>
      {productTitle && (
        <p className="text-xs text-white/50 mb-1 truncate">{productTitle}</p>
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
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-semibold active:bg-green-500/30 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            onClick={onDecline}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold active:bg-red-500/30 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      )}

      {/* Buyer: Pay Now button for accepted offers */}
      {!isSeller && isMine && status === "accepted" && (
        <button
          onClick={onPayNow}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FBBF24] text-[#020617] text-sm font-bold active:bg-[#F59E0B] transition-colors"
        >
          <CreditCard className="h-4 w-4" />
          Pay Now
        </button>
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
        <span className="text-xs text-white/60">{info.text}</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();

  const navigate = useNavigate();
  const { user, isLoading } = useAuthStore();

  const [convMeta, setConvMeta] = useState<ConversationMeta | null>(null);
  const [otherName, setOtherName] = useState<string>("…");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  // Map of offerId → OfferRecord for live status display
  const [offerMap, setOfferMap] = useState<Map<string, OfferRecord>>(new Map());
  // True when the current user is the seller (listing owner) in this conversation
  const [isSeller, setIsSeller] = useState(false);
  const [actingOnOffer, setActingOnOffer] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true, state: { from: `/inbox/${conversationId ?? ""}` } });
    }
  }, [user, isLoading, navigate, conversationId]);

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
        .from("users")
        .select("firstName, lastName, email")
        .eq("id", otherUserId)
        .maybeSingle<{ firstName: string | null; lastName: string | null; email: string }>();

      if (cancelled) return;
      if (otherUser) {
        const name = [otherUser.firstName, otherUser.lastName].filter(Boolean).join(" ");
        setOtherName(name || otherUser.email);
      }

      // Determine if the current user is the seller (listing owner)
      if (conv.productId) {
        const { data: listing } = await supabase
          .from("products")
          .select("sellerId")
          .eq("id", conv.productId)
          .maybeSingle<{ sellerId: string }>();
        if (!cancelled && listing) {
          setIsSeller(listing.sellerId === user.id);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [conversationId, user?.id, navigate]);

  // Load offers for this conversation and keep offerMap up-to-date
  const loadOffers = useCallback(async () => {
    if (!conversationId) return;
    const { data: offers } = await supabase
      .from("offers")
      .select("id, amountPence, status, proposedById, recipientId")
      .eq("conversationId", conversationId)
      .order("createdAt", { ascending: false })
      .limit(50);

    if (offers) {
      setOfferMap(new Map(
        (offers as OfferRecord[]).map((o) => [o.id, o]),
      ));
    }
  }, [conversationId]);

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
    if (!conversationId || !user?.id) return;

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
  }, [conversationId, user?.id, loadOffers]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!draft.trim() || !conversationId || !otherId || !user?.id) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversationId,
          senderId: user.id,
          receiverId: otherId,
          message: text,
        })
        .select("id, senderId, message, isRead, createdAt")
        .single();

      if (error) throw error;
      setMessages((prev) => [...prev, data as Message]);
    } catch {
      setDraft(text);
      toast({ title: "Failed to send message", variant: "destructive" });
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

  // ── Offer action handlers ──────────────────────────────────────────────────

  const handleAcceptOffer = async (offerId: string) => {
    setActingOnOffer(offerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/.netlify/functions/offer-accept", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ offerId }),
      });

      const json = await res.json() as { orderId?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);

      toast({ title: "Offer accepted! Buyer has been notified to pay." });
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/.netlify/functions/offer-decline", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const res = await fetch("/.netlify/functions/checkout-from-offer", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId }),
      });

      const json = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      if (!json.checkoutUrl) throw new Error("No checkout URL returned");

      window.location.href = json.checkoutUrl;
    } catch (err) {
      toast({ title: "Failed to start checkout", description: (err as Error).message, variant: "destructive" });
    }
  };

  return (
    <div
      className="flex flex-col bg-[#020617]"
      style={{
        height: "100dvh",
        paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))",
      }}
    >
      {/* Sub-header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0"
        style={{ background: "rgba(11,15,26,0.97)" }}
      >
        <button
          onClick={() => navigate("/inbox")}
          className="text-white/60 hover:text-white transition-colors p-1 -ml-1"
          aria-label="Back to Inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{otherName}</p>
          {convMeta?.subject && (
            <p className="text-xs text-[#FBBF24]/70 truncate">{convMeta.subject}</p>
          )}
        </div>
        {/* Make Offer button */}
        {otherId && (
          <button
            onClick={() => setOfferOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#FBBF24]/40 text-[#FBBF24] text-xs font-semibold hover:bg-[#FBBF24]/10 transition-colors"
            aria-label="Make an offer"
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Offer</span>
          </button>
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
                    onPayNow={parsed.orderId
                      ? () => void handlePayNow(parsed.orderId!)
                      : undefined}
                  />
                ) : (
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "bg-[#FBBF24] text-[#020617] rounded-br-sm"
                        : "bg-white/10 text-white rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {parsed.text}
                    </p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-[#020617]/60" : "text-white/40"}`}>
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
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 text-white placeholder:text-white/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#FBBF24]/60 max-h-32"
            style={{ lineHeight: "1.4" }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full bg-[#FBBF24] flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            aria-label="Send message"
          >
            <Send className="h-4 w-4 text-[#020617]" />
          </button>
        </div>
      </div>

      {/* Make Offer Sheet */}
      {otherId && (
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
