import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Star, Search, MessageSquare, ThumbsUp, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface Review {
  id: string;
  productId: string;
  product: string;
  userId: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  status: "published" | "hidden" | "removed" | "flagged";
  sellerResponse: { text: string; respondedAt: string } | null;
  helpfulCount: number;
  isAbusive: boolean;
}

const statusColor: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  hidden: "bg-amber-500/15 text-amber-700 border-amber-200",
  flagged: "bg-orange-500/15 text-orange-700 border-orange-200",
  removed: "bg-red-500/15 text-red-700 border-red-200",
};

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const SellerReviewsPage = () => {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replySaving, setReplySaving] = useState(false);
  const [replyError, setReplyError] = useState("");

  const fetchReviews = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: products } = await supabase
        .from("products")
        .select("id, title")
        .eq("sellerId", user.id);

      if (!products?.length) { setReviews([]); setLoading(false); return; }

      const productIds = products.map((p: { id: string }) => p.id);
      const titleMap: Record<string, string> = Object.fromEntries(
        (products as { id: string; title: string }[]).map((p) => [p.id, p.title])
      );

      const { data, error } = await supabase
        .from("reviews")
        .select("id, productId, userId, rating, title, comment, sellerResponse, status, isAbusive, helpfulCount, createdAt")
        .in("productId", productIds)
        .not("status", "in", "(removed)")
        .order("createdAt", { ascending: false });

      if (error) throw error;

      setReviews(
        (data ?? []).map((r) => ({
          id: r.id,
          productId: r.productId,
          product: titleMap[r.productId] ?? "Product",
          userId: r.userId,
          rating: r.rating,
          title: r.title ?? "",
          text: r.comment ?? "",
          date: new Date(r.createdAt).toISOString().slice(0, 10),
          status: r.status as Review["status"],
          sellerResponse: r.sellerResponse ?? null,
          helpfulCount: r.helpfulCount ?? 0,
          isAbusive: r.isAbusive ?? false,
        }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  // Computed stats
  const totalReviews = reviews.length;
  const avgRating = totalReviews
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
    : 0;
  const withReply = reviews.filter((r) => r.sellerResponse).length;
  const responseRate = totalReviews ? Math.round((withReply / totalReviews) * 100) : 0;
  const awaitingReply = reviews.filter((r) => !r.sellerResponse && r.status === "published").length;
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    return { stars, count, pct: totalReviews ? Math.round((count / totalReviews) * 100) : 0 };
  });

  const filtered = reviews.filter(
    (r) =>
      r.product.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((r) => r.status === status);
  const withReplyFilter = (hasReply: boolean) =>
    filtered.filter((r) => (hasReply ? !!r.sellerResponse : !r.sellerResponse));

  const handleReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setReplySaving(true);
    setReplyError("");
    try {
      const resp = { text: replyText.trim(), respondedAt: new Date().toISOString() };
      const { error } = await supabase
        .from("reviews")
        .update({ sellerResponse: resp })
        .eq("id", selectedReview.id);
      if (error) throw error;
      setReviews((prev) =>
        prev.map((r) => r.id === selectedReview.id ? { ...r, sellerResponse: resp } : r)
      );
      setSelectedReview(null);
      setReplyText("");
    } catch (e) {
      setReplyError(e instanceof Error ? e.message : "Failed to save reply.");
    } finally {
      setReplySaving(false);
    }
  };

  const renderTable = (data: Review[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead className="hidden md:table-cell">Review</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Reply</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading reviews…</TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No reviews found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{r.product}</TableCell>
              <TableCell><StarDisplay rating={r.rating} /></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{r.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[r.status] ?? ""}>{r.status}</Badge>
              </TableCell>
              <TableCell>
                {r.sellerResponse
                  ? <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-200">Replied</Badge>
                  : <Badge variant="outline" className="bg-amber-500/15 text-amber-700 border-amber-200">Pending</Badge>}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => { setSelectedReview(r); setReplyText(r.sellerResponse?.text ?? ""); setReplyError(""); }}
                >
                  {r.sellerResponse ? "View" : "Reply"}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and respond to buyer reviews.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgRating || "—"}</p>
                <p className="text-xs text-muted-foreground">Avg. Rating</p>
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
                <p className="text-2xl font-bold text-foreground">{totalReviews}</p>
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
                <p className="text-2xl font-bold text-foreground">{responseRate}%</p>
                <p className="text-xs text-muted-foreground">Response Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{awaitingReply}</p>
                <p className="text-xs text-muted-foreground">Awaiting Reply</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rating Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {distribution.map((d) => (
              <div key={d.stars} className="flex sm:flex-col items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground">{d.stars}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </div>
                <Progress value={d.pct} className="h-2 flex-1 sm:w-full" />
                <span className="text-xs text-muted-foreground w-8 text-right sm:text-center">{d.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search + Tabs */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search reviews..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending">Pending Reply</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="pending"><Card><CardContent className="pt-4">{renderTable(withReplyFilter(false))}</CardContent></Card></TabsContent>
        <TabsContent value="published"><Card><CardContent className="pt-4">{renderTable(byStatus("published"))}</CardContent></Card></TabsContent>
        <TabsContent value="flagged"><Card><CardContent className="pt-4">{renderTable(byStatus("flagged"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Review Detail / Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => { setSelectedReview(null); setReplyError(""); }}>
        {selectedReview && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review</DialogTitle>
              <DialogDescription>{selectedReview.product}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <StarDisplay rating={selectedReview.rating} />
                <span className="text-xs text-muted-foreground">{selectedReview.date}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{selectedReview.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{selectedReview.text}</p>
              </div>

              {selectedReview.sellerResponse && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">Your Reply</p>
                  <p className="text-sm text-foreground">{selectedReview.sellerResponse.text}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {selectedReview.sellerResponse ? "Edit Reply" : "Your Reply"}
                </p>
                {replyError && (
                  <p className="text-xs text-destructive mb-1">{replyError}</p>
                )}
                <Textarea
                  placeholder="Write a response to this review..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedReview(null); setReplyError(""); }}>Cancel</Button>
              <Button onClick={handleReply} disabled={!replyText.trim() || replySaving}>
                <MessageSquare className="h-4 w-4 mr-1" />
                {replySaving ? "Saving…" : selectedReview.sellerResponse ? "Update Reply" : "Send Reply"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SellerReviewsPage;
