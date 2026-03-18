import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star, MessageSquare, CheckCircle, ChevronLeft, Reply,
  TrendingUp, ThumbsUp, Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string;
  productId: string;
  productTitle?: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  sellerResponse?: { text: string; respondedAt: string };
  status: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Stars({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`${cls} ${s <= value ? 'fill-gold text-gold' : 'text-white/15'}`} />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SellerReviewsPage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all' | 'unanswered'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'high' | 'low' | 'helpful'>('recent');

  // Response state
  const [respondingTo, setRespondingTo]   = useState<string | null>(null);
  const [responseText, setResponseText]   = useState('');
  const [responseSaving, setResponseSaving] = useState(false);
  const [responseError, setResponseError] = useState('');

  // ── Fetch reviews for this seller's products ─────────────────────────────────

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get this seller's product IDs first
      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .eq('sellerId', user.id);

      if (!products?.length) { setReviews([]); setLoading(false); return; }

      const productIds = products.map((p: { id: string }) => p.id);

      let q = supabase
        .from('reviews')
        .select('*')
        .in('productId', productIds)
        .not('status', 'in', '("removed","hidden")');

      if (filterRating === 'unanswered') {
        q = q.is('sellerResponse', null);
      } else if (typeof filterRating === 'number') {
        q = q.eq('rating', filterRating);
      }

      const col = sortBy === 'helpful' ? 'helpfulCount'
        : sortBy === 'high' ? 'rating'
        : sortBy === 'low'  ? 'rating'
        : 'createdAt';
      q = q.order(col, { ascending: sortBy === 'low' }).limit(100);

      const { data, error } = await q;
      if (error) throw error;

      // Attach product title
      const titleMap = Object.fromEntries(
        (products as { id: string; title: string }[]).map(p => [p.id, p.title])
      );
      setReviews((data || []).map((r: ReviewRow) => ({
        ...r,
        productTitle: titleMap[r.productId] ?? 'Product',
      })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user, filterRating, sortBy]);

  useEffect(() => { if (user) fetchReviews(); }, [user, fetchReviews]);

  // ── Save response ─────────────────────────────────────────────────────────

  const handleSave = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setResponseSaving(true);
    setResponseError('');
    try {
      const resp = { text: responseText.trim(), respondedAt: new Date().toISOString() };
      const { error } = await supabase.from('reviews').update({ sellerResponse: resp }).eq('id', reviewId);
      if (error) throw error;
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, sellerResponse: resp } : r
      ));
      setRespondingTo(null);
      setResponseText('');
    } catch (e) {
      console.error(e);
      setResponseError('Failed to save response. Please try again.');
    } finally {
      setResponseSaving(false);
    }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const unanswered = reviews.filter(r => !r.sellerResponse).length;
  const fiveStars  = reviews.filter(r => r.rating === 5).length;

  // ── Render ────────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24 flex items-center justify-center">
        <div className="card-glass text-center py-12 px-8">
          <p className="text-gray-500 mb-4">Sign in to view your seller reviews.</p>
          <Link to="/login" className="btn-primary">Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-5xl">
        {/* Back */}
        <Link to="/seller" className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors text-sm mb-8">
          <ChevronLeft className="w-4 h-4" /> Seller Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-premium-sm">
              <Star className="w-7 h-7 text-gold" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Reviews</h1>
              <p className="text-gray-400 text-sm mt-1">{reviews.length} total review{reviews.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Avg. Rating',  value: reviews.length ? avgRating.toFixed(1) : '–', icon: Star,         color: 'text-gold' },
            { label: 'Total Reviews', value: reviews.length,   icon: MessageSquare,  color: 'text-blue-400' },
            { label: 'Unanswered',   value: unanswered,        icon: Reply,          color: unanswered > 0 ? 'text-yellow-400' : 'text-green-400' },
            { label: '5-Star',       value: fiveStars,         icon: TrendingUp,     color: 'text-green-400' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card-glass text-center">
                <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filter + Sort bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {(['all', 'unanswered', 5, 4, 3, 2, 1] as const).map(f => (
              <button
                key={String(f)}
                onClick={() => setFilterRating(f)}
                className={`px-3 py-1.5 rounded-premium-sm text-xs font-medium transition-all ${
                  filterRating === f ? 'bg-gold text-jet' : 'bg-white text-gray-500 hover:bg-white/70'
                }`}
              >
                {f === 'all' ? 'All' : f === 'unanswered' ? 'Unanswered' : `${f}★`}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            className="input-field py-1.5 px-3 text-xs"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="high">Highest Rated</option>
            <option value="low">Lowest Rated</option>
          </select>
        </div>

        {/* Review list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="card-glass text-center py-20">
            <MessageSquare className="w-16 h-16 text-white/10 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No reviews yet</h3>
            <p className="text-gray-400">Your product reviews will appear here once customers leave feedback.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => {
              const isResponding = respondingTo === review.id;
              return (
                <div key={review.id} className="card-glass group">
                  {/* Product label */}
                  <div className="flex items-center justify-between mb-3">
                    <Link
                      to={`/product/${review.productId}`}
                      className="text-gold text-xs hover:underline font-medium"
                    >
                      {review.productTitle}
                    </Link>
                    <span className="text-gray-300 text-xs">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Buyer + stars */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-white text-sm">{review.userName || 'Buyer'}</span>
                    {review.isVerifiedPurchase && (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                    <Stars value={review.rating} />
                    {review.helpfulCount > 0 && (
                      <span className="flex items-center gap-1 text-gray-300 text-xs ml-auto">
                        <ThumbsUp className="w-3 h-3" /> {review.helpfulCount}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  {review.title && <h4 className="font-semibold text-white text-sm mb-1">{review.title}</h4>}
                  <p className="text-gray-600 text-sm leading-relaxed mb-3">{review.comment}</p>

                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {review.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt=""
                          className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  )}

                  {/* Existing response */}
                  {review.sellerResponse && !isResponding && (
                    <div className="mt-3 pt-3 border-t border-gray-200 bg-gold/5 rounded-premium-sm p-3">
                      <p className="text-xs font-bold text-gold mb-1 flex items-center gap-1">
                        <Reply className="w-3.5 h-3.5" /> Your Response
                      </p>
                      <p className="text-gray-600 text-sm leading-relaxed">{review.sellerResponse.text}</p>
                      <p className="text-gray-300 text-xs mt-1">
                        {formatDistanceToNow(new Date(review.sellerResponse.respondedAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}

                  {/* Response editor */}
                  {isResponding && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-bold text-gold mb-2 flex items-center gap-1">
                        <Reply className="w-3.5 h-3.5" /> Your Response
                      </p>
                      {responseError && (
                        <p className="text-red-400 text-xs mb-2">{responseError}</p>
                      )}
                      <textarea
                        rows={3}
                        value={responseText}
                        onChange={e => setResponseText(e.target.value)}
                        placeholder="Write a professional response to this review…"
                        maxLength={500}
                        className="input-field w-full resize-none text-sm mb-2"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 text-xs">{responseText.length}/500</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setRespondingTo(null); setResponseText(''); setResponseError(''); }}
                            className="btn-outline text-xs py-1.5 px-3"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSave(review.id)}
                            disabled={!responseText.trim() || responseSaving}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-50"
                          >
                            {responseSaving
                              ? <div className="w-3 h-3 border border-jet border-t-transparent rounded-full animate-spin" />
                              : <Reply className="w-3 h-3" />}
                            Post Response
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action bar */}
                  {!isResponding && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setRespondingTo(review.id);
                          setResponseText(review.sellerResponse?.text ?? '');
                          setResponseError('');
                        }}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gold transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        {review.sellerResponse ? 'Edit Response' : 'Respond'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
