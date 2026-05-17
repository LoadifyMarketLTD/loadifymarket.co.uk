import { useState, useEffect } from "react";
import { Star, Search, MessageSquare, ThumbsUp, Pencil, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";

interface ReviewRow {
  id: string;
  productId: string;
  rating: number;
  title: string;
  comment: string;
  sellerResponse: string | null;
  status: string;
  createdAt: string;
  products: { title: string } | null;
}

interface ReviewableOrder {
  orderId: string;
  productId: string;
  productTitle: string;
}

const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        onClick={() => onChange(i)}
        className="focus:outline-none"
        aria-label={`Rate ${i} stars`}
      >
        <Star className={`h-6 w-6 transition-colors ${i <= value ? "fill-amber-400 text-primary" : "text-muted-foreground/30 hover:text-primary"}`} />
      </button>
    ))}
  </div>
);

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-primary" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const BuyerReviews = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ReviewRow | null>(null);

  // Write-review dialog state
  const [writeOpen, setWriteOpen] = useState(false);
  const [reviewableOrders, setReviewableOrders] = useState<ReviewableOrder[]>([]);
  const [newReview, setNewReview] = useState({ orderId: "", productId: "", productTitle: "", rating: 5, title: "", comment: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("reviews")
          .select("id, productId, rating, title, comment, sellerResponse, status, createdAt, products(title)")
          .eq("userId", user.id)
          .order("createdAt", { ascending: false });
        if (error) throw error;
        setReviews((data as unknown as ReviewRow[]) || []);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [user]);

  // Load reviewable (delivered, not-yet-reviewed) orders
  useEffect(() => {
    if (!user) return;
    const fetchReviewableOrders = async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, productId, products(title)")
        .eq("buyerId", user.id)
        .eq("status", "delivered");
      if (!orders?.length) return;
      const { data: existingReviews } = await supabase
        .from("reviews")
        .select("orderId")
        .eq("userId", user.id);
      const reviewedOrderIds = new Set((existingReviews ?? []).map((r: { orderId: string }) => r.orderId));
      const reviewable = orders
        .filter((o) => !reviewedOrderIds.has(o.id))
        .map((o) => {
          const prod = Array.isArray(o.products) ? o.products[0] : o.products;
          return { orderId: o.id, productId: o.productId, productTitle: (prod as { title?: string })?.title ?? "Unknown Product" };
        });
      setReviewableOrders(reviewable);
    };
    fetchReviewableOrders();
  }, [user]);

  const filtered = reviews.filter(
    (r) =>
      (r.products?.title ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (r.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((r) => r.status === status);

  const handleOrderSelect = (orderId: string) => {
    const order = reviewableOrders.find((o) => o.orderId === orderId);
    if (order) setNewReview((prev) => ({ ...prev, orderId: order.orderId, productId: order.productId, productTitle: order.productTitle }));
  };

  const handleSubmitReview = async () => {
    if (!user || !newReview.orderId || !newReview.productId || !newReview.rating) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("reviews").insert({
        userId: user.id,
        orderId: newReview.orderId,
        productId: newReview.productId,
        rating: newReview.rating,
        title: newReview.title.trim() || null,
        comment: newReview.comment.trim() || null,
        isVerifiedPurchase: true,
        status: "published",
      });
      if (error) throw error;
      toast({ title: "Review submitted", description: "Thank you for your feedback!" });
      setWriteOpen(false);
      setNewReview({ orderId: "", productId: "", productTitle: "", rating: 5, title: "", comment: "" });
      // Refresh reviews list
      const { data } = await supabase
        .from("reviews")
        .select("id, productId, rating, title, comment, sellerResponse, status, createdAt, products(title)")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false });
      setReviews((data as unknown as ReviewRow[]) || []);
      // Remove the reviewed order from reviewable list
      setReviewableOrders((prev) => prev.filter((o) => o.orderId !== newReview.orderId));
    } catch (err) {
      toast({ title: "Failed to submit review", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
    pct: reviews.length
      ? Math.round((reviews.filter((r) => r.rating === stars).length / reviews.length) * 100)
      : 0,
  }));

  const renderTable = (data: ReviewRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead className="hidden md:table-cell">Title</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No reviews found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[180px] truncate">
                {r.products?.title ?? "—"}
              </TableCell>
              <TableCell><StarDisplay rating={r.rating} /></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{r.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(r.createdAt).toLocaleDateString("en-GB")}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={r.status === "published" || r.status === "approved"
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
                  : "bg-primary/15 text-primary border-primary/40"}>
                  {r.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelected(r)}>View</Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Reviews</h1>
          <p className="text-muted-foreground text-sm mt-1">Reviews you've left for products.</p>
        </div>
        {reviewableOrders.length > 0 && (
          <Button size="sm" onClick={() => setWriteOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Write a Review
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{loading ? "—" : avgRating}</p>
                <p className="text-xs text-muted-foreground">Avg. Rating Given</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{loading ? "—" : reviews.length}</p>
                <p className="text-xs text-muted-foreground">Total Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "—" : reviews.filter((r) => r.sellerResponse).length}
                </p>
                <p className="text-xs text-muted-foreground">Seller Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      {!loading && reviews.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {distribution.map((d) => (
                <div key={d.stars} className="flex sm:flex-col items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-foreground">{d.stars}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-primary" />
                  </div>
                  <Progress value={d.pct} className="h-2 flex-1 sm:w-full" />
                  <span className="text-xs text-muted-foreground w-8 text-right sm:text-center">{d.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search reviews..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(filtered)}</div></CardContent></Card></TabsContent>
        <TabsContent value="published"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("published"))}</div></CardContent></Card></TabsContent>
        <TabsContent value="pending"><Card><CardContent className="pt-4"><div className="overflow-x-auto">{renderTable(byStatus("pending"))}</div></CardContent></Card></TabsContent>
      </Tabs>

      {/* Review Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.products?.title ?? "Review"}</DialogTitle>
              <DialogDescription>
                {new Date(selected.createdAt).toLocaleDateString("en-GB")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <StarDisplay rating={selected.rating} />
                <Badge variant="outline" className={selected.status === "published" || selected.status === "approved"
                  ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
                  : "bg-primary/15 text-primary border-primary/40"}>
                  {selected.status}
                </Badge>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{selected.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{selected.comment}</p>
              </div>
              {selected.sellerResponse && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">Seller Reply</p>
                  <p className="text-sm text-foreground">{selected.sellerResponse}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Write a Review Dialog */}
      <Dialog open={writeOpen} onOpenChange={(open) => { if (!open) { setWriteOpen(false); setNewReview({ orderId: "", productId: "", productTitle: "", rating: 5, title: "", comment: "" }); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>Share your experience with a product you purchased.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Select Product</Label>
              <Select value={newReview.orderId} onValueChange={handleOrderSelect}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose an order to review…" />
                </SelectTrigger>
                <SelectContent>
                  {reviewableOrders.map((o) => (
                    <SelectItem key={o.orderId} value={o.orderId}>{o.productTitle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Rating</Label>
              <StarPicker value={newReview.rating} onChange={(v) => setNewReview((prev) => ({ ...prev, rating: v }))} />
            </div>
            <div>
              <Label className="text-xs">Review Title (optional)</Label>
              <Input
                placeholder="Summarise your experience…"
                className="mt-1"
                value={newReview.title}
                onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
                maxLength={120}
              />
            </div>
            <div>
              <Label className="text-xs">Your Review (optional)</Label>
              <Textarea
                placeholder="Tell other buyers what you thought of this product…"
                className="mt-1 resize-none"
                rows={4}
                value={newReview.comment}
                onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={submitting || !newReview.orderId}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Star className="h-4 w-4 mr-1" />}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuyerReviews;
