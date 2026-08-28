import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Search, SquarePen, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { toast } from '@/hooks/use-toast';
import AppBottomNav from '@/mobile-web-clone/AppBottomNav';

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

type Tab = 'all' | 'unread' | 'buyers' | 'sellers';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'buyers', label: 'Buyers' },
  { id: 'sellers', label: 'Sellers' },
];

function participantName(participant: Participant): string {
  const name = [participant.firstName, participant.lastName].filter(Boolean).join(' ');
  return name || 'Loadify User';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'short' });
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function previewText(raw: string | null): string {
  if (!raw) return '';
  if (raw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed._t === 'offer') return '💬 Offer';
      if (parsed._t === 'system' && parsed.event === 'listing_unavailable') return '🔒 Listing unavailable';
    } catch {
      // Show the plain message if it is not valid system JSON.
    }
  }
  return raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
}

/** Browser-only clone of the installed app Inbox screen. */
export default function MobileWebInboxPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('conversations')
        .select('id, subject, lastMessageAt, isArchived, user1Id, user2Id, productId')
        .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
        .not('isArchived', 'is', true)
        .order('lastMessageAt', { ascending: false })
        .limit(100);
      if (error) throw error;

      const conversationRows = (rows ?? []) as ConversationRow[];
      const otherIds = [...new Set(conversationRows.map((row) => row.user1Id === user.id ? row.user2Id : row.user1Id))];
      const userMap = new Map<string, Participant>();
      if (otherIds.length > 0) {
        const { data: users } = await supabase.from('user_display_names').select('id, firstName, lastName').in('id', otherIds);
        (users ?? []).forEach((participant: Participant) => userMap.set(participant.id, participant));
      }

      const { data: unreadRows } = await supabase
        .from('messages')
        .select('conversationId')
        .eq('receiverId', user.id)
        .eq('isRead', false);
      const unreadMap = new Map<string, number>();
      (unreadRows ?? []).forEach((row: { conversationId: string }) => {
        unreadMap.set(row.conversationId, (unreadMap.get(row.conversationId) ?? 0) + 1);
      });

      const conversationIds = conversationRows.map((row) => row.id);
      const lastMessageMap = new Map<string, string>();
      const lastSenderMap = new Map<string, string>();
      if (conversationIds.length > 0) {
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('conversationId, message, senderId')
          .in('conversationId', conversationIds)
          .order('createdAt', { ascending: false })
          .limit(Math.max(conversationIds.length * 5, 20));
        (lastMessages ?? []).forEach((message: { conversationId: string; message: string; senderId: string }) => {
          if (!lastMessageMap.has(message.conversationId)) {
            lastMessageMap.set(message.conversationId, message.message);
            lastSenderMap.set(message.conversationId, message.senderId);
          }
        });
      }

      const productIds = [...new Set(conversationRows.map((row) => row.productId).filter((value): value is string => Boolean(value)))];
      const productImageMap = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabase.from('products').select('id, images').in('id', productIds);
        (products ?? []).forEach((product: { id: string; images?: string[] | null }) => {
          const firstImage = (product.images ?? [])[0];
          if (firstImage) productImageMap.set(product.id, firstImage);
        });
      }

      setConversations(conversationRows.map((row) => {
        const otherId = row.user1Id === user.id ? row.user2Id : row.user1Id;
        return {
          ...row,
          other: userMap.get(otherId) ?? { id: otherId, firstName: null, lastName: null },
          unreadCount: unreadMap.get(row.id) ?? 0,
          lastMessagePreview: lastMessageMap.get(row.id) ?? null,
          lastMessageSenderId: lastSenderMap.get(row.id) ?? null,
          productTitle: row.subject ?? null,
          productImage: row.productId ? (productImageMap.get(row.productId) ?? null) : null,
        };
      }));
    } catch {
      toast({ title: 'Failed to load conversations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`mobile-web-clone-inbox:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiverId=eq.${user.id}` }, () => { void loadConversations(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `senderId=eq.${user.id}` }, () => { void loadConversations(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, user?.id]);

  const unreadCount = conversations.filter((conversation) => conversation.unreadCount > 0).length;
  const filtered = useMemo(() => {
    const byTab = conversations.filter((conversation) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'unread') return conversation.unreadCount > 0;
      if (activeTab === 'buyers') return conversation.lastMessageSenderId !== user?.id;
      return conversation.lastMessageSenderId === user?.id;
    });
    if (!searchQuery.trim()) return byTab;
    const query = searchQuery.toLowerCase();
    return byTab.filter((conversation) =>
      participantName(conversation.other).toLowerCase().includes(query) ||
      (conversation.productTitle ?? '').toLowerCase().includes(query),
    );
  }, [activeTab, conversations, searchQuery, user?.id]);

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: '#07080B', color: '#FFFFFF' }}>
      <div style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 40, background: 'rgba(7,8,11,0.97)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'calc(1rem + env(safe-area-inset-top,0px)) 16px 10px' }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#FFFFFF' }}>Messages</h1>
          <button onClick={() => navigate('/catalog')} aria-label="New message" style={{ width: 40, height: 40, borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SquarePen style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.75)' }} aria-hidden="true" />
          </button>
        </div>

        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '10px 14px' }}>
            <Search style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ flex: 1, background: 'transparent', border: 0, outline: 0, fontSize: 14, color: '#FFFFFF' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const badge = tab.id === 'unread' ? unreadCount : 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{ padding: '10px 18px', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#F5B942' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', background: 'transparent', border: 0, borderBottom: active ? '2px solid #F5B942' : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {tab.label}
                {badge > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#F5B942', color: '#0B0B0F', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{badge > 9 ? '9+' : badge}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, paddingBottom: 'calc(80px + env(safe-area-inset-bottom,0px))' }}>
        {loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, index) => <div key={index} className="animate-pulse" style={{ height: 72, borderRadius: 12, background: 'rgba(255,255,255,0.05)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <MessageSquare style={{ width: 28, height: 28, color: 'rgba(255,255,255,0.30)' }} aria-hidden="true" />
            </div>
            <p style={{ margin: '0 0 4px', color: '#FFFFFF', fontSize: 16, fontWeight: 600 }}>{searchQuery ? 'No results found' : 'No conversations yet'}</p>
            <p style={{ margin: '0 0 24px', color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>{searchQuery ? 'Try a different search term.' : 'Contact a seller from a product page to start chatting.'}</p>
            {!searchQuery && <Link to="/catalog" style={{ padding: '10px 20px', borderRadius: 999, background: '#F5B942', color: '#0B0B0F', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Browse listings</Link>}
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filtered.map((conversation) => (
              <li key={conversation.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={() => navigate(`/inbox/${conversation.id}`)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 0, textAlign: 'left' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.60)' }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: conversation.unreadCount > 0 ? 700 : 600, color: conversation.unreadCount > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.80)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{participantName(conversation.other)}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', flexShrink: 0 }}>{formatDate(conversation.lastMessageAt)}</span>
                    </div>
                    {conversation.lastMessagePreview && <p style={{ margin: 0, fontSize: 12, color: conversation.unreadCount > 0 ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.60)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{previewText(conversation.lastMessagePreview)}</p>}
                  </div>
                  {conversation.unreadCount > 0 && <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: '#F5B942', color: '#0B0B0F', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}
                  {conversation.productImage && <img src={conversation.productImage} alt={conversation.productTitle ?? 'Product'} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AppBottomNav />
    </div>
  );
}
