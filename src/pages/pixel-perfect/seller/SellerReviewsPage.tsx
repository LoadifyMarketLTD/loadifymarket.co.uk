import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Star, Search, MessageSquare, ThumbsUp, AlertCircle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Review {
  id: number;
  buyer: string;
  product: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  status: "published" | "pending" | "replied";
  reply?: string;
}

const mockReviews: Review[] = [
  { id: 1, buyer: "Mark Thompson", product: "Samsung Galaxy & iPhone Mixed Lot", rating: 5, title: "Excellent quality lot", text: "Received the pallet within 3 days. Items were exactly as described. Great value.", date: "2025-03-15", status: "replied", reply: "Thank you Mark! Glad you're happy with the purchase. We look forward to serving you again." },
  { id: 2, buyer: "Sarah Williams", product: "Samsung Galaxy & iPhone Mixed Lot", rating: 4, title: "Good deal, minor issues", text: "Overall a solid purchase. A couple of items had minor cosmetic damage.", date: "2025-03-10", status: "published" },
  { id: 3, buyer: "James Cooper", product: "Premium Clothing Pallet", rating: 5, title: "Best wholesale supplier", text: "Third purchase and the quality is consistently excellent.", date: "2025-03-05", status: "replied", reply: "Thanks James! Your loyalty means a lot to us." },
  { id: 4, buyer: "Emma Davies", product: "DeWalt & Makita Power Tools", rating: 3, title: "Decent but could be better", text: "About 70% was sellable, lower than expected based on description.", date: "2025-02-28", status: "pending" },
  { id: 5, buyer: "David Chen", product: "Home & Kitchen Essentials Bundle", rating: 5, title: "Superb value", text: "Every single item was in great condition. Manifest was accurate.", date: "2025-02-20", status: "published" },
  { id: 6, buyer: "Lisa Brown", product: "Sports Equipment Clearance Lot", rating: 2, title: "Disappointed", text: "Several items were damaged beyond what was described. Expected better quality.", date: "2025-02-15", status: "pending" },
  { id: 7, buyer: "Tom Wilson", product: "Premium Clothing Pallet", rating: 4, title: "Solid purchase", text: "Good variety and most items in excellent condition. Fast shipping too.", date: "2025-02-10", status: "published" },
];

const stats = {
  avgRating: 4.2,
  totalReviews: 72,
  responseRate: 85,
  distribution: [
    { stars: 5, count: 42, pct: 58 },
    { stars: 4, count: 18, pct: 25 },
    { stars: 3, count: 8, pct: 11 },
    { stars: 2, count: 3, pct: 4 },
    { stars: 1, count: 1, pct: 1 },
  ],
};

const statusColor: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  pending: "bg-amber-500/15 text-amber-700 border-amber-200",
  replied: "bg-blue-500/15 text-blue-700 border-blue-200",
};

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const SellerReviewsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reviews, setReviews] = useState(mockReviews);

  const filtered = reviews.filter(
    (r) =>
      r.buyer.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((r) => r.status === status);

  const handleReply = () => {
    if (!selectedReview || !replyText.trim()) return;
    setReviews((prev) =>
      prev.map((r) =>
        r.id === selectedReview.id ? { ...r, status: "replied" as const, reply: replyText } : r
      )
    );
    setSelectedReview(null);
    setReplyText("");
  };

  const renderTable = (data: Review[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Buyer</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead className="hidden md:table-cell">Review</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No reviews found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-sm">{r.buyer}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{r.product}</TableCell>
              <TableCell><StarDisplay rating={r.rating} /></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{r.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColor[r.status]}>{r.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => { setSelectedReview(r); setReplyText(r.reply || ""); }}
                >
                  {r.status === "replied" ? "View" : "Reply"}
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
                <p className="text-2xl font-bold text-foreground">{stats.avgRating}</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.totalReviews}</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.responseRate}%</p>
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
                <p className="text-2xl font-bold text-foreground">{byStatus("pending").length}</p>
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
            {stats.distribution.map((d) => (
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
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
          <TabsTrigger value="replied">Replied</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="pending"><Card><CardContent className="pt-4">{renderTable(byStatus("pending"))}</CardContent></Card></TabsContent>
        <TabsContent value="published"><Card><CardContent className="pt-4">{renderTable(byStatus("published"))}</CardContent></Card></TabsContent>
        <TabsContent value="replied"><Card><CardContent className="pt-4">{renderTable(byStatus("replied"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Review Detail / Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
        {selectedReview && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review from {selectedReview.buyer}</DialogTitle>
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

              {selectedReview.reply && selectedReview.status === "replied" && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">Your Reply</p>
                  <p className="text-sm text-foreground">{selectedReview.reply}</p>
                </div>
              )}

              {selectedReview.status !== "replied" && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Reply</p>
                  <Textarea
                    placeholder="Write a response to this review..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            {selectedReview.status !== "replied" && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedReview(null)}>Cancel</Button>
                <Button onClick={handleReply} disabled={!replyText.trim()}>
                  <MessageSquare className="h-4 w-4 mr-1" /> Send Reply
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default SellerReviewsPage;
