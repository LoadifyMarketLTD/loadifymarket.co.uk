import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Ban, MoreVertical, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import { toast } from "@/hooks/use-toast";
import { authorizedFetch } from "@/lib/authorizedFetch";
import SafetyReportDialog from "@/components/safety/SafetyReportDialog";
import officialLoadifyMarketLogo from "../../LOADIFY_MARKET_Master_Vector_WhiteGold.svg";

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

interface BlockStatusResponse {
  available?: boolean;
  blockedByMe?: boolean;
  messagingBlocked?: boolean;
  error?: string;
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
      <div className="max-w-[84%] rounded-2xl border border-[#D8E0EA] bg-white px-4 py-2.5 text-center shadow-sm">
        <span className="mr-1">🔒</span>
        <span className="text-xs font-medium text-[#667085]">This listing has been purchased. It is no longer available.</span>
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
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [blockFeatureAvailable, setBlockFeatureAvailable] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [messagingBlocked, setMessagingBlocked] = useState(false);
  const [blockUpdating, setBlockUpdating] = useState(false);

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

  useEffect(() => {
    if (!otherId || !user?.id) return;
    let cancelled = false;

    void authorizedFetch("/.netlify/functions/user-block", {
      method: "POST",
      body: JSON.stringify({ userId: otherId, action: "status" }),
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({})) as BlockStatusResponse;
      if (cancelled || !response.ok || payload.available !== true) return;
      setBlockFeatureAvailable(true);
      setBlockedByMe(payload.blockedByMe === true);
      setMessagingBlocked(payload.messagingBlocked === true);
    }).catch(() => {
      // The feature remains hidden until its database migration is available.
    });

    return () => { cancelled = true; };
  }, [otherId, user?.id]);

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

  const handleToggleBlock = async () => {
    if (!otherId || blockUpdating) return;
    setBlockUpdating(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/user-block", {
        method: "POST",
        body: JSON.stringify({ userId: otherId, action: blockedByMe ? "unblock" : "block" }),
      });
      const payload = await response.json().catch(() => ({})) as BlockStatusResponse;
      if (!response.ok) throw new Error(payload.error || "Unable to update conversation safety.");
      setBlockFeatureAvailable(payload.available === true);
      setBlockedByMe(payload.blockedByMe === true);
      setMessagingBlocked(payload.messagingBlocked === true);
      setSafetyOpen(false);
      toast({
        title: payload.blockedByMe ? "User blocked" : "User unblocked",
        description: payload.blockedByMe
          ? "Marketplace messaging between these accounts is now blocked."
          : payload.messagingBlocked
            ? "Your block was removed, but messaging remains unavailable."
            : "Marketplace messaging is available again.",
      });
    } catch (err) {
      toast({ title: "Safety action failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setBlockUpdating(false);
    }
  };

  // Send message
  const handleSend = async () => {
    if (!draft.trim() || !conversationId || !otherId || !user?.id) return;
    if (messagingBlocked) {
      toast({ title: "Messaging unavailable", description: "This conversation is blocked for marketplace messaging.", variant: "destructive" });
      return;
    }
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
      className="flex flex-col bg-[#F3F6FA] text-[#0A234F]"
      data-is-seller={isSeller ? "true" : "false"}
      style={{ height: "100dvh" }}
    >
      <header
        className="shrink-0 bg-[#0A234F] text-white shadow-[0_5px_22px_rgba(10,35,79,0.18)]"
        style={{ paddingTop: "calc(0.55rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex items-center gap-3 px-4 pb-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/inbox")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
            aria-label="Back to Inbox"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <img
            src={officialLoadifyMarketLogo}
            alt="Loadify Market"
            className="mr-auto h-[36px] w-auto max-w-[170px] object-contain object-left"
          />
          {blockFeatureAvailable ? (
            <button
              type="button"
              onClick={() => setSafetyOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
              aria-label="Conversation safety"
            >
              <MoreVertical className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="px-4 pb-3 pt-1">
          <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">
            {isSeller ? "Buyer" : "Seller"}
          </p>
          <p className="m-0 mt-0.5 truncate text-[18px] font-black tracking-[-0.02em] text-white">
            {otherName}
          </p>
          {convMeta?.subject && !productPreview ? (
            <p className="m-0 mt-0.5 truncate text-[11px] font-medium text-white/65">{convMeta.subject}</p>
          ) : null}
        </div>

        {productPreview ? (
          <button
            type="button"
            onClick={() => convMeta?.productId && navigate(`/product/${convMeta.productId}`)}
            className="flex w-full items-center gap-3 border-0 border-t border-white/10 bg-white/[0.06] px-4 py-3 text-left"
            aria-label={`Open listing: ${productPreview.title}`}
          >
            {productPreview.image ? (
              <img
                src={productPreview.image}
                alt={productPreview.title}
                className="h-12 w-12 shrink-0 rounded-[12px] border border-white/20 object-cover"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-white/15 bg-white/10 text-[9px] font-black uppercase tracking-wide text-white/60">
                Item
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-[#F5A300]">Listing</span>
              <span className="mt-0.5 block truncate text-[13px] font-bold text-white">{productPreview.title}</span>
            </span>
          </button>
        ) : null}
      </header>

      {blockFeatureAvailable && safetyOpen ? (
        <div className="fixed inset-0 z-[10020]">
          <button type="button" aria-label="Close conversation safety" onClick={() => setSafetyOpen(false)} className="absolute inset-0 border-0 bg-[#0A234F]/40" />
          <section
            className="absolute bottom-0 left-0 right-0 rounded-t-[24px] bg-white px-5 pt-5 shadow-[0_-18px_45px_rgba(10,35,79,0.18)]"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
            aria-label="Conversation safety options"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D8E0EA]" aria-hidden="true" />
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF0EE] text-[#A53A2A]">
                <Ban className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="m-0 text-[16px] font-black text-[#0A234F]">Conversation safety</h2>
                <p className="m-0 mt-1 text-[11px] leading-[1.55] text-[#667085]">Existing messages remain visible. Blocking prevents marketplace messages between these two accounts until the block is removed.</p>
              </div>
            </div>
            <button
              type="button"
              disabled={blockUpdating}
              onClick={() => void handleToggleBlock()}
              className={`mt-5 flex min-h-12 w-full items-center justify-center rounded-[14px] px-4 text-[12px] font-extrabold disabled:opacity-50 ${blockedByMe ? "border border-[#0A234F]/10 bg-white text-[#0A234F]" : "border-0 bg-[#A53A2A] text-white"}`}
            >
              {blockUpdating ? "Updating..." : blockedByMe ? `Unblock ${otherName}` : `Block ${otherName}`}
            </button>
            {otherId ? (
              <SafetyReportDialog
                targetType="user"
                targetId={otherId}
                context="message"
                contextId={conversationId}
                triggerLabel={`Report ${otherName}`}
                className="mt-2 min-h-11 w-full rounded-[13px] border border-[#A53A2A]/15 bg-[#FFF7F5] text-[11px] font-extrabold text-[#A53A2A]"
              />
            ) : null}
            <button type="button" onClick={() => setSafetyOpen(false)} className="mt-2 min-h-11 w-full rounded-[13px] border-0 bg-[#F3F6FA] text-[11px] font-extrabold text-[#667085]">Cancel</button>
          </section>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-[#F3F6FA] px-4 py-4">
        <div className="space-y-3">
          {loadingMsgs ? (
            <div className="space-y-3 pt-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-11 max-w-[68%] animate-pulse rounded-2xl bg-[#DDE5EE] ${i % 2 === 0 ? "ml-auto" : ""}`}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex min-h-[46vh] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                <Send className="h-6 w-6 text-[#98A2B3]" aria-hidden="true" />
              </div>
              <p className="m-0 text-[14px] font-extrabold text-[#0A234F]">No messages yet</p>
              <p className="m-0 mt-1 text-[12px] text-[#667085]">Start the conversation with this {isSeller ? "buyer" : "seller"}.</p>
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
                    className={`max-w-[78%] rounded-[18px] px-4 py-2.5 shadow-sm ${
                      isMine
                        ? "rounded-br-[5px] bg-[#2F6FED] text-white"
                        : "rounded-bl-[5px] border border-[#D8E0EA] bg-white text-[#0A234F]"
                    }`}
                  >
                    <p className="m-0 whitespace-pre-wrap break-words text-[14px] leading-relaxed">
                      {parsed.text}
                    </p>
                    <p className={`m-0 mt-1 text-[10px] font-medium ${isMine ? "text-white/70" : "text-[#98A2B3]"}`}>
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex h-6 shrink-0 items-center gap-3 bg-[#F3F6FA] px-4">
        {otherTyping ? (
          <div className="flex items-center gap-1.5">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[#0A234F]/35"
                  style={{ animation: `bounce 1.2s infinite ${i * 0.2}s` }}
                />
              ))}
            </span>
            <span className="text-[11px] font-medium text-[#667085]">{otherName} is typing…</span>
          </div>
        ) : null}
        {!otherTyping && lastSentRead ? (
          <p className="ml-auto m-0 text-[11px] font-medium text-[#667085]">Seen ✓</p>
        ) : null}
      </div>

      {showDebug ? (
        <div className="shrink-0 border-t border-yellow-500/20 bg-yellow-50 px-3 py-1 text-[10px] font-mono text-yellow-800">
          uid: {user?.id ?? "—"} | conv: {conversationId ?? "—"} | msgs: {messages.length}
        </div>
      ) : null}

      <div
        className="shrink-0 border-t border-[#0A234F]/10 bg-white px-4 py-3 shadow-[0_-4px_18px_rgba(10,35,79,0.05)]"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {messagingBlocked ? (
          <div className="mb-2 rounded-[12px] border border-[#0A234F]/[0.08] bg-[#F3F6FA] px-3 py-2.5 text-[11px] font-semibold leading-[1.45] text-[#667085]">
            {blockedByMe ? "You blocked this user. Unblock them from Conversation safety to send messages again." : "Messaging is unavailable for this conversation."}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            disabled={messagingBlocked}
            placeholder={messagingBlocked ? "Messaging unavailable" : "Type a message..."}
            rows={1}
            className="max-h-32 flex-1 resize-none rounded-[18px] border border-[#C9D3E0] bg-[#F7F9FC] px-4 py-2.5 text-[14px] text-[#0A234F] placeholder:text-[#98A2B3] focus:border-[#2F6FED] focus:outline-none focus:ring-2 focus:ring-[#2F6FED]/15"
            style={{ lineHeight: "1.4" }}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={messagingBlocked || !draft.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0A234F] text-white shadow-sm transition-opacity disabled:opacity-35"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
