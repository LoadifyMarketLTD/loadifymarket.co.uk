import { useState, useEffect, useCallback } from "react";
import { Send, CheckCircle2, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

const CURRENCY_OPTIONS = ["GBP", "EUR", "USD"];

const INITIAL_FORM = {
  product_name: "",
  quantity: "",
  unit: "",
  destination_country: "United Kingdom",
  estimated_budget: "",
  currency: "GBP",
  message: "",
};

interface RFQRequest {
  id: string;
  product_name: string;
  quantity: string;
  estimated_budget: string;
  status: string;
  created_at: string;
}

interface RFQResponse {
  id: string;
  rfqId: string;
  quotedPrice: number;
  currency: string;
  message: string;
  leadTimeDays?: number;
  status: string;
  created_at: string;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const BuyerRFQ = () => {
  const { user } = useAuthStore();

  const [form, setForm] = useState({ ...INITIAL_FORM, buyer_email: user?.email ?? "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // My RFQs
  const [myRfqs, setMyRfqs] = useState<RFQRequest[]>([]);
  const [rfqResponses, setRfqResponses] = useState<Record<string, RFQResponse[]>>({});
  const [expandedRfq, setExpandedRfq] = useState<string | null>(null);
  const [loadingRfqs, setLoadingRfqs] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadMyRfqs = useCallback(async () => {
    if (!user?.id) return;
    setLoadingRfqs(true);
    try {
      const { data: rfqs } = await supabase
        .from("rfq_requests")
        .select("id, product_name, quantity, estimated_budget, status, created_at")
        .eq("buyerId", user.id)
        .order("created_at", { ascending: false });

      const list = (rfqs ?? []) as RFQRequest[];
      setMyRfqs(list);

      // Load responses for all RFQs in a single query
      if (list.length > 0) {
        const ids = list.map((r) => r.id);
        const { data: responses } = await supabase
          .from("rfq_responses")
          .select("id, rfqId, quotedPrice, currency, message, leadTimeDays, status, created_at")
          .in("rfqId", ids)
          .order("created_at", { ascending: false });

        const grouped: Record<string, RFQResponse[]> = {};
        for (const r of (responses ?? []) as RFQResponse[]) {
          if (!grouped[r.rfqId]) grouped[r.rfqId] = [];
          grouped[r.rfqId].push(r);
        }
        setRfqResponses(grouped);
      }
    } catch {
      toast({ title: "Could not load your RFQs", variant: "destructive" });
    } finally {
      setLoadingRfqs(false);
    }
  }, [user?.id]);

  useEffect(() => { loadMyRfqs(); }, [loadMyRfqs]);

  const handleAcceptQuote = async (rfqId: string, responseId: string) => {
    setAccepting(responseId);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;
      const res = await fetch("/.netlify/functions/rfq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ op: "accept", rfqId, responseId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
      }
      toast({ title: "Quote accepted!", description: "An order has been created from this quote." });
      loadMyRfqs();
    } catch (err) {
      toast({
        title: "Could not accept quote",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccepting(null);
    }
  };

  const validate = () => {
    const e: Partial<Record<string, string>> = {};
    if (!form.product_name.trim()) e.product_name = "Service / product name is required";
    if (!form.quantity.trim()) e.quantity = "Quantity is required";
    if (!form.destination_country.trim()) e.destination_country = "Destination is required";
    if (!form.estimated_budget.trim()) e.estimated_budget = "Budget is required";
    if (!form.buyer_email.trim()) e.buyer_email = "Email is required";
    return e;
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      const payload: Record<string, string | undefined> = {
        op: "create",
        product_name: form.product_name.trim(),
        quantity: form.quantity.trim(),
        destination_country: form.destination_country.trim(),
        estimated_budget: `${form.estimated_budget.trim()} ${form.currency}`,
        buyer_email: form.buyer_email.trim(),
        currency: form.currency,
      };
      if (form.unit.trim()) payload.unit = form.unit.trim();
      if (form.message.trim()) payload.message = form.message.trim();

      const res = await fetch("/.netlify/functions/rfq", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
      }

      setSubmitted(true);
      loadMyRfqs();
    } catch (err) {
      toast({
        title: "Could not submit request",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitForm = submitted ? (
    <div className="p-4 sm:p-6 max-w-xl mx-auto mt-12 text-center space-y-4">
      <div className="flex justify-center">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-foreground">Request Submitted!</h2>
      <p className="text-muted-foreground">
        Your quote request has been sent to our sellers. You'll receive quotes directly to{" "}
        <strong>{form.buyer_email}</strong>.
      </p>
      <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ ...INITIAL_FORM, buyer_email: user?.email ?? "" }); }}>
        Submit another request
      </Button>
    </div>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">What are you looking for?</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Service / Product */}
          <div className="space-y-1">
            <Label htmlFor="product_name">Service / Product Name <span className="text-destructive">*</span></Label>
            <Input
              id="product_name"
              placeholder="e.g. Website design, Pallet of electronics, Courier service"
              value={form.product_name}
              onChange={(e) => handleChange("product_name", e.target.value)}
            />
            {errors.product_name && <p className="text-xs text-destructive">{errors.product_name}</p>}
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="quantity">Quantity <span className="text-destructive">*</span></Label>
              <Input
                id="quantity"
                placeholder="e.g. 1, 100, 3 pallets"
                value={form.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
              />
              {errors.quantity && <p className="text-xs text-destructive">{errors.quantity}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit">Unit (optional)</Label>
              <Input
                id="unit"
                placeholder="e.g. pcs, kg, hours"
                value={form.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
              />
            </div>
          </div>

          {/* Budget + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="estimated_budget">Estimated Budget <span className="text-destructive">*</span></Label>
              <Input
                id="estimated_budget"
                placeholder="e.g. 500, 1000–2000"
                value={form.estimated_budget}
                onChange={(e) => handleChange("estimated_budget", e.target.value)}
              />
              {errors.estimated_budget && <p className="text-xs text-destructive">{errors.estimated_budget}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                value={form.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <Label htmlFor="destination_country">Delivery Destination <span className="text-destructive">*</span></Label>
            <Input
              id="destination_country"
              placeholder="e.g. United Kingdom, London"
              value={form.destination_country}
              onChange={(e) => handleChange("destination_country", e.target.value)}
            />
            {errors.destination_country && <p className="text-xs text-destructive">{errors.destination_country}</p>}
          </div>

          {/* Message */}
          <div className="space-y-1">
            <Label htmlFor="message">Additional Details (optional)</Label>
            <Textarea
              id="message"
              placeholder="Include any special requirements, deadlines, quality standards, etc."
              rows={4}
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
            />
          </div>

          {/* Contact email */}
          <div className="space-y-1">
            <Label htmlFor="buyer_email">Your Email <span className="text-destructive">*</span></Label>
            <Input
              id="buyer_email"
              type="email"
              placeholder="you@example.com"
              value={form.buyer_email}
              onChange={(e) => handleChange("buyer_email", e.target.value)}
            />
            {errors.buyer_email && <p className="text-xs text-destructive">{errors.buyer_email}</p>}
            <p className="text-xs text-muted-foreground">Sellers will contact you at this address with their quotes.</p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {submitting ? "Submitting…" : "Submit Quote Request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const myRfqsPanel = (
    <div className="space-y-4">
      {loadingRfqs ? (
        <p className="text-sm text-muted-foreground">Loading your RFQs…</p>
      ) : myRfqs.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">You have not submitted any quote requests yet.</p>
        </div>
      ) : (
        myRfqs.map((rfq) => {
          const responses = rfqResponses[rfq.id] ?? [];
          const isExpanded = expandedRfq === rfq.id;
          const statusColors: Record<string, string> = {
            pending: "bg-blue-500/10 text-blue-700",
            closed: "bg-emerald-500/10 text-emerald-700",
            expired: "bg-gray-200 text-gray-600",
          };
          return (
            <Card key={rfq.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{rfq.product_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Qty: {rfq.quantity} · Budget: {rfq.estimated_budget} · {formatDate(rfq.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className={statusColors[rfq.status] ?? ""}>{rfq.status}</Badge>
                    {responses.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{responses.length} quote{responses.length > 1 ? "s" : ""}</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedRfq(isExpanded ? null : rfq.id)}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 border-t pt-3">
                    {responses.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No quotes received yet. Sellers will respond to your request shortly.</p>
                    ) : (
                      responses.map((resp) => {
                        const respStatusColors: Record<string, string> = {
                          submitted: "bg-blue-500/10 text-blue-700",
                          accepted: "bg-emerald-500/10 text-emerald-700",
                          rejected: "bg-red-500/10 text-red-600",
                          withdrawn: "bg-gray-200 text-gray-500",
                        };
                        return (
                          <div key={resp.id} className="rounded-lg border border-border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-sm text-foreground">
                                £{resp.quotedPrice.toFixed(2)} {resp.currency}
                                {resp.leadTimeDays ? ` · ${resp.leadTimeDays} day lead time` : ""}
                              </p>
                              <Badge variant="outline" className={respStatusColors[resp.status] ?? ""}>{resp.status}</Badge>
                            </div>
                            {resp.message && (
                              <p className="text-xs text-muted-foreground">{resp.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Received {formatDate(resp.created_at)}</p>
                            {resp.status === "submitted" && rfq.status !== "closed" && (
                              <Button
                                size="sm"
                                disabled={accepting === resp.id}
                                onClick={() => handleAcceptQuote(rfq.id, resp.id)}
                                className="w-full mt-1"
                              >
                                {accepting === resp.id ? "Accepting…" : "Accept this Quote"}
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Request a Quote (RFQ)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe what you need and our sellers will send you competitive quotes.
        </p>
      </div>

      <Tabs defaultValue="submit">
        <TabsList>
          <TabsTrigger value="submit">Submit RFQ</TabsTrigger>
          <TabsTrigger value="my-rfqs">
            My RFQs
            {myRfqs.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{myRfqs.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="submit" className="mt-4">{submitForm}</TabsContent>
        <TabsContent value="my-rfqs" className="mt-4">{myRfqsPanel}</TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerRFQ;
