import { useState } from "react";
import { Star, ThumbsUp, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

interface Review {
  id: number;
  author: string;
  rating: number;
  date: string;
  title: string;
  text: string;
  helpful: number;
  verified: boolean;
}

const mockReviews: Review[] = [
  { id: 1, author: "Mark Thompson", rating: 5, date: "2025-03-15", title: "Excellent quality lot", text: "Received the pallet within 3 days. Items were exactly as described — about 90% were in perfect condition. Great value for resale. Will definitely buy again from this seller.", helpful: 12, verified: true },
  { id: 2, author: "Sarah Williams", rating: 4, date: "2025-03-10", title: "Good deal, minor issues", text: "Overall a solid purchase. A couple of items had minor cosmetic damage not mentioned in the listing, but the price more than makes up for it. Communication with seller was quick.", helpful: 8, verified: true },
  { id: 3, author: "James Cooper", rating: 5, date: "2025-03-05", title: "Best wholesale supplier", text: "This is my third purchase and the quality is consistently excellent. Packaging was secure and delivery was on time. Highly recommended for anyone in the resale business.", helpful: 15, verified: true },
  { id: 4, author: "Emma Davies", rating: 3, date: "2025-02-28", title: "Decent but could be better", text: "The lot was okay. About 70% was sellable, which is lower than I expected based on the 'Grade A/B' description. Seller did respond to my concerns though.", helpful: 5, verified: false },
  { id: 5, author: "David Chen", rating: 5, date: "2025-02-20", title: "Superb value", text: "Absolutely fantastic lot. Every single item was in great condition. The manifest was accurate and delivery was well-organised. 10/10.", helpful: 9, verified: true },
];

const ratingDistribution = [
  { stars: 5, count: 42, pct: 58 },
  { stars: 4, count: 18, pct: 25 },
  { stars: 3, count: 8, pct: 11 },
  { stars: 2, count: 3, pct: 4 },
  { stars: 1, count: 1, pct: 1 },
];

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
  const s = size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${s} ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
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
              i <= (hover || value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

interface ProductReviewsProps {
  productRating: number;
  reviewCount: number;
}

const ProductReviews = ({ productRating, reviewCount }: ProductReviewsProps) => {
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [reviews, setReviews] = useState(mockReviews);
  const [helpfulClicked, setHelpfulClicked] = useState<Set<number>>(new Set());

  const handleHelpful = (id: number) => {
    if (helpfulClicked.has(id)) return;
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, helpful: r.helpful + 1 } : r)));
    setHelpfulClicked((prev) => new Set(prev).add(id));
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Reviews & Ratings
        </h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <MessageSquare className="h-4 w-4 mr-1" />
          Write a Review
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold text-foreground">{productRating}</span>
          <StarRating rating={Math.round(productRating)} size="md" />
          <p className="text-xs text-muted-foreground mt-1">{reviewCount} reviews</p>
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

      {/* Write Review Form */}
      {showForm && (
        <div className="border border-border rounded-lg p-4 space-y-4 bg-muted/20">
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
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Your Review</p>
            <Textarea placeholder="Share your experience with this product..." rows={3} />
          </div>
          <div className="flex gap-2">
            <Button size="sm">Submit Review</Button>
            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{review.author}</span>
                    {review.verified && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-200">
                        Verified Buyer
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </div>
              <StarRating rating={review.rating} />
            </div>
            <h4 className="text-sm font-semibold text-foreground">{review.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
            <button
              onClick={() => handleHelpful(review.id)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${
                helpfulClicked.has(review.id)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
              Helpful ({review.helpful})
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductReviews;
