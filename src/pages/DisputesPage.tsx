import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, MessageCircle, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';

interface Dispute {
  id: string;
  orderId: string;
  orderNumber: string;
  subject: string;
  description: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DisputeMessage {
  id: string;
  disputeId: string;
  userId: string;
  message: string;
  createdAt: string;
}

export default function DisputesPage() {
  const { user } = useAuthStore();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Form state
  const [orderId, setOrderId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const fetchDisputes = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          orders!inner(orderNumber)
        `)
        .eq('buyerId', user.id)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setDisputes(data || []);
    } catch (error) {
      console.error('Error fetching disputes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDisputes();
    }
  }, [user, fetchDisputes]);

  useEffect(() => {
    if (selectedDispute) {
      fetchMessages(selectedDispute.id);
    }
  }, [selectedDispute]);

  const fetchMessages = async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_messages')
        .select('*')
        .eq('disputeId', disputeId)
        .order('createdAt', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCreateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !orderId || !subject || !description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('disputes')
        .insert({
          orderId,
          buyerId: user.id,
          subject,
          description,
          status: 'open',
        });

      if (error) throw error;

      alert('Dispute opened successfully!');
      setShowCreateForm(false);
      setOrderId('');
      setSubject('');
      setDescription('');
      fetchDisputes();
    } catch (error) {
      console.error('Error creating dispute:', error);
      alert('Failed to open dispute');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedDispute || !newMessage.trim()) {
      return;
    }

    try {
      const { error } = await supabase
        .from('dispute_messages')
        .insert({
          disputeId: selectedDispute.id,
          userId: user.id,
          message: newMessage,
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedDispute.id);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'under_review':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Open',
      under_review: 'Under Review',
      resolved: 'Resolved',
      rejected: 'Rejected',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be signed in to view your disputes.
          </p>
          <Link to="/login" className="btn-primary">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (selectedDispute) {
    return (
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => setSelectedDispute(null)}
          className="mb-6 text-gold-600 hover:text-gold-700 flex items-center gap-2"
        >
          ← Back to Disputes
        </button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dispute Details */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                {getStatusIcon(selectedDispute.status)}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedDispute.status)}`}>
                  {getStatusLabel(selectedDispute.status)}
                </span>
              </div>

              <h2 className="text-xl font-bold mb-2">{selectedDispute.subject}</h2>
              <p className="text-gray-600 text-sm mb-4">
                Order: {selectedDispute.orderNumber}
              </p>
              <p className="text-gray-600 text-sm mb-4">
                Opened: {new Date(selectedDispute.createdAt).toLocaleDateString()}
              </p>

              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600 text-sm">{selectedDispute.description}</p>
              </div>

              {selectedDispute.resolution && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-2">Resolution</h3>
                  <p className="text-gray-600 text-sm">{selectedDispute.resolution}</p>
                </div>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="lg:col-span-2">
            <div className="card h-[600px] flex flex-col">
              <h3 className="text-xl font-bold mb-4">Messages</h3>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No messages yet</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        msg.userId === user.id
                          ? 'bg-gold-50 ml-8'
                          : 'bg-gray-100 mr-8'
                      }`}
                    >
                      <p className="text-sm text-gray-600 mb-1">
                        {msg.userId === user.id ? 'You' : 'Support Team'} •{' '}
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                      <p className="text-gray-900">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              {selectedDispute.status !== 'resolved' && selectedDispute.status !== 'rejected' && (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="btn-primary whitespace-nowrap"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dispute Center</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
        >
          Open Dispute
        </button>
      </div>

      {/* Create Dispute Form */}
      {showCreateForm && (
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Open a Dispute</h2>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleCreateDispute} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Number *
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order number"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of the issue"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                placeholder="Please provide detailed information about your dispute..."
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Disputes are reviewed by our team within 24-48 hours. 
                We may request additional information or evidence.
              </p>
            </div>

            <div className="flex gap-4">
              <button type="submit" className="btn-primary">
                Submit Dispute
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Disputes List */}
      {loading ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">Loading disputes...</p>
        </div>
      ) : disputes.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No Disputes</h2>
          <p className="text-gray-600 mb-6">
            You haven't opened any disputes.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              onClick={() => setSelectedDispute(dispute)}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(dispute.status)}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(dispute.status)}`}>
                      {getStatusLabel(dispute.status)}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg mb-1">{dispute.subject}</h3>
                  <p className="text-gray-600 text-sm mb-2">
                    Order: {dispute.orderNumber}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Opened: {new Date(dispute.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <MessageCircle className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
