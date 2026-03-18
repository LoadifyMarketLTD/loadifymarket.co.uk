import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import {
  Star, ThumbsUp, CheckCircle, MessageSquare, ShieldAlert,
  Video, ImagePlus, ChevronDown, AlertCircle, Reply,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SellerResponse { text: string; respondedAt: string; }

interface ReviewRow {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  helpfulVoters?: string[];
  images?: string[];
  videoUrl?: string;
  sellerResponse?: SellerResponse;
  status: 'published' | 'hidden' | 'removed' | 'flagged';
  isAbusive?: boolean;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  sellerId?: string;   // if provided, seller-response mode available
  averageRating: number;
  totalReviews: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Stars({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const cls = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  const active = interactive ? hover || value : value;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map(s => (
        <Star
          key={s}
          className={`${cls} transition-colors ${
            s <= active ? 'fill-gold text-gold' : 'text-gray-300'
          } ${interactive ? 'cursor-pointer hover:scale-110' : ''}`}
          onClick={interactive && onChange ? () => onChange(s) : undefined}
          onMouseEnter={interactive ? () => setHover(s) : undefined}
          onMouseLeave={interactive ? () => setHover(0) : undefined}
        />
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductReviews({
  productId, sellerId, averageRating, totalReviews,
}: ProductReviewsProps) {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | 'all' | 'verified'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'high' | 'low'>('recent');
  const [showForm, setShowForm]   = useState(false);
  const [eligibleOrders, setEligibleOrders] = useState<string[]>([]);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);

  // form
  const [formRating, setFormRating]   = useState(5);
  const [formTitle, setFormTitle]     = useState('');
  const [formComment, setFormComment] = useState('');
  const [formImages, setFormImages]   = useState<string[]>([]);
  const [formVideo, setFormVideo]     = useState('');
  const [formOrderId, setFormOrderId] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // response (seller)
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseSaving, setResponseSaving] = useState(false);

  // helpful voted set (local)
  const [votedHelpful, setVotedHelpful] = useState<Set<string>>(new Set());

  const isSeller = user?.id === sellerId;

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('reviews')
        .select('*')
        .eq('productId', productId)
        .not('status', 'in', '("removed","hidden")');

      if (filterRating === 'verified')  q = q.eq('isVerifiedPurchase', true);
      else if (typeof filterRating === 'number') q = q.eq('rating', filterRating);

      const orderCol = sortBy === 'helpful' ? 'helpfulCount'
        : sortBy === 'high' ? 'rating'
        : sortBy === 'low'  ? 'rating'
        : 'createdAt';
      const asc = sortBy === 'low';
      q = q.order(orderCol, { ascending: asc }).limit(50);

      const { data, error } = await q;
      if (error) throw error;
      setReviews(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [productId, filterRating, sortBy]);

  // Check if buyer has any eligible (delivered) orders for this product
  const checkEligibility = useCallback(async () => {
    if (!user) { setEligibilityChecked(true); return; }
    try {
      const { data } = await supabase
        .from('orders')
        .select('id, orderNumber')
        .eq('buyerId', user.id)
        .eq('productId', productId)
        .eq('status', 'delivered');
      setEligibleOrders((data || []).map((o: { id: string }) => o.id));
    } catch { /* ignore */ } finally {
      setEligibilityChecked(true);
    }
  }, [user, productId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { checkEligibility(); }, [checkEligibility]);

  // ── Review submission ────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!user) { setFormError('Please sign in to leave a review.'); return; }
    if (!formOrderId) { setFormError('Please select the order this review is for.'); return; }
    if (!formComment.trim()) { setFormError('Please write your review.'); return; }

    setFormSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        productId,
        userId: user.id,
        userName: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email,
        orderId: formOrderId,
        rating: formRating,
        title: formTitle.trim() || undefined,
        comment: formComment.trim(),
        isVerifiedPurchase: true,
        helpfulCount: 0,
        images: formImages.length ? formImages : undefined,
        videoUrl: formVideo.trim() || undefined,
        status: 'published',
      });
      if (error) throw error;
      setFormSuccess(true);
      setFormRating(5); setFormTitle(''); setFormComment('');
      setFormImages([]); setFormVideo(''); setFormOrderId('');
      fetchReviews();
    } catch (e) {
      console.error(e);
      setFormError('Failed to submit review. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ── Mark helpful ─────────────────────────────────────────────────────────────

  const handleHelpful = async (reviewId: string, current: number) => {
    if (!user || votedHelpful.has(reviewId)) return;
    setVotedHelpful(prev => new Set([...prev, reviewId]));
    try {
      await supabase.from('reviews').update({ helpfulCount: current + 1 }).eq('id', reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, helpfulCount: current + 1 } : r));
    } catch (e) {
      console.error(e);
      setVotedHelpful(prev => { const s = new Set(prev); s.delete(reviewId); return s; });
    }
  };

  // ── Seller response ──────────────────────────────────────────────────────────

  const handleSaveResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setResponseSaving(true);
    try {
      const resp = { text: responseText.trim(), respondedAt: new Date().toISOString() };
      await supabase.from('reviews').update({ sellerResponse: resp }).eq('id', reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, sellerResponse: resp } : r));
      setRespondingTo(null); setResponseText('');
    } catch (e) {
      console.error(e);
    } finally {
      setResponseSaving(false);
    }
  };

  // ── Flag review ──────────────────────────────────────────────────────────────

  const handleFlag = async (reviewId: string) => {
    if (!user) return;
    try {
      await supabase.from('reviews').update({ isAbusive: true, status: 'flagged' }).eq('id', reviewId);
      setReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Rating distribution ───────────────────────────────────────────────────────

  const dist = [5, 4, 3, 2, 1].map(s => ({
    stars: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length ? (reviews.filter(r => r.rating === s).length / reviews.length) * 100 : 0,
  }));

  const canWriteReview = eligibilityChecked && eligibleOrders.length > 0 &&
    !reviews.some(r => r.userId === user?.id);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
          {totalReviews > 0 ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              {/* Score */}
              <div className="text-center">
                <p className="text-5xl font-bold text-gold leading-none mb-2">
                  {averageRating.toFixed(1)}
                </p>
                <Stars value={Math.round(averageRating)} size="md" />
                <p className="text-gray-400 text-sm mt-2">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</p>
              </div>
              {/* Distribution bars */}
              <div className="space-y-1.5 flex-1 min-w-[180px]">
                {dist.map(({ stars, count, pct }) => (
                  <button
                    key={stars}
                    onClick={() => setFilterRating(filterRating === stars ? 'all' : stars)}
                    className={`flex items-center gap-2 w-full rounded px-1.5 py-0.5 transition-colors ${filterRating === stars ? 'bg-gold/10' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-xs text-gray-400 w-10 shrink-0">{stars} star</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gold h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 w-5 text-right shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No reviews yet — be the first!</p>
          )}
        </div>

        {/* Write review CTA */}
        <div className="shrink-0">
          {!user ? (
            <Link to="/login" className="btn-outline text-sm flex items-center gap-2">
              <Star className="w-4 h-4" /> Sign in to Review
            </Link>
          ) : canWriteReview && !showForm ? (
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <Star className="w-4 h-4" /> Write a Review
            </button>
          ) : eligibilityChecked && eligibleOrders.length === 0 && user ? (
            <div className="text-gray-300 text-xs text-right max-w-[160px] leading-relaxed">
              Purchase this product to leave a review
            </div>
          ) : reviews.some(r => r.userId === user?.id) ? (
            <span className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle className="w-4 h-4" /> You reviewed this
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Write review form ── */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 border border-gold/20">
          <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Star className="w-5 h-5 text-gold" /> Write Your Review
          </h3>
          {formSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-white font-bold text-lg">Review submitted!</p>
              <p className="text-gray-400 text-sm mt-1">Thank you for your feedback.</p>
              <button onClick={() => { setShowForm(false); setFormSuccess(false); }} className="btn-outline text-sm mt-4">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-400/30 rounded-premium-sm p-3">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-400 text-sm">{formError}</p>
                </div>
              )}

              {/* Order selector */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Your Order <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formOrderId}
                  onChange={e => setFormOrderId(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Select your order…</option>
                  {eligibleOrders.map(id => (
                    <option key={id} value={id}>Order #{id.slice(-8).toUpperCase()}</option>
                  ))}
                </select>
                <p className="text-gray-300 text-xs mt-1">Only delivered orders are eligible.</p>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Overall Rating <span className="text-red-400">*</span></label>
                <div className="flex items-center gap-3">
                  <Stars value={formRating} size="lg" interactive onChange={setFormRating} />
                  {formRating > 0 && (
                    <span className="text-gray-500 text-sm">{RATING_LABELS[formRating]}</span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Review Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Summarise your experience (optional)"
                  maxLength={100}
                  className="input-field w-full"
                />
              </div>

              {/* Comment */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Your Review <span className="text-red-400">*</span></label>
                <textarea
                  required
                  rows={5}
                  value={formComment}
                  onChange={e => setFormComment(e.target.value)}
                  placeholder="Share details about your experience — quality, delivery, packaging…"
                  maxLength={2000}
                  className="input-field w-full resize-none"
                />
                <p className="text-gray-300 text-xs mt-1">{formComment.length}/2000</p>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  <ImagePlus className="w-4 h-4 inline mr-1" /> Add Photos (optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formImages.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setFormImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-gray-900 text-xs flex items-center justify-center"
                      >×</button>
                    </div>
                  ))}
                  {formImages.length < 6 && (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-300 hover:border-gold/40 hover:text-gold transition-colors"
                    >
                      <ImagePlus className="w-6 h-6" />
                    </button>
                  )}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={e => {
                      const MAX_SIZE_MB = 5;
                      const files = Array.from(e.target.files || [])
                        .filter(f => {
                          if (f.size > MAX_SIZE_MB * 1024 * 1024) {
                            alert(`"${f.name}" exceeds ${MAX_SIZE_MB}MB and was skipped.`);
                            return false;
                          }
                          return true;
                        })
                        .slice(0, 6 - formImages.length);

                      Promise.all(
                        files.map(f => new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = ev => resolve(ev.target?.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(f);
                        }))
                      ).then(dataUrls => {
                        setFormImages(prev => [...prev, ...dataUrls]);
                      }).catch(err => console.error('Image read error:', err));

                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              {/* Video URL */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  <Video className="w-4 h-4 inline mr-1" /> Video Link (optional)
                </label>
                <input
                  type="url"
                  value={formVideo}
                  onChange={e => setFormVideo(e.target.value)}
                  placeholder="https://youtube.com/… or direct video URL"
                  className="input-field w-full"
                />
                <p className="text-gray-300 text-xs mt-1">YouTube, Vimeo or direct .mp4 links accepted.</p>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  {formSubmitting
                    ? <div className="w-4 h-4 border-2 border-jet border-t-transparent rounded-full animate-spin" />
                    : <Star className="w-4 h-4" />}
                  Submit Review
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Filter + Sort toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(['all', 'verified', 5, 4, 3, 2, 1] as const).map(f => (
            <button
              key={String(f)}
              onClick={() => setFilterRating(f)}
              className={`px-3 py-1.5 rounded-premium-sm text-xs font-medium transition-all ${
                filterRating === f ? 'bg-gold text-jet' : 'bg-white text-gray-500 hover:bg-white/70'
              }`}
            >
              {f === 'all' ? 'All' : f === 'verified' ? '✓ Verified' : `${f}★`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">Sort:</span>
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
      </div>

      {/* ── Review list ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse h-32" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-14">
          <MessageSquare className="w-12 h-12 text-white/15 mx-auto mb-3" />
          <p className="text-gray-400">
            {filterRating === 'all'
              ? 'No reviews yet. Be the first to review this product!'
              : 'No reviews match this filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={user?.id}
              isSeller={isSeller}
              hasVoted={votedHelpful.has(review.id)}
              onHelpful={() => handleHelpful(review.id, review.helpfulCount)}
              onFlag={() => handleFlag(review.id)}
              respondingTo={respondingTo}
              responseText={responseText}
              responseSaving={responseSaving}
              onStartResponse={() => { setRespondingTo(review.id); setResponseText(review.sellerResponse?.text || ''); }}
              onCancelResponse={() => { setRespondingTo(null); setResponseText(''); }}
              onSaveResponse={() => handleSaveResponse(review.id)}
              onResponseTextChange={setResponseText}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {reviews.length >= 50 && (
        <div className="text-center">
          <button className="btn-glass flex items-center gap-2 mx-auto text-sm">
            <ChevronDown className="w-4 h-4" /> Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ReviewCard sub-component ─────────────────────────────────────────────────

function ReviewCard({
  review, currentUserId, isSeller, hasVoted,
  onHelpful, onFlag,
  respondingTo, responseText, responseSaving,
  onStartResponse, onCancelResponse, onSaveResponse, onResponseTextChange,
}: {
  review: ReviewRow;
  currentUserId?: string;
  isSeller: boolean;
  hasVoted: boolean;
  onHelpful: () => void;
  onFlag: () => void;
  respondingTo: string | null;
  responseText: string;
  responseSaving: boolean;
  onStartResponse: () => void;
  onCancelResponse: () => void;
  onSaveResponse: () => void;
  onResponseTextChange: (v: string) => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const isResponding = respondingTo === review.id;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 text-sm">{review.userName || 'Buyer'}</span>
            {review.isVerifiedPurchase && (
              <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-400/20 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> Verified Purchase
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Stars value={review.rating} size="sm" />
            <span className="text-gold text-xs font-semibold">{RATING_LABELS[review.rating]}</span>
          </div>
        </div>
        <span className="text-gray-300 text-xs shrink-0">
          {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Title + body */}
      {review.title && <h4 className="font-semibold text-gray-900 mb-1">{review.title}</h4>}
      <p className="text-gray-600 text-sm leading-relaxed mb-3 whitespace-pre-line">{review.comment}</p>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {review.images.map((img, i) => (
            <button key={i} onClick={() => setLightbox(img)} className="focus:outline-none">
              <img
                src={img}
                alt={`Review photo ${i + 1}`}
                className="w-18 h-18 object-cover rounded-lg border border-gray-200 hover:border-gold/40 transition-colors"
                style={{ width: 72, height: 72 }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Video */}
      {review.videoUrl && (
        <a
          href={review.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-gold text-sm mb-3 hover:underline"
        >
          <Video className="w-4 h-4" /> Watch review video
        </a>
      )}

      {/* Seller response */}
      {review.sellerResponse && !isResponding && (
        <div className="mt-3 pt-3 border-t border-gray-200 bg-gold/5 rounded-premium-sm p-3">
          <p className="text-xs font-bold text-gold mb-1 flex items-center gap-1">
            <Reply className="w-3.5 h-3.5" /> Seller Response
          </p>
          <p className="text-gray-600 text-sm leading-relaxed">{review.sellerResponse.text}</p>
          <p className="text-gray-300 text-xs mt-1">
            {formatDistanceToNow(new Date(review.sellerResponse.respondedAt), { addSuffix: true })}
          </p>
        </div>
      )}

      {/* Seller response input */}
      {isSeller && isResponding && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs font-bold text-gold mb-2 flex items-center gap-1">
            <Reply className="w-3.5 h-3.5" /> Your Response
          </p>
          <textarea
            rows={3}
            value={responseText}
            onChange={e => onResponseTextChange(e.target.value)}
            placeholder="Thank the buyer or address their concern professionally…"
            maxLength={500}
            className="input-field w-full resize-none text-sm mb-2"
          />
          <p className="text-gray-300 text-xs mb-2">{responseText.length}/500</p>
          <div className="flex gap-2">
            <button
              onClick={onCancelResponse}
              className="btn-outline text-xs py-1.5 px-3"
            >Cancel</button>
            <button
              onClick={onSaveResponse}
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
      )}

      {/* Action bar */}
      <div className="flex items-center gap-4 pt-3 mt-3 border-t border-gray-100">
        <button
          onClick={onHelpful}
          disabled={!currentUserId || hasVoted || review.userId === currentUserId}
          className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 ${
            hasVoted ? 'text-gold' : 'text-gray-400 hover:text-[#1E3A5F]'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Helpful{review.helpfulCount > 0 ? ` (${review.helpfulCount})` : ''}
        </button>

        {isSeller && !isResponding && !review.sellerResponse && (
          <button
            onClick={onStartResponse}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gold transition-colors"
          >
            <Reply className="w-3.5 h-3.5" /> Respond
          </button>
        )}

        {isSeller && review.sellerResponse && !isResponding && (
          <button
            onClick={onStartResponse}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gold transition-colors"
          >
            <Reply className="w-3.5 h-3.5" /> Edit Response
          </button>
        )}

        {currentUserId && currentUserId !== review.userId && (
          <button
            onClick={onFlag}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            title="Report this review"
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Report
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Review" className="max-w-full max-h-full rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}
