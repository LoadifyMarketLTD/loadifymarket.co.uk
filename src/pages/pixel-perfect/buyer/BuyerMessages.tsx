import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface Conversation {
  id: string;
  subject: string | null;
  lastMessageAt: string;
  isArchived: boolean;
  user1Id: string;
  user2Id: string;
  other: Participant;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return d.toLocaleDateString("en-GB", { weekday: "short" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function participantName(p: Participant) {
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
  return name || p.email;
}

const BuyerMessages = () => {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  // ── Fetch conversation list ──────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingConvs(true);
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select(
            "id, subject, lastMessageAt, isArchived, user1Id, user2Id"
          )
          .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
          .eq("isArchived", false)
          .order("lastMessageAt", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (cancelled) return;

        // Resolve the "other" participant's profile for each conversation.
        const rows = (data ?? []) as Omit<Conversation, "other" | "unreadCount">[];
        const otherIds = rows.map((r) =>
          r.user1Id === user.id ? r.user2Id : r.user1Id
        );
        const uniqueIds = [...new Set(otherIds)];

        const userMap: Map<string, Participant> = new Map();
        if (uniqueIds.length > 0) {
          const { data: users } = await supabase
            .from("users")
            .select("id, firstName, lastName, email")
            .in("id", uniqueIds);
          (users ?? []).forEach((u: Participant) => userMap.set(u.id, u));
        }

        // Count unread messages per conversation.
        const { data: unreadRows } = await supabase
          .from("messages")
          .select("conversationId")
          .eq("receiverId", user.id)
          .eq("isRead", false);

        const unreadMap = new Map<string, number>();
        (unreadRows ?? []).forEach((r: { conversationId: string }) => {
          unreadMap.set(r.conversationId, (unreadMap.get(r.conversationId) ?? 0) + 1);
        });

        const enriched: Conversation[] = rows.map((r) => {
          const otherId = r.user1Id === user.id ? r.user2Id : r.user1Id;
          return {
            ...r,
            other: userMap.get(otherId) ?? {
              id: otherId,
              firstName: null,
              lastName: null,
              email: "Unknown",
            },
            unreadCount: unreadMap.get(r.id) ?? 0,
          };
        });

        setConversations(enriched);
      } catch {
        toast({ title: "Failed to load conversations", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingConvs(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Fetch messages for selected conversation ─────────────────────────────
  useEffect(() => {
    if (!selectedId || !user?.id) return;
    let cancelled = false;

    const load = async () => {
      setLoadingMsgs(true);
      setMessages([]);
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

        // Mark incoming messages as read.
        await supabase
          .from("messages")
          .update({ isRead: true, readAt: new Date().toISOString() })
          .eq("conversationId", selectedId)
          .eq("receiverId", user.id)
          .eq("isRead", false);

        // Clear unread count locally.
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c))
        );
      } catch {
        toast({ title: "Failed to load messages", variant: "destructive" });
      } finally {
        if (!cancelled) setLoadingMsgs(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [selectedId, user?.id]);

  // ── Scroll to bottom on new messages ────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || !selectedId || !selectedConv || !user?.id) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversationId: selectedId,
          senderId: user.id,
          receiverId: selectedConv.other.id,
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

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

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
              <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-medium">
                {totalUnread}
              </span>
            )}
          </h1>
        </div>

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
              When you contact a seller, your conversations will appear here.
            </p>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-border">
            {conversations.map((conv) => (
              <li key={conv.id}>
                <button
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted ${
                    selectedId === conv.id ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-muted-foreground" />
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
                    {conv.subject && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.subject}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
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
            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {participantName(selectedConv.other)}
              </p>
              {selectedConv.subject && (
                <p className="text-xs text-muted-foreground truncate">
                  {selectedConv.subject}
                </p>
              )}
            </div>
          </div>

          {/* Messages */}
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
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        isMine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
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

          {/* Compose */}
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
};

export default BuyerMessages;
