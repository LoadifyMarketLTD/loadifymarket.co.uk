import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { MessageCircle, Send, User } from 'lucide-react';
import type { Message, Conversation } from '../types';

interface ConversationWithDetails extends Conversation {
  otherUserName?: string;
  productTitle?: string;
  lastMessage?: string;
  unreadCount?: number;
}

export default function MessagesPage() {
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*, messages(*)')
        .or(`user1Id.eq.${user.id},user2Id.eq.${user.id}`)
        .order('lastMessageAt', { ascending: false });

      if (error) throw error;

      // Fetch additional details for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.user1Id === user.id ? conv.user2Id : conv.user1Id;
          
          // Fetch other user's name
          const { data: userData } = await supabase
            .from('users')
            .select('firstName, lastName')
            .eq('id', otherUserId)
            .single();

          // Fetch product title if applicable
          let productTitle = '';
          if (conv.productId) {
            const { data: productData } = await supabase
              .from('products')
              .select('title')
              .eq('id', conv.productId)
              .single();
            productTitle = productData?.title || '';
          }

          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('message')
            .eq('conversationId', conv.id)
            .order('createdAt', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversationId', conv.id)
            .eq('receiverId', user.id)
            .eq('isRead', false);

          return {
            ...conv,
            otherUserName: userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User',
            productTitle,
            lastMessage: lastMessageData?.message || '',
            unreadCount: unreadCount || 0,
          };
        })
      );

      setConversations(conversationsWithDetails);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversationId', conversationId)
        .order('createdAt', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      // Mark messages as read
      if (user) {
        await supabase
          .from('messages')
          .update({ isRead: true })
          .eq('conversationId', conversationId)
          .eq('receiverId', user.id);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const conversation = conversations.find(c => c.id === selectedConversation);
      if (!conversation) return;

      const receiverId = conversation.user1Id === user.id ? conversation.user2Id : conversation.user1Id;

      const { error } = await supabase
        .from('messages')
        .insert([{
          conversationId: selectedConversation,
          senderId: user.id,
          receiverId,
          message: newMessage.trim(),
          productId: conversation.productId,
        }]);

      if (error) throw error;

      // Update conversation last message time
      await supabase
        .from('conversations')
        .update({ lastMessageAt: new Date().toISOString() })
        .eq('id', selectedConversation);

      setNewMessage('');
      fetchMessages(selectedConversation);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <p className="text-gray-600">Please log in to view messages.</p>
          <Link to="/login" className="btn-primary mt-4 inline-block">
            Log In
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading messages...</div>
        </div>
      </div>
    );
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex h-[600px]">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-lg">Conversations</h2>
              </div>
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div>
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv.id)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedConversation === conv.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="bg-gray-200 rounded-full p-2">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-sm truncate">{conv.otherUserName}</h3>
                              {conv.unreadCount! > 0 && (
                                <span className="bg-red-600 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                            {conv.productTitle && (
                              <p className="text-xs text-gray-500 truncate">{conv.productTitle}</p>
                            )}
                            <p className="text-sm text-gray-600 truncate mt-1">{conv.lastMessage}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Messages View */}
            <div className="flex-1 flex flex-col">
              {selectedConv ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-semibold">{selectedConv.otherUserName}</h3>
                    {selectedConv.productTitle && (
                      <p className="text-sm text-gray-600">Re: {selectedConv.productTitle}</p>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                            msg.senderId === user.id
                              ? 'bg-navy-800 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            msg.senderId === user.id ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-800 focus:border-transparent"
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        <span>Send</span>
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p>Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
