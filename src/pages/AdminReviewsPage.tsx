import { useState, useEffect, useCallback } from 'react';
import {
  Star, ShieldAlert, CheckCircle, XCircle, Eye, EyeOff,
  AlertTriangle, RefreshCcw, Search, Filter, ChevronLeft, User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminReviewRow {
  id: string;
  productId: string;
  productTitle?: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  status: 'published' | 'hidden' | 'removed' | 'flagged';
  isAbusive?: boolean;
  adminNote?: string;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= value ? 'fill-gold text-gold' : 'text-white/15'}`} />
      ))}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  published: { label: 'Published', color: 'text-green-400' },
  flagged:   { label: 'Flagged',   color: 'text-yellow-400' },
  hidden:    { label: 'Hidden',    color: 'text-white/40' },
  removed:   { label: 'Removed',  color: 'text-red-400' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminReviewsPage() {
  const { user } = useAuthStore();
  const [reviews, setReviews]           = useState<AdminReviewRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNote, setAdminNote]       = useState<Record<string, string>>({});

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from('reviews').select('*').order('createdAt', { ascending: false }).limit(200);
      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (search) q = q.or(`userName.ilike.%${search}%,comment.ilike.%${search}%,title.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      setReviews(data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const updateStatus = async (id: string, status: AdminReviewRow['status'], note?: string) => {
    setActionLoading(id);
    try {
      const update: Record<string, unknown> = { status };
      if (note) update.adminNote = note;
      if (status === 'removed' || status === 'hidden') update.isAbusive = true;
      await supabase.from('reviews').update(update).eq('id', id);
      setReviews(prev => prev.map(r => r.id === id ? { ...r, status, isAbusive: update.isAbusive as boolean } : r));
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  const suspendUser = async (userId: string, reviewId: string) => {
    if (!window.confirm('Suspend this user account? This will prevent them from logging in.')) return;
    setActionLoading(reviewId);
    try {
      await supabase.from('users').update({ isActive: false }).eq('id', userId);
      alert('User account suspended.');
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  // Stats
  const flagged   = reviews.filter(r => r.status === 'flagged').length;
  const abusive   = reviews.filter(r => r.isAbusive).length;
  const published = reviews.filter(r => r.status === 'published').length;
  const removed   = reviews.filter(r => r.status === 'removed').length;

  if (!user || user.role !== 'admin') {
    return (
      <div className="bg-jet min-h-screen pt-24 flex items-center justify-center">
        <div className="card-glass text-center py-16 px-8">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white font-bold">Admin access required.</p>
          <Link to="/admin" className="btn-primary mt-4 inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jet min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin" className="p-2 rounded-premium-sm bg-graphite hover:bg-graphite/70 text-white/60 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="p-3 bg-gold/10 rounded-premium-sm">
            <Star className="w-7 h-7 text-gold" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Review Moderation</h1>
            <p className="text-white/40 text-sm mt-1">Remove abusive reviews, block fake reviews, suspend accounts</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Published',    value: published, color: 'text-green-400' },
            { label: 'Flagged',      value: flagged,   color: flagged > 0 ? 'text-yellow-400' : 'text-white' },
            { label: 'Abusive',      value: abusive,   color: abusive > 0 ? 'text-red-400' : 'text-white' },
            { label: 'Removed',      value: removed,   color: 'text-white/40' },
          ].map(stat => (
            <div key={stat.label} className="card-glass text-center">
              <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-white/40 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by username, comment…"
              className="input-field w-full pl-9 py-2.5 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            {['all', 'flagged', 'published', 'hidden', 'removed'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-premium-sm text-xs font-medium transition-all capitalize ${
                  filterStatus === s ? 'bg-gold text-jet' : 'bg-graphite text-white/60 hover:bg-graphite/70'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button onClick={fetchReviews} className="btn-glass flex items-center gap-2 text-sm py-2.5">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Reviews table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="card-glass text-center py-16">
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
            <p className="text-white font-bold">No reviews match this filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map(review => {
              const statusCfg = STATUS_CONFIG[review.status] ?? STATUS_CONFIG.published;
              const isActing = actionLoading === review.id;
              return (
                <div key={review.id} className={`card-glass ${review.isAbusive ? 'border border-red-400/20' : ''}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Review content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <span className="font-semibold text-white text-sm">{review.userName || 'Unknown'}</span>
                        <Stars value={review.rating} />
                        <span className={`text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                        {review.isVerifiedPurchase && (
                          <span className="flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        )}
                        {review.isAbusive && (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <ShieldAlert className="w-3 h-3" /> Abusive
                          </span>
                        )}
                        <span className="text-white/30 text-xs ml-auto">
                          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {review.title && <p className="font-semibold text-white text-sm mb-1">{review.title}</p>}
                      <p className="text-white/70 text-sm leading-relaxed line-clamp-3">{review.comment}</p>
                      {review.adminNote && (
                        <p className="text-yellow-400/70 text-xs mt-2 italic">Admin note: {review.adminNote}</p>
                      )}

                      {/* Admin note input */}
                      <div className="mt-3">
                        <input
                          type="text"
                          placeholder="Add admin note (optional)…"
                          value={adminNote[review.id] ?? ''}
                          onChange={e => setAdminNote(prev => ({ ...prev, [review.id]: e.target.value }))}
                          className="input-field py-2 px-3 text-xs w-full max-w-xs"
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex md:flex-col gap-2 shrink-0 flex-wrap md:flex-nowrap">
                      {review.status !== 'published' && (
                        <button
                          onClick={() => updateStatus(review.id, 'published')}
                          disabled={isActing}
                          className="btn-glass text-xs py-2 px-3 flex items-center gap-1.5 text-green-400 border-green-400/20 hover:border-green-400/40 disabled:opacity-50"
                        >
                          <Eye className="w-3.5 h-3.5" /> Restore
                        </button>
                      )}
                      {review.status === 'published' && (
                        <button
                          onClick={() => updateStatus(review.id, 'hidden', adminNote[review.id])}
                          disabled={isActing}
                          className="btn-glass text-xs py-2 px-3 flex items-center gap-1.5 text-yellow-400 border-yellow-400/20 hover:border-yellow-400/40 disabled:opacity-50"
                        >
                          <EyeOff className="w-3.5 h-3.5" /> Hide
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(review.id, 'removed', adminNote[review.id])}
                        disabled={isActing || review.status === 'removed'}
                        className="btn-glass text-xs py-2 px-3 flex items-center gap-1.5 text-red-400 border-red-400/20 hover:border-red-400/40 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Remove
                      </button>
                      <button
                        onClick={() => suspendUser(review.userId, review.id)}
                        disabled={isActing}
                        className="btn-glass text-xs py-2 px-3 flex items-center gap-1.5 text-red-400 border-red-400/20 hover:border-red-400/40 disabled:opacity-50"
                        title="Suspend user account"
                      >
                        <User className="w-3.5 h-3.5" /> Suspend User
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
