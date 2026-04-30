/**
 * MobileChatPage — /inbox/:conversationId
 *
 * Full-screen chat thread for a single conversation.
 * Features:
 *   - Message bubbles (plain text + special offer card)
 *   - Supabase Realtime for live messages
 *   - Send text message
 *   - "Make Offer" FAB → MakeOfferSheet
 *   - Back button → /inbox
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Tag } from "lucide-react";
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

/** Parse a message string that may be a JSON-encoded offer */
function parseMessage(raw: string): { type: "text" | "offer"; text?: string; amount_pence?: number; productTitle?: string } {
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed._t === "offer" && typeof parsed.amount_pence === "number") {
        return {
          type: "offer",
          amount_pence: parsed.amount_pence as number,
          productTitle: typeof parsed.productTitle === "string" ? parsed.productTitle : undefined,
        };
      }
    } catch {}
  }
  return { type: "text", text: raw };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OfferBubble({ amount_pence, isMine, productTitle }: { amount_pence: number; isMine: boolean; productTitle?: string }) {
  const pounds = (amount_pence / 100).toFixed(2);
  return (
    <div
      className={`rounded-2xl px-4 py-3 max-w-[75%] ${
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
      <p className="text-[11px] text-white/40 mt-1">
        {isMine ? "You offered" : "Offer received"} · Pending
      </p>
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login", { replace: true, state: { from: `/inbox/${conversationId ?? ""}` } });
    }
  }, [user, isLoading, navigate, conversationId]);

  // Load conversation metadata + other participant name
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
    };

    load();
    return () => { cancelled = true; };
  }, [conversationId, user?.id, navigate]);

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
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, user?.id]);

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

            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                {parsed.type === "offer" ? (
                  <OfferBubble
                    amount_pence={parsed.amount_pence!}
                    isMine={isMine}
                    productTitle={parsed.productTitle}
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
