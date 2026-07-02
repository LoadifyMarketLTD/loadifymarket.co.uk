import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";

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

function parseMessage(raw: unknown):
  | { type: "text"; text: string }
  | { type: "system"; event?: string } {
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
      // ignore invalid JSON; treat as plain text
    }
  }
  return { type: "text", text: rawText };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SystemEventCard({ event }: { event?: string }) {
  if (event !== "listing_unavailable") return null;

  return (
    <div className="flex justify-center">
      <div className="max-w-[80%] rounded-2xl px-4 py-2.5 bg-white/5 border border-white/10 text-center">
        <span className="mr-1">🔒</span>
        <span className="text-xs text-white/75">This listing has been purchased. It is no longer available.</span>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileChatPage() {
  const { conversationId } = useParams<{ conversationId: string }>();

  const navigate = useNavigate();
  const location = useLocation();
  const showDebug = new URLSearchParams(location.search).get("debug") === "1" || import.meta.env.DEV;
  const { user, isLoading } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);

  const [convMeta, setConvMeta] = useState<ConversationMeta | null>(null);
  const [otherName, setOtherName] = useState<string>("…");
  const [otherId, setOtherId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMsgs, setLoadingMsgs] = useState(true);
  const [sending, setSending] = useState(false);
  // True when the current user is the seller (listing owner) in this conversation
  const [isSeller, setIsSeller] = useState(false);
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
      // Force-verify auth session before RLS-protected fetch.
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      console.info("[MobileChat] session check", {
        conversationId,
        userId: user?.id,
        hasSession: !!session,
        sessionMatchesStore: session?.user?.id === user?.id,
        authError: authError?.message ?? null,
      });
      if (!session?.user) {
        console.warn("[MobileChat] No valid session during conversation load", {
          conversationId,
          userId: user?.id,
          authError: authError?.message ?? null,
        });
        if (!cancelled) navigate("/inbox", { replace: true });
        return;
      }
      // Fetch conversation row
      const { data: conv, error } = await supabase
        .from("conversations")
        .select("id, user1Id, user2Id, subject, productId")
        .eq("id", conversationId)
        .maybeSingle<ConversationMeta>();

      if (error || !conv) {
        console.warn("[MobileChat] Conversation not found or error", {
          conversationId,
          userId: user?.id,
          error: error?.message ?? null,
        });
        if (!cancelled) navigate("/inbox", { replace: true });
        return;
      }
      // Verify the current user is actually a participant (belt-and-suspenders
      // on top of Supabase RLS, in case of any stale session edge-case)
      if (conv.user1Id !== user.id && conv.user2Id !== user.id) {
        console.warn("[MobileChat] User is not a participant in this conversation", {
          conversationId,
          userId: user.id,
          user1Id: conv.user1Id,
          user2Id: conv.user2Id,
        });
        if (!cancelled) navigate("/inbox", { replace: true });
        return;
      }
      if (cancelled) return;
      console.info("[MobileChat] Conversation loaded", {
        conversationId,
        userId: user?.id,
        user1Id: conv.user1Id,
        user2Id: conv.user2Id,
      });
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

  // Load messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingMsgs(true);
      setMessages([]);
      console.info("[MobileChat] loadMessages:start", {
        conversationId,
        userId: user?.id,
      });
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, senderId, message, isRead, createdAt")
          .eq("conversationId", conversationId)
          .order("createdAt", { ascending: true })
          .limit(200);

        if (error) throw error;
        if (cancelled) return;
        const msgs = (data as Message[]) ?? [];
        console.info("[MobileChat] loadMessages:result", {
          conversationId,
          userId: user?.id,
          count: msgs.length,
        });
        setMessages(msgs);

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

  // Timeout protection for message loading (prevents infinite spinner)
  useEffect(() => {
    if (!loadingMsgs) return;
    const timeout = setTimeout(() => {
      console.warn("[MobileChat] Message loading timeout — forcing off after 8s", {
        conversationId,
        userId: user?.id,
      });
      setLoadingMsgs(false);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loadingMsgs, conversationId, user?.id]);

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

  return (
    <div
      className="flex flex-col bg-background"
      data-is-seller={isSeller ? "true" : "false"}
      style={{
        height: "100dvh",
      }}
    >
      {/* Sub-header — paddingTop includes safe-area-inset-top so the background
          fills the status-bar area and content starts cleanly below it. */}
      <div
        className="border-b border-white/10 shrink-0 bg-background/[0.97]"
        style={{
          paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "0",
        }}
      >
        {/* Row 1: back + name */}
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
                  objectFit: "cover" as const,
                  flexShrink: 0,
                }}
                className="bg-elevated"
              />
            ) : (
              <div
                className="bg-white/[0.05] flex items-center justify-center"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  flexShrink: 0,
                }}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-white/30">
                  Item
                </span>
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
              return <SystemEventCard key={msg.id} event={parsed.event} />;
            }

            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMine
                      ? "bg-primary text-black rounded-br-sm"
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

      {/* Debug state panel — activate with ?debug=1 in the URL */}
      {showDebug && (
        <div className="shrink-0 px-3 py-1 bg-yellow-500/10 border-t border-yellow-500/20 text-[10px] font-mono text-yellow-400">
          uid: {user?.id ?? "—"} | conv: {conversationId ?? "—"} | msgs: {messages.length}
        </div>
      )}

      {/* Compose bar */}
      <div
        className="shrink-0 px-4 py-3 border-t border-white/10 bg-background/[0.97]"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
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

    </div>
  );
}
