import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, MessageCircle, CheckCircle, Clock, XCircle,
  ShieldCheck, ChevronLeft, Send, Upload, Info,
  RefreshCcw, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { BuyerProtectionReason, DisputeResolutionType, EscrowStatus } from '../types';
import {
  PROTECTION_REASONS, RESOLUTION_TYPES, getDisputeTimeline,
  getSellerDeadline, hoursUntil, getEscrowInfo, isAbuseRisk, PROTECTION_CONFIG,
} from '../lib/buyerProtection';

// ─── Local interfaces ────────────────────────────────────────────────────────

interface DisputeRow {
  id: string;
  orderId: string;
  orderNumber: string;
  subject: string;
  description: string;
  protectionReason?: BuyerProtectionReason;
  images?: string[];
  status: 'open' | 'in_review' | 'resolved' | 'closed';
  resolution?: string;
  resolutionType?: DisputeResolutionType;
  refundAmount?: number;
  escrowStatus?: EscrowStatus;
  buyerAbuseFlagged?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DisputeMessage {
  id: string;
  disputeId: string;
  userId: string;
  userRole?: 'buyer' | 'seller' | 'admin';
  message: string;
  createdAt: string;
}

// ─── Status helpers ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof AlertTriangle }> = {
  open:      { label: 'Open',        color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', icon: AlertTriangle },
  in_review: { label: 'In Review',   color: 'text-blue-400',   bg: 'bg-blue-400/10 border-blue-400/30',    icon: Clock },
  resolved:  { label: 'Resolved',    color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  icon: CheckCircle },
  closed:    { label: 'Closed',      color: 'text-gray-400',   bg: 'bg-gray-50 border-gray-200',           icon: XCircle },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function DisputesPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [selected, setSelected]   = useState<DisputeRow | null>(null);
  const [messages, setMessages]   = useState<DisputeMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending]     = useState(false);

  // Create form state
  const [form, setForm] = useState({
    orderId: searchParams.get('orderId') || '',
    subject: '',
    protectionReason: '' as BuyerProtectionReason | '',
    description: '',
    images: [] as File[],
  });
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  // If orderId is pre-filled from URL, open the create form immediately
  useEffect(() => {
    if (searchParams.get('orderId')) {
      setShowForm(true);
    }
  }, [searchParams]);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchDisputes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*, orders!inner(orderNumber)')
        .eq('buyerId', user.id)
        .order('createdAt', { ascending: false });
      if (error) throw error;
      setDisputes((data || []).map((d: Record<string, unknown>) => ({
        ...d,
        orderNumber: (d.orders as { orderNumber: string } | null)?.orderNumber ?? d.orderId,
      } as DisputeRow)));
    } catch (e) {
      console.error('Error fetching disputes:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (disputeId: string) => {
    try {
      const { data, error } = await supabase
        .from('dispute_messages')
        .select('*')
        .eq('disputeId', disputeId)
        .order('createdAt', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      console.error('Error fetching messages:', e);
    }
  }, []);

  useEffect(() => { if (user) fetchDisputes(); }, [user, fetchDisputes]);
  useEffect(() => { if (selected) fetchMessages(selected.id); }, [selected, fetchMessages]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleProtectionReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as BuyerProtectionReason;
    const label = PROTECTION_REASONS.find(r => r.key === key)?.label ?? '';
    setForm(prev => ({ ...prev, protectionReason: key, subject: label }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!user) return;
    if (!form.orderId || !form.protectionReason || !form.description) {
      setFormError('Please fill in all required fields.');
      return;
    }
    // Abuse check
    if (isAbuseRisk(disputes.map(d => d.createdAt))) {
      setFormError(`You have opened ${PROTECTION_CONFIG.maxDisputesPerMonth} or more disputes this month. Please contact support.`);
      return;
    }

    const reasonDef = PROTECTION_REASONS.find(r => r.key === form.protectionReason);
    setSubmitting(true);
    try {
      const { error } = await supabase.from('disputes').insert({
        orderId: form.orderId,
        buyerId: user.id,
        subject: form.subject || reasonDef?.label || 'Buyer Protection Dispute',
        description: form.description,
        protectionReason: form.protectionReason,
        status: 'open',
        escrowStatus: 'held',
      });
      if (error) throw error;
      setFormSuccess(true);
      setForm({ orderId: '', subject: '', protectionReason: '', description: '', images: [] });
      fetchDisputes();
    } catch (e) {
      console.error(e);
      setFormError('Failed to open dispute. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selected || !newMessage.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('dispute_messages').insert({
        disputeId: selected.id,
        userId: user.id,
        userRole: user.role,
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
      fetchMessages(selected.id);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  // ── Auth guard ────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24 flex items-center justify-center">
        <div className="card-glass text-center py-16 px-8 max-w-md">
          <ShieldCheck className="w-16 h-16 text-gold mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3">Sign In Required</h2>
          <p className="text-gray-500 mb-6">Sign in to manage your disputes and buyer protection cases.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  // ── Detail view ───────────────────────────────────────────────────────────

  if (selected) {
    const cfg = STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open;
    const Icon = cfg.icon;
    const timeline = getDisputeTimeline(selected.createdAt);
    const sellerDeadline = getSellerDeadline(selected.createdAt);
    const hoursLeft = hoursUntil(sellerDeadline);
    const escrow = getEscrowInfo(selected.escrowStatus);
    const reasonDef = PROTECTION_REASONS.find(r => r.key === selected.protectionReason);
    const resDef = RESOLUTION_TYPES.find(r => r.key === selected.resolutionType);
    const isActive = selected.status === 'open' || selected.status === 'in_review';

    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24">
        <div className="container-cinematic py-10 max-w-5xl">
          {/* Back */}
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors mb-8 text-sm">
            <ChevronLeft className="w-4 h-4" /> Back to Disputes
          </button>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* ── Left panel: details ──────────────────────────────── */}
            <div className="space-y-5">
              {/* Status card */}
              <div className={`card-glass border ${cfg.bg}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                  <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <h2 className="text-lg font-bold text-white mb-1">{selected.subject}</h2>
                <p className="text-gray-400 text-xs">Order: {selected.orderNumber}</p>
                <p className="text-gray-400 text-xs mt-1">
                  Opened {new Date(selected.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>

                {/* Protection reason */}
                {reasonDef && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Reason</p>
                    <p className="text-white text-sm font-medium">{reasonDef.label}</p>
                    <p className="text-gray-400 text-xs mt-1">{reasonDef.description}</p>
                  </div>
                )}

                {/* Description */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Description</p>
                  <p className="text-gray-600 text-sm leading-relaxed">{selected.description}</p>
                </div>

                {/* Resolution */}
                {selected.resolution && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">Resolution</p>
                    {resDef && <p className="text-green-400 text-sm font-semibold mb-1">{resDef.label}</p>}
                    <p className="text-gray-600 text-sm">{selected.resolution}</p>
                    {selected.refundAmount != null && (
                      <p className="text-gold font-bold mt-2">Refund: £{selected.refundAmount.toFixed(2)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Escrow status */}
              <div className="card-glass">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-gold" />
                  <p className="text-sm font-bold text-white">Payment Escrow</p>
                </div>
                <p className={`text-sm font-semibold ${escrow.color}`}>{escrow.label}</p>
                <p className="text-gray-400 text-xs mt-1">{escrow.description}</p>
              </div>

              {/* Seller response countdown (only when open) */}
              {selected.status === 'open' && hoursLeft > 0 && (
                <div className="card-glass border border-yellow-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <p className="text-sm font-bold text-white">Seller Response</p>
                  </div>
                  <p className="text-yellow-400 font-bold">{hoursLeft}h remaining</p>
                  <p className="text-gray-400 text-xs mt-1">Seller must respond within 48 hours or the case escalates to admin.</p>
                </div>
              )}
              {selected.status === 'open' && hoursLeft <= 0 && (
                <div className="card-glass border border-red-400/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <p className="text-sm font-bold text-red-400">Escalated to Admin</p>
                  </div>
                  <p className="text-gray-400 text-xs">Seller missed the 48h deadline. Our team is reviewing your case.</p>
                </div>
              )}

              {/* Dispute timeline */}
              <div className="card-glass">
                <p className="text-sm font-bold text-white mb-4">Case Timeline</p>
                <div className="space-y-3">
                  {timeline.map((t, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${t.isPast ? 'bg-gold' : 'bg-white/15'}`} />
                      <div>
                        <p className={`text-xs font-semibold ${t.isPast ? 'text-white' : 'text-gray-400'}`}>
                          Day {t.day} — {t.label}
                          {t.isDeadline && <span className="ml-1 text-gold/70">⚑</span>}
                        </p>
                        <p className="text-gray-400 text-xs">{t.description}</p>
                        <p className="text-white/25 text-xs">{t.date.toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Buyer protection link */}
              <Link to="/buyer-protection" className="flex items-center gap-2 text-gold text-xs hover:underline">
                <Info className="w-3 h-3" /> Learn about Buyer Protection
              </Link>
            </div>

            {/* ── Right panel: messages ────────────────────────────── */}
            <div className="lg:col-span-2">
              <div className="card-glass flex flex-col" style={{ minHeight: '520px' }}>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-gold" />
                  Dispute Messages
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-[300px]">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                      <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
                      <p className="text-gray-400 text-sm">No messages yet. Send the first message to the seller or support team.</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.userId === user.id;
                      const isAdmin = msg.userRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-premium-sm px-4 py-3 ${
                            isAdmin
                              ? 'bg-gold/20 border border-gold/30'
                              : isMe
                              ? 'bg-white'
                              : 'bg-gray-500'
                          }`}>
                            <p className="text-xs text-gray-400 mb-1">
                              {isAdmin ? '🛡 Admin' : isMe ? 'You' : 'Seller'} ·{' '}
                              {new Date(msg.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-white text-sm leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message input */}
                {isActive && (
                  <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-gray-200 pt-4">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder="Type your message to the seller or support..."
                      className="input-field flex-1 py-3"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="btn-primary px-4 py-3 flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>
                )}
                {!isActive && (
                  <p className="text-gray-400 text-xs text-center pt-4 border-t border-gray-200">
                    This dispute is {selected.status}. Messaging is closed.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────

  const abuseWarning = isAbuseRisk(disputes.map(d => d.createdAt));

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-premium-sm">
              <ShieldCheck className="w-7 h-7 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Disputes</h1>
              <p className="text-gray-400 text-sm mt-1">Manage buyer protection cases</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/buyer-protection" className="btn-glass flex items-center gap-2 text-sm">
              <Info className="w-4 h-4" />
              How it works
            </Link>
            <button
              onClick={() => { setShowForm(true); setFormSuccess(false); }}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              Open Dispute
            </button>
          </div>
        </div>

        {/* Abuse warning */}
        {abuseWarning && (
          <div className="card-glass border border-red-400/30 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold text-sm">Account Notice</p>
              <p className="text-gray-500 text-xs mt-1">
                You have opened {PROTECTION_CONFIG.maxDisputesPerMonth}+ disputes this month. Repeated misuse may result in account suspension. Contact{' '}
                <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-gold hover:underline">support</a> if you need help.
              </p>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="card-glass mb-8 border border-gold/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-gold" />
                Open a Buyer Protection Dispute
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
            </div>

            {formSuccess ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-white font-bold text-lg mb-2">Dispute Opened</h3>
                <p className="text-gray-500 text-sm mb-4">
                  Your case is now open. The seller has 48 hours to respond. Payment is held in escrow until resolution.
                </p>
                <button onClick={() => { setShowForm(false); setFormSuccess(false); }} className="btn-outline text-sm">Close</button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-5">
                {formError && (
                  <div className="flex items-start gap-2 bg-red-500/10 border border-red-400/30 rounded-premium-sm p-3">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{formError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Order Number <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      required
                      value={form.orderId}
                      onChange={e => setForm({ ...form, orderId: e.target.value })}
                      placeholder="e.g. ORD-1234567890-ABC"
                      className="input-field w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-2">Protection Reason <span className="text-red-400">*</span></label>
                    <select
                      required
                      value={form.protectionReason}
                      onChange={handleProtectionReasonChange}
                      className="input-field w-full"
                    >
                      <option value="">Select a reason...</option>
                      {PROTECTION_REASONS.map(r => (
                        <option key={r.key} value={r.key}>{r.label}</option>
                      ))}
                    </select>
                    {form.protectionReason && (
                      <p className="text-gray-400 text-xs mt-1">
                        {PROTECTION_REASONS.find(r => r.key === form.protectionReason)?.description}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-2">Describe the Issue <span className="text-red-400">*</span></label>
                  <textarea
                    required
                    rows={4}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Please provide as much detail as possible including dates, amounts, and what happened..."
                    className="input-field w-full resize-none"
                  />
                </div>

                {/* Evidence upload hint */}
                {form.protectionReason && PROTECTION_REASONS.find(r => r.key === form.protectionReason)?.requiresEvidence && (
                  <div className="flex items-start gap-3 bg-gold/5 border border-gold/20 rounded-premium-sm p-3">
                    <Upload className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-medium">Evidence Required</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        This reason requires photo evidence. After submitting, upload images via the dispute messaging thread.
                      </p>
                    </div>
                  </div>
                )}

                {/* Escrow notice */}
                <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-400/20 rounded-premium-sm p-3">
                  <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-white text-sm font-medium">Payment Protection Active</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Opening a dispute will freeze the escrow funds for this order. Your payment is protected until resolution.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
                  <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60">
                    {submitting ? <div className="w-4 h-4 border-2 border-jet border-t-transparent rounded-full animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                    Open Dispute
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Disputes list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="card-glass text-center py-20">
            <ShieldCheck className="w-16 h-16 text-gold mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No disputes</h3>
            <p className="text-gray-400 mb-4">You have no active or past disputes.</p>
            <Link to="/buyer-protection" className="text-gold text-sm hover:underline">
              Learn about Buyer Protection →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map(dispute => {
              const cfg = STATUS_CONFIG[dispute.status] ?? STATUS_CONFIG.open;
              const Ico = cfg.icon;
              const reasonDef = PROTECTION_REASONS.find(r => r.key === dispute.protectionReason);
              const escrow = getEscrowInfo(dispute.escrowStatus);
              return (
                <button
                  key={dispute.id}
                  onClick={() => setSelected(dispute)}
                  className="card-glass w-full text-left flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:border-gold/30 transition-all duration-200 group"
                >
                  <div className={`p-3 rounded-premium-sm border ${cfg.bg} flex-shrink-0`}>
                    <Ico className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm truncate">{dispute.subject}</span>
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                      {dispute.buyerAbuseFlagged && (
                        <span className="text-xs text-red-400 border border-red-400/30 px-2 py-0.5 rounded-full">Flagged</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs">Order: {dispute.orderNumber}</p>
                    {reasonDef && <p className="text-gray-400 text-xs">{reasonDef.label}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`text-xs font-medium ${escrow.color}`}>{escrow.label}</span>
                    {dispute.refundAmount != null && (
                      <span className="text-gold text-sm font-bold">£{dispute.refundAmount.toFixed(2)}</span>
                    )}
                    <span className="text-gray-300 text-xs">
                      {new Date(dispute.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Refresh */}
        <div className="flex justify-center mt-8">
          <button onClick={fetchDisputes} className="btn-glass flex items-center gap-2 text-sm">
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
