import { useState, useEffect, useCallback } from "react";
import { Star, ThumbsUp, MessageSquare, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import SafetyReportDialog from "@/components/safety/SafetyReportDialog";

interface DBReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  helpfulVoters: string[];
  createdAt: string;
  userId: string;
  users: { firstName: string | null; lastName: string | null } | null;
}

interface RatingBucket {
  stars: number;
  count: number;
  pct: number;
}

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const s = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= rating ? "fill-amber-400 text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
};

interface InteractiveStarRatingProps {
  value: number;
  onChange: (v: number) => void;
}

const InteractiveStarRating = ({ value, onChange }: InteractiveStarRatingProps) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="p-0.5"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              i <= (hover || value) ? "fill-amber-400 text-primary" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

interface ProductReviewsProps {
  productId: string;
  productRating: number;
  reviewCount: number;
}

const ProductReviews = ({ productId, productRating, reviewCount }: ProductReviewsProps) => {
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [eligibleOrderId, setEligibleOrderId] = useState<string | null>(null);

  const [reviews, setReviews] = useState<DBReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<RatingBucket[]>([]);
  const [helpfulVoting, setHelpfulVoting] = useState<Set<string>>(new Set());

  const fetchReviews = useCallback(async () => {
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(`
          id, rating, title, comment, isVerifiedPurchase,
          helpfulCount, helpfulVoters, createdAt, userId,
          users(firstName, lastName)
        `)
        .eq("productId", productId)
        .eq("status", "published")
        .order("createdAt", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data ?? []) as unknown as DBReview[];
      setReviews(rows);

      // Build rating distribution from real data
      const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      rows.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++; });
      const total = rows.length;
      const dist: RatingBucket[] = [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: counts[stars],
        pct: total > 0 ? Math.round((counts[stars] / total) * 100) : 0,
      }));
      setRatingDistribution(dist);
    } catch (err) {
      console.error("Failed to load reviews:", err);
      // silently fall back to empty state
    } finally {
      setLoadingReviews(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId, fetchReviews]);

  useEffect(() => {
    setShowForm(false);
    setEligibleOrderId(null);
  }, [productId, user?.id]);

  const findEligibleOrder = useCallback(async (): Promise<string | null> => {
    if (!user) return null;

    const [singleOrderRes, multiOrderRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id")
        .eq("buyerId", user.id)
        .eq("productId", productId)
        .in("status", ["delivered", "completed"])
        .order("createdAt", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("orderId, orders!inner(id, buyerId, status)")
        .eq("productId", productId)
        .eq("orders.buyerId", user.id)
        .in("orders.status", ["delivered", "completed"])
        .limit(1)
        .maybeSingle(),
    ]);

    if (singleOrderRes.error) throw singleOrderRes.error;
    if (multiOrderRes.error) throw multiOrderRes.error;

    if (singleOrderRes.data?.id) return singleOrderRes.data.id;

    const multiOrder = multiOrderRes.data as { orderId?: string } | null;
    return multiOrder?.orderId ?? null;
  }, [productId, user]);

  const handleWriteReview = async () => {
    if (!user) {
      promptAuth("review");
      return;
    }

    setCheckingEligibility(true);
    try {
      const { data: existingReview, error: existingReviewError } = await supabase
        .from("reviews")
        .select("id")
        .eq("productId", productId)
        .eq("userId", user.id)
        .limit(1)
        .maybeSingle();

      if (existingReviewError) throw existingReviewError;
      if (existingReview) {
        toast({ title: "Already reviewed", description: "You have already submitted a review for this product." });
        return;
      }

      const orderId = await findEligibleOrder();
      if (!orderId) {
        toast({
          title: "Verified purchase required",
          description: "Only buyers who purchased and received this product through Loadify Market can review it.",
          variant: "destructive",
        });
        return;
      }

      setEligibleOrderId(orderId);
      setShowForm(true);
    } catch (error) {
      console.error("Failed to verify review eligibility:", error);
      toast({ title: "Could not verify purchase", description: "Please try again.", variant: "destructive" });
    } finally {
      setCheckingEligibility(false);
    }
  };

  const handleHelpful = async (review: DBReview) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to mark reviews as helpful." });
      return;
    }
    if (review.helpfulVoters.includes(user.id) || helpfulVoting.has(review.id)) return;

    setHelpfulVoting((prev) => new Set(prev).add(review.id));
    try {
      const newVoters = [...review.helpfulVoters, user.id];
      await supabase
        .from("reviews")
        .update({ helpfulCount: review.helpfulCount + 1, helpfulVoters: newVoters })
        .eq("id", review.id);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? { ...r, helpfulCount: r.helpfulCount + 1, helpfulVoters: newVoters }
            : r,
        ),
      );
    } catch {
      toast({ title: "Error", description: "Could not record your vote. Please try again.", variant: "destructive" });
    } finally {
      setHelpfulVoting((prev) => { const s = new Set(prev); s.delete(review.id); return s; });
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to write a review." });
      return;
    }
    if (newRating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const orderId = eligibleOrderId ?? await findEligibleOrder();

      if (!orderId) {
        toast({
          title: "Verified purchase required",
          description: "Only buyers who purchased and received this product through Loadify Market can review it.",
          variant: "destructive",
        });
        setShowForm(false);
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        productId,
        userId: user.id,
        orderId,
        rating: newRating,
        title: newTitle.trim() || null,
        comment: newComment.trim() || null,
        isVerifiedPurchase: true,
        status: "published",
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already reviewed", description: "You have already submitted a review for this product." });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setShowForm(false);
      setNewRating(0);
      setNewTitle("");
      setNewComment("");
      await fetchReviews();
    } catch {
      toast({ title: "Error", description: "Could not submit your review. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = productRating > 0 ? productRating.toFixed(1) : "—";
  const displayCount = reviewCount > 0 ? reviewCount : reviews.length;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Reviews & Ratings
        </h2>
        <Button size="sm" onClick={showForm ? () => setShowForm(false) : handleWriteReview} disabled={checkingEligibility}>
          {checkingEligibility ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />}
          {showForm ? "Cancel Review" : "Write a Review"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold text-foreground">{displayRating}</span>
          <StarRating rating={Math.round(productRating)} size="md" />
          <p className="text-xs text-muted-foreground mt-1">{displayCount} review{displayCount !== 1 ? "s" : ""}</p>
        </div>
        <div className="space-y-2">
          {ratingDistribution.map((r) => (
            <div key={r.stars} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12">{r.stars} star{r.stars !== 1 && "s"}</span>
              <Progress value={r.pct} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right">{r.count}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Reviews can only be submitted by signed-in buyers with a verified delivered or completed purchase of this product.
      </p>

      {/* Write Review Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground">Write Your Review</h3>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your Rating</p>
            <InteractiveStarRating value={newRating} onChange={setNewRating} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Review Title</p>
            <input
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Summarize your experience"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={160}
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your Review</p>
            <Textarea
              placeholder="Share your experience with this product..."
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              maxLength={2000}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Submit Review
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {loadingReviews ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          No reviews yet. Be the first to review this product.
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const firstName = review.users?.firstName ?? "";
            const lastName = review.users?.lastName ?? "";
            const authorName = [firstName, lastName].filter(Boolean).join(" ") || "Buyer";
            const alreadyVoted = user ? review.helpfulVoters.includes(user.id) : false;
            return (
              <div key={review.id} className="border border-border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{authorName}</span>
                        {review.isVerifiedPurchase && (
                          <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/40">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                {review.title && (
                  <h4 className="text-sm font-semibold text-foreground">{review.title}</h4>
                )}
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleHelpful(review)}
                    disabled={alreadyVoted || helpfulVoting.has(review.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs transition-colors ${
                      alreadyVoted
                        ? "text-primary cursor-default"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Helpful ({review.helpfulCount})
                  </button>
                  {user?.id !== review.userId && (
                    <>
                      <SafetyReportDialog
                        targetType="review"
                        targetId={review.id}
                        triggerLabel="Report review"
                        className="h-auto px-2 py-1 text-xs text-muted-foreground"
                      />
                      <SafetyReportDialog
                        targetType="user"
                        targetId={review.userId}
                        context="review"
                        contextId={review.id}
                        triggerLabel="Report user"
                        className="h-auto px-2 py-1 text-xs text-muted-foreground"
                      />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
