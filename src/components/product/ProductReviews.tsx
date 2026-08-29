import { useState, useEffect, useCallback } from "react";
import { Star, ThumbsUp, MessageSquare, User, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface DBReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  helpfulVoters: string[];
  createdAt: string;
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
          className={`${s} ${i <= rating ? "fill-[#F5A300] text-[#F5A300]" : "text-slate-300"}`}
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
              i <= (hover || value) ? "fill-[#F5A300] text-[#F5A300]" : "text-slate-300"
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
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
          helpfulCount, helpfulVoters, createdAt,
          users(firstName, lastName)
        `)
        .eq("productId", productId)
        .eq("status", "published")
        .order("createdAt", { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (data ?? []) as unknown as DBReview[];
      setReviews(rows);

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
    } finally {
      setLoadingReviews(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) fetchReviews();
  }, [productId, fetchReviews]);

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
      const [singleOrderRes, multiOrderRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id")
          .eq("buyerId", user.id)
          .eq("productId", productId)
          .in("status", ["delivered", "completed"])
          .limit(1)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("orderId, orders!inner(id, buyerId, status)")
          .eq("productId", productId)
          .limit(1)
          .maybeSingle(),
      ]);

      const orderData =
        singleOrderRes.data ??
        (() => {
          const item = multiOrderRes.data as { orderId: string; orders: { id: string; buyerId: string; status: string } } | null;
          if (
            item?.orders &&
            item.orders.buyerId === user.id &&
            ["delivered", "completed"].includes(item.orders.status)
          ) {
            return { id: item.orderId };
          }
          return null;
        })();

      if (!orderData) {
        toast({
          title: "Purchase required",
          description: "You can only review products you have purchased and received.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        productId,
        userId: user.id,
        orderId: orderData.id,
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
  const hasReviews = reviews.length > 0 || displayCount > 0;

  return (
    <div className="rounded-2xl border border-[#DCE3ED] bg-white p-6 shadow-[0_12px_30px_rgba(15,35,70,0.05)] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#1F5BD8]">Buyer feedback</p>
          <h2 className="mt-1 font-display text-lg font-bold text-[#0A234F]">Customer reviews</h2>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-[#F5A300] font-semibold text-[#0A234F] hover:bg-[#E59600]"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Write a review
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmitReview} className="rounded-xl border border-[#DCE3ED] bg-[#F8FAFC] p-4 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="h-4 w-4 text-[#1F5BD8]" />
            Reviews are available to confirmed purchasers after delivery.
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Your rating</p>
            <InteractiveStarRating value={newRating} onChange={setNewRating} />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Review title</p>
            <input
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Summarize your experience"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={160}
            />
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Your review</p>
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
              Submit review
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

      {loadingReviews ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      ) : !hasReviews ? (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-[#D6DFEB] bg-[#F8FAFC] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm font-bold text-[#0A234F]">No reviews yet</p>
            <p className="mt-1 text-sm text-slate-500">Be the first confirmed purchaser to review this product.</p>
          </div>
          <div className="flex items-center gap-1" aria-label="No rating yet">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="h-4 w-4 text-slate-300" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 rounded-xl bg-[#F8FAFC] p-5 sm:grid-cols-[160px_1fr]">
            <div className="flex flex-col justify-center">
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl font-extrabold text-[#0A234F]">{displayRating}</span>
                <span className="pb-1 text-xs text-slate-500">/ 5</span>
              </div>
              <StarRating rating={Math.round(productRating)} size="md" />
              <p className="mt-1 text-xs text-slate-500">{displayCount} review{displayCount !== 1 ? "s" : ""}</p>
            </div>
            <div className="space-y-2">
              {ratingDistribution.map((r) => (
                <div key={r.stars} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-slate-500">{r.stars} star{r.stars !== 1 && "s"}</span>
                  <Progress value={r.pct} className="h-2 flex-1" />
                  <span className="w-8 text-right text-xs text-slate-500">{r.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {reviews.map((review) => {
              const firstName = review.users?.firstName ?? "";
              const lastName = review.users?.lastName ?? "";
              const authorName = [firstName, lastName].filter(Boolean).join(" ") || "Buyer";
              const alreadyVoted = user ? review.helpfulVoters.includes(user.id) : false;
              return (
                <div key={review.id} className="rounded-xl border border-[#E3E9F1] p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F8FAFC]">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[#0A234F]">{authorName}</span>
                          {review.isVerifiedPurchase && (
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                              Confirmed purchase
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.title && (
                    <h4 className="text-sm font-semibold text-[#0A234F]">{review.title}</h4>
                  )}
                  {review.comment && (
                    <p className="text-sm leading-relaxed text-slate-600">{review.comment}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleHelpful(review)}
                    disabled={alreadyVoted || helpfulVoting.has(review.id)}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${
                      alreadyVoted
                        ? "text-[#1F5BD8] cursor-default"
                        : "text-slate-500 hover:text-[#0A234F]"
                    }`}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    Helpful ({review.helpfulCount})
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductReviews;
