import { useState } from "react";
import { Star, Search, MessageSquare, ThumbsUp, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface Review {
  id: number;
  seller: string;
  product: string;
  rating: number;
  title: string;
  text: string;
  date: string;
  status: "published" | "pending";
  sellerReply?: string;
}

const reviews: Review[] = [
  { id: 1, seller: "TechWholesale UK", product: "Samsung Galaxy & iPhone Mixed Lot", rating: 5, title: "Excellent quality lot", text: "Received the pallet within 3 days. Items were exactly as described. Great value for money.", date: "2025-03-15", status: "published", sellerReply: "Thank you! Glad you're happy with the purchase." },
  { id: 2, seller: "AudioDirect Ltd", product: "Sony WH-1000XM5 — 100 Units", rating: 4, title: "Good deal overall", text: "Most items were in perfect condition. A couple had minor box damage but headphones were fine.", date: "2025-03-10", status: "published" },
  { id: 3, seller: "HomeGoods Direct", product: "Dyson V15 Detect — 30 Units", rating: 2, title: "Disappointing quality", text: "About half the units had visible wear. Description said Grade A but many were Grade C at best.", date: "2025-03-05", status: "published" },
  { id: 4, seller: "ScreenPlus Trade", product: "Samsung 65\" QLED TV — 20 Units", rating: 5, title: "Perfect as described", text: "Every single TV was sealed and brand new. Manifest was 100% accurate. Will order again.", date: "2025-02-28", status: "published" },
  { id: 5, seller: "KitchenPro Trade", product: "Nespresso Vertuo — 50 Units", rating: 4, title: "Solid purchase", text: "Good variety and fast shipping. One unit was missing a pod holder but seller resolved it quickly.", date: "2025-02-20", status: "pending" },
  { id: 6, seller: "GameZone Wholesale", product: "Nintendo Switch OLED — 40 Units", rating: 5, title: "Best wholesale deal I've found", text: "All units Grade A, sealed boxes. Delivery was prompt and well-packaged.", date: "2025-02-15", status: "published" },
];

const stats = {
  totalReviews: reviews.length,
  avgRating: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
  distribution: [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
    pct: Math.round((reviews.filter((r) => r.rating === stars).length / reviews.length) * 100),
  })),
};

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const BuyerReviews = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Review | null>(null);

  const filtered = reviews.filter(
    (r) =>
      r.seller.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filtered.filter((r) => r.status === status);

  const renderTable = (data: Review[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Seller</TableHead>
          <TableHead className="hidden sm:table-cell">Product</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead className="hidden md:table-cell">Title</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No reviews found.
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium text-sm">{r.seller}</TableCell>
              <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{r.product}</TableCell>
              <TableCell><StarDisplay rating={r.rating} /></TableCell>
              <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[180px] truncate">{r.title}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
              <TableCell>
                <Badge variant="outline" className={r.status === "published" ? "bg-emerald-500/15 text-emerald-700 border-emerald-200" : "bg-amber-500/15 text-amber-700 border-amber-200"}>
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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">Reviews you've left for sellers.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.avgRating}</p>
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
                <p className="text-2xl font-bold text-foreground">{reviews.filter((r) => r.sellerReply).length}</p>
                <p className="text-xs text-muted-foreground">Seller Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your Rating Distribution</CardTitle>
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
        <TabsContent value="all"><Card><CardContent className="pt-4">{renderTable(filtered)}</CardContent></Card></TabsContent>
        <TabsContent value="published"><Card><CardContent className="pt-4">{renderTable(byStatus("published"))}</CardContent></Card></TabsContent>
        <TabsContent value="pending"><Card><CardContent className="pt-4">{renderTable(byStatus("pending"))}</CardContent></Card></TabsContent>
      </Tabs>

      {/* Review Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review for {selected.seller}</DialogTitle>
              <DialogDescription>{selected.product}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between">
                <StarDisplay rating={selected.rating} />
                <span className="text-xs text-muted-foreground">{selected.date}</span>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">{selected.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{selected.text}</p>
              </div>
              {selected.sellerReply && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <p className="text-xs font-semibold text-primary mb-1">Seller Reply</p>
                  <p className="text-sm text-foreground">{selected.sellerReply}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Review
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default BuyerReviews;
