import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Star, ThumbsUp, CheckCircle, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  images?: string[];
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  averageRating: number;
  totalReviews: number;
}

export default function ProductReviews({ productId, averageRating, totalReviews }: ProductReviewsProps) {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [filter, setFilter] = useState<'all' | 'verified' | number>('all');

  // Review form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reviews')
        .select('*')
        .eq('productId', productId)
        .order('createdAt', { ascending: false });

      if (filter === 'verified') {
        query = query.eq('isVerifiedPurchase', true);
      } else if (typeof filter === 'number') {
        query = query.eq('rating', filter);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }, [productId, filter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to write a review');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        productId,
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        rating,
        title: title.trim(),
        comment: comment.trim(),
        helpfulCount: 0,
      });

      if (error) throw error;

      // Reset form
      setRating(5);
      setTitle('');
      setComment('');
      setShowWriteReview(false);

      // Refresh reviews
      fetchReviews();
      alert('Thank you for your review!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      if (review.rating >= 1 && review.rating <= 5) {
        distribution[review.rating - 1]++;
      }
    });
    return distribution.reverse(); // 5 stars first
  };

  const renderStars = (rating: number, interactive: boolean = false, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= rating
                ? 'fill-gold text-gold'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-24 bg-gray-200 rounded"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const ratingDistribution = getRatingDistribution();

  return (
    <div className="space-y-6">
      {/* Header with Average Rating */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Customer Reviews</h2>
          {totalReviews > 0 && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-gold mb-1">
                  {averageRating.toFixed(1)}
                </div>
                {renderStars(Math.round(averageRating), false, 'lg')}
                <p className="text-sm text-white/60 mt-2">{totalReviews} reviews</p>
              </div>
              
              {/* Rating Distribution */}
              <div className="flex-1 space-y-2">
                {[5, 4, 3, 2, 1].map((stars, index) => {
                  const count = ratingDistribution[index];
                  const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                  
                  return (
                    <button
                      key={stars}
                      onClick={() => setFilter(stars)}
                      className="flex items-center gap-3 w-full hover:bg-white/5 rounded px-2 py-1 transition-colors"
                    >
                      <span className="text-sm text-white/60 w-12">{stars} star</span>
                      <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gold h-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-white/60 w-12 text-right">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {user && !showWriteReview && (
          <button
            onClick={() => setShowWriteReview(true)}
            className="btn-primary"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-gold text-navy-900 font-medium'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          All Reviews
        </button>
        <button
          onClick={() => setFilter('verified')}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
            filter === 'verified'
              ? 'bg-gold text-navy-900 font-medium'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Verified Purchases
        </button>
      </div>

      {/* Write Review Form */}
      {showWriteReview && (
        <form onSubmit={handleSubmitReview} className="card-glass">
          <h3 className="text-xl font-bold text-white mb-4">Write Your Review</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Your Rating
              </label>
              {renderStars(rating, true, 'lg')}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Review Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-field"
                placeholder="Sum up your experience"
                required
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input-field resize-none"
                rows={5}
                placeholder="Tell us about your experience with this product"
                required
                maxLength={1000}
              />
              <p className="text-xs text-white/40 mt-1">
                {comment.length}/1000 characters
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowWriteReview(false)}
                className="btn-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting || !title.trim() || !comment.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="card-glass text-center py-12">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">
              {filter === 'all'
                ? 'No reviews yet. Be the first to review this product!'
                : 'No reviews match your filter.'}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="card-glass">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-white">{review.userName}</span>
                    {review.isVerifiedPurchase && (
                      <span className="flex items-center gap-1 text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        <CheckCircle className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  {renderStars(review.rating, false, 'sm')}
                </div>
                <span className="text-sm text-white/40">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
              </div>

              {review.title && (
                <h4 className="font-semibold text-white mb-2">{review.title}</h4>
              )}
              
              <p className="text-white/70 mb-3 whitespace-pre-line">{review.comment}</p>

              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {review.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Review ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                  Helpful {review.helpfulCount > 0 && `(${review.helpfulCount})`}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
