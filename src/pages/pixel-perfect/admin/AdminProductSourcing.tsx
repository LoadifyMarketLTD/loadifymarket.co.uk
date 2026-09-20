import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, Database, Loader2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authorizedFetch } from "@/lib/authorizedFetch";

type JsonRecord = Record<string, unknown>;

interface MerchandisingDraft {
  title: string;
  description: string;
  benefits: string;
  seoTitle: string;
  seoDescription: string;
  faq: string;
  creativeBrief: string;
}

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function safeCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function safeRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => asRecord(item) !== null)
    : [];
}

export default function AdminProductSourcing() {
  const [productUrl, setProductUrl] = useState("");
  const [sourcePreview, setSourcePreview] = useState<JsonRecord | null>(null);
  const [supplierKey, setSupplierKey] = useState("");
  const [sourceBatchDigest, setSourceBatchDigest] = useState("");
  const [mappingsJson, setMappingsJson] = useState("[]");
  const [review, setReview] = useState<JsonRecord | null>(null);
  const [plan, setPlan] = useState<JsonRecord | null>(null);
  const [supplierCatalogItemId, setSupplierCatalogItemId] = useState("");
  const [supplierOfferId, setSupplierOfferId] = useState("");
  const [canonicalProductId, setCanonicalProductId] = useState("");
  const [economics, setEconomics] = useState<JsonRecord | null>(null);
  const [publicationGate, setPublicationGate] = useState<JsonRecord | null>(null);
  const [merchReview, setMerchReview] = useState<JsonRecord | null>(null);
  const [marketplaceProjection, setMarketplaceProjection] = useState<JsonRecord | null>(null);
  const [projectionPublication, setProjectionPublication] = useState<JsonRecord | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [aiBrief, setAiBrief] = useState<JsonRecord | null>(null);
  const [merchDraft, setMerchDraft] = useState<MerchandisingDraft | null>(null);
  const [loading, setLoading] = useState<"url" | "review" | "plan" | "economics" | "gate" | "merchReview" | "projection" | "publishProjection" | "ai" | "aiGenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reviewPackage = asRecord(review?.reviewPackage);
  const governance = asRecord(review?.intakeGovernance);
  const foundation = asRecord(review?.foundationBinding);
  const reviewItems = safeRecordArray(reviewPackage?.items);
  const acceptedCount = Number(reviewPackage?.acceptedCount ?? 0);
  const quarantinedCount = Number(reviewPackage?.quarantinedCount ?? 0);
  const stage = String(governance?.stage ?? "not loaded");
  const supplierFound = foundation?.supplierFound === true;

  const preview = asRecord(sourcePreview?.preview);
  const previewFacts = asRecord(preview?.facts);
  const previewImages = Array.isArray(previewFacts?.images)
    ? previewFacts.images.filter((item): item is string => typeof item === "string")
    : [];

  const canPlan = useMemo(
    () => Boolean(review && supplierKey.trim() && sourceBatchDigest.trim()),
    [review, supplierKey, sourceBatchDigest],
  );

  const mappingRows = useMemo(() => {
    try {
      const parsed = JSON.parse(mappingsJson) as unknown;
      return Array.isArray(parsed) ? parsed.filter((item): item is JsonRecord => asRecord(item) !== null) : [];
    } catch {
      return [];
    }
  }, [mappingsJson]);

  function updateMappingField(sourceRecordDigest: string, field: "supplierCatalogItemId" | "canonicalProductId", value: string) {
    const normalizedDigest = sourceRecordDigest.trim().toLowerCase();
    const next = mappingRows.filter((row) => String(row.sourceRecordDigest ?? "").trim().toLowerCase() !== normalizedDigest);
    const previous = mappingRows.find((row) => String(row.sourceRecordDigest ?? "").trim().toLowerCase() === normalizedDigest);
    const updated: JsonRecord = {
      sourceRecordDigest: normalizedDigest,
      supplierCatalogItemId: String(previous?.supplierCatalogItemId ?? ""),
      canonicalProductId: String(previous?.canonicalProductId ?? ""),
      [field]: value,
    };
    next.push(updated);
    setMappingsJson(JSON.stringify(next, null, 2));
  }

  function mappingValue(sourceRecordDigest: string, field: "supplierCatalogItemId" | "canonicalProductId") {
    const normalizedDigest = sourceRecordDigest.trim().toLowerCase();
    const row = mappingRows.find((item) => String(item.sourceRecordDigest ?? "").trim().toLowerCase() === normalizedDigest);
    return String(row?.[field] ?? "");
  }

  async function previewSourceUrl() {
    setError(null);
    setSourcePreview(null);
    if (!productUrl.trim()) {
      setError("Enter an HTTPS product URL to inspect.");
      return;
    }
    setLoading("url");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-product-source-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl.trim() }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to inspect product URL."));
      setSourcePreview(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to inspect product URL.");
    } finally {
      setLoading(null);
    }
  }

  async function loadReview(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPlan(null);
    setReview(null);
    if (!supplierKey.trim() || !sourceBatchDigest.trim()) {
      setError("Supplier key and source batch digest are required.");
      return;
    }

    setLoading("review");
    try {
      const query = new URLSearchParams({
        supplierKey: supplierKey.trim(),
        sourceBatchDigest: sourceBatchDigest.trim(),
      });
      const response = await authorizedFetch(
        `/.netlify/functions/admin-direct-supplier-staging-review?${query.toString()}`,
      );
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to load staged supplier batch."));
      setReview(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load staged supplier batch.");
    } finally {
      setLoading(null);
    }
  }
  async function buildImportPlan() {
    setError(null);
    setPlan(null);
    let catalogMappings: unknown;
    try {
      catalogMappings = JSON.parse(mappingsJson);
    } catch {
      setError("Catalog mappings must be valid JSON.");
      return;
    }
    if (!Array.isArray(catalogMappings)) {
      setError("Catalog mappings must be a JSON array.");
      return;
    }

    setLoading("plan");
    try {
      const response = await authorizedFetch(
        "/.netlify/functions/admin-direct-supplier-phase-f-import-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierKey: supplierKey.trim(),
            sourceBatchDigest: sourceBatchDigest.trim(),
            catalogMappings,
          }),
        },
      );
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to build canonical import plan."));
      setPlan(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to build canonical import plan.");
    } finally {
      setLoading(null);
    }
  }

  async function checkEconomics() {
    setError(null);
    setEconomics(null);
    if (!supplierOfferId.trim() || !canonicalProductId.trim()) {
      setError("Supplier offer ID and canonical product ID are required.");
      return;
    }
    setLoading("economics");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-economics-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierOfferId: supplierOfferId.trim(),
          canonicalProductId: canonicalProductId.trim(),
          commercialMode: "loadify_supplier_fulfilled",
          territory: "GB",
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to evaluate supplier economics."));
      setEconomics(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate supplier economics.");
    } finally {
      setLoading(null);
    }
  }

  const importPlan = asRecord(plan?.importPlan);
  const plannedItems = safeCount(importPlan?.items);
  const planReady = importPlan?.planReady === true;
  const economicsDecision = asRecord(economics?.decision);
  const economicsEligible = economicsDecision?.eligible === true;
  const publicationEligible = publicationGate?.eligible === true;
  const publicationChecks = safeRecordArray(publicationGate?.checks);
  const preparedBrief = asRecord(aiBrief?.brief);
  const verifiedFacts = asRecord(preparedBrief?.verifiedFacts);
  const aiGeneration = asRecord(aiBrief?.generation);
  const aiProviderAvailable = aiGeneration?.available === true;

  function updateMerchField(field: keyof MerchandisingDraft, value: string) {
    setMerchDraft((current) => current ? { ...current, [field]: value } : current);
  }

  async function approveMerchandisingReview() {
    setError(null);
    setMerchReview(null);
    if (!publicationEligible || !merchDraft) {
      setError("Publication gate must be eligible before final merchandising approval.");
      return;
    }
    if (!reviewReason.trim()) {
      setError("Enter the human review reason before approval.");
      return;
    }

    setLoading("merchReview");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-operator-merchandising-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierCatalogItemId: supplierCatalogItemId.trim(),
          supplierOfferId: supplierOfferId.trim(),
          canonicalProductId: canonicalProductId.trim(),
          reason: reviewReason.trim(),
          draft: merchDraft,
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to approve merchandising review."));
      setMerchReview(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to approve merchandising review.");
    } finally {
      setLoading(null);
    }
  }

  async function createMarketplaceProjection() {
    setError(null);
    setMarketplaceProjection(null);
    const approvedReview = asRecord(merchReview?.review);
    const merchandisingReviewId = String(approvedReview?.reviewId ?? "");
    if (!merchandisingReviewId || !merchDraft) {
      setError("Approved merchandising review is required before creating the marketplace projection.");
      return;
    }
    setLoading("projection");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-marketplace-projection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierCatalogItemId: supplierCatalogItemId.trim(),
          supplierOfferId: supplierOfferId.trim(),
          canonicalProductId: canonicalProductId.trim(),
          merchandisingReviewId,
          projectionPayload: merchDraft,
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to create marketplace projection."));
      setMarketplaceProjection(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create marketplace projection.");
    } finally { setLoading(null); }
  }

  async function publishMarketplaceProjection() {
    setError(null);
    setProjectionPublication(null);
    const projection = asRecord(marketplaceProjection?.projection);
    const projectionId = String(projection?.projectionId ?? "");
    if (!projectionId) {
      setError("Governed marketplace projection is required before buyer publication.");
      return;
    }
    setLoading("publishProjection");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-publish-supplier-projection", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectionId }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to publish supplier projection."));
      setProjectionPublication(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to publish supplier projection.");
    } finally { setLoading(null); }
  }

  async function checkPublicationGate() {
    setError(null);
    setPublicationGate(null);
    if (!supplierCatalogItemId.trim() || !supplierOfferId.trim() || !canonicalProductId.trim()) {
      setError("Supplier catalog item, supplier offer and canonical product IDs are required for the publication gate.");
      return;
    }

    setLoading("gate");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-publication-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierCatalogItemId: supplierCatalogItemId.trim(),
          supplierOfferId: supplierOfferId.trim(),
          canonicalProductId: canonicalProductId.trim(),
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to evaluate publication gate."));
      setPublicationGate(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate publication gate.");
    } finally {
      setLoading(null);
    }
  }

  async function generateAiDraft() {
    setError(null);
    if (!canonicalProductId.trim()) {
      setError("A canonical product ID is required for AI generation.");
      return;
    }
    if (!aiProviderAvailable) {
      setError("AI generation is not enabled or the server-side provider is not configured.");
      return;
    }

    setLoading("aiGenerate");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-ai-product-builder-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalProductId: canonicalProductId.trim() }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to generate AI merchandising draft."));
      const draft = asRecord(body.draft);
      const title = asRecord(draft?.title);
      const description = asRecord(draft?.description);
      const seo = asRecord(draft?.seo);
      const seoTitle = asRecord(seo?.title);
      const seoDescription = asRecord(seo?.description);
      const creative = asRecord(draft?.creativeBrief);
      const benefits = safeRecordArray(draft?.benefits).map((item) => String(item.text ?? "")).filter(Boolean);
      const faq = safeRecordArray(draft?.faq)
        .map((item) => {
          const question = String(item.question ?? "").trim();
          const answer = String(item.answer ?? "").trim();
          return question && answer ? `Q: ${question}\nA: ${answer}` : "";
        })
        .filter(Boolean);

      setMerchDraft({
        title: String(title?.text ?? ""),
        description: String(description?.text ?? ""),
        benefits: benefits.join("\n"),
        seoTitle: String(seoTitle?.text ?? ""),
        seoDescription: String(seoDescription?.text ?? ""),
        faq: faq.join("\n\n"),
        creativeBrief: String(creative?.text ?? ""),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate AI merchandising draft.");
    } finally {
      setLoading(null);
    }
  }

  async function prepareAiBrief() {
    setError(null);
    setAiBrief(null);
    if (!canonicalProductId.trim()) {
      setError("Enter the canonical product ID before preparing an AI merchandising brief.");
      return;
    }
    if (!review || acceptedCount < 1 || quarantinedCount > 0) {
      setError("AI Product Builder is locked until governed supplier review has accepted records with no quarantined records.");
      return;
    }

    setLoading("ai");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-ai-product-builder-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canonicalProductId: canonicalProductId.trim() }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to prepare AI Product Builder brief."));
      setAiBrief(body);
      const brief = asRecord(body.brief);
      const facts = asRecord(brief?.verifiedFacts);
      setMerchDraft({
        title: String(facts?.title ?? ""),
        description: String(facts?.description ?? ""),
        benefits: "",
        seoTitle: String(facts?.title ?? "").slice(0, 60),
        seoDescription: String(facts?.description ?? "").slice(0, 160),
        faq: "",
        creativeBrief: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to prepare AI Product Builder brief.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 text-foreground">
      <div className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
              Loadify Operator
            </Badge>
            <Badge variant="outline">Supplier-fulfilled · No Loadify warehouse</Badge>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Product Sourcing & Import</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Bring approved supplier products into Loadify's canonical commerce pipeline without bypassing
            provenance, rights, compliance, landed-cost, margin or publication controls.
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {["Source", "Review", "Economics", "AI Builder"].map((label, index) => (
            <div key={label} className="rounded-xl border border-border bg-card px-3 py-2">
              <div className="font-bold text-primary">{index + 1}</div>
              <div className="mt-0.5 text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>
      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Search className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold">Source intake</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Inspect an approved HTTPS product URL, then continue through the existing governed supplier import pipeline.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background p-4">
            <label className="space-y-1.5 text-sm font-medium">
              Product source URL
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={productUrl}
                  onChange={(e) => setProductUrl(e.target.value)}
                  placeholder="https://supplier.example/product/..."
                />
                <Button type="button" onClick={previewSourceUrl} disabled={loading !== null} className="shrink-0">
                  {loading === "url" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  Inspect product
                </Button>
              </div>
            </label>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Server-side inspection is SSRF-protected and creates no listing, order or supplier activation.
            </p>

            {preview && (
              <div className="mt-4 grid gap-4 rounded-xl border border-primary/15 bg-primary/[0.03] p-4 sm:grid-cols-[96px_1fr]">
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-lg border border-border bg-card text-center">
                  <Database className="h-7 w-7 text-muted-foreground" />
                  <span className="mt-2 px-2 text-[10px] leading-4 text-muted-foreground">
                    {previewImages.length ? `${previewImages.length} source image(s)` : "No source images"}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-700">Candidate only</Badge>
                    <Badge variant="outline">{String(preview.sourceType ?? "source preview")}</Badge>
                  </div>
                  <h3 className="mt-2 truncate font-semibold">{String(previewFacts?.title ?? "Untitled product")}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {String(previewFacts?.description ?? "No description extracted from verified source data.")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {previewFacts?.brand ? <span>Brand: {String(previewFacts.brand)}</span> : null}
                    {previewFacts?.price ? <span>Source price: {String(previewFacts.currency ?? "")} {String(previewFacts.price)}</span> : null}
                    <span>Rights: unverified</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            Governed supplier batch
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={loadReview} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">
              Supplier key
              <Input value={supplierKey} onChange={(e) => setSupplierKey(e.target.value)} placeholder="supplier-key" />
            </label>
            <label className="space-y-1.5 text-sm font-medium">
              Source batch SHA-256
              <Input value={sourceBatchDigest} onChange={(e) => setSourceBatchDigest(e.target.value)} placeholder="64-character digest" />
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={loading !== null}>
                {loading === "review" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Load governed review
              </Button>
            </div>
          </form>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold">Governance state</h2>
              <p className="mt-1 text-sm text-muted-foreground">Read-only evidence from the existing Supplier Commerce controls.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Metric label="Supplier foundation" value={review ? (supplierFound ? "Bound" : "Missing") : "—"} />
            <Metric label="Current stage" value={review ? stage : "—"} />
            <Metric label="Accepted records" value={review ? String(acceptedCount) : "—"} />
            <Metric label="Quarantined" value={review ? String(quarantinedCount) : "—"} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600"><Database className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold">Canonical mapping & Phase F plan</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Map reviewed source records to real supplier catalogue IDs and canonical product IDs. This step plans the import only;
                it does not publish a marketplace listing or activate supplier commerce.
              </p>
            </div>
          </div>
          <Badge variant="outline" className={planReady ? "border-emerald-500/30 text-emerald-600" : ""}>
            {planReady ? `Plan ready · ${plannedItems} item(s)` : "Fail-closed"}
          </Badge>
        </div>
        {reviewItems.length > 0 ? (
          <div className="mt-5 space-y-3">
            {reviewItems.map((item, index) => {
              const digest = String(item.sourceRecordDigest ?? "");
              const productRef = String(item.externalProductRef ?? "unknown product");
              const variantRef = String(item.externalVariantRef ?? "unknown variant");
              return (
                <div key={digest || index} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">{productRef}</div>
                      <div className="text-xs text-muted-foreground">Variant: {variantRef}</div>
                    </div>
                    <code className="max-w-full truncate text-[10px] text-muted-foreground">{digest}</code>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium">
                      Supplier catalog item ID
                      <Input
                        value={mappingValue(digest, "supplierCatalogItemId")}
                        onChange={(e) => updateMappingField(digest, "supplierCatalogItemId", e.target.value)}
                        placeholder="Required UUID"
                      />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      Canonical product ID
                      <Input
                        value={mappingValue(digest, "canonicalProductId")}
                        onChange={(e) => updateMappingField(digest, "canonicalProductId", e.target.value)}
                        placeholder="Canonical UUID"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            Load a governed supplier review to map accepted records.
          </div>
        )}

        <details className="mt-4 rounded-xl border border-border bg-background p-4">
          <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Advanced mapping JSON</summary>
          <textarea
            value={mappingsJson}
            onChange={(e) => setMappingsJson(e.target.value)}
            rows={8}
            spellCheck={false}
            className="mt-3 w-full rounded-xl border border-input bg-card px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring"
            placeholder='[{"sourceRecordDigest":"...","supplierCatalogItemId":"...","canonicalProductId":"..."}]'
          />
        </details>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={buildImportPlan} disabled={!canPlan || loading !== null}>
            {loading === "plan" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
            Build import plan
          </Button>
          <span className="text-xs text-muted-foreground">No product is published from this screen without later review gates.</span>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600"><Database className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold">Landed cost & margin gate</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Evaluate the canonical Phase G commercial decision for Loadify supplier-fulfilled commerce in Great Britain.
                This is read-only and does not create pricing evidence or activate a listing.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={economicsEligible ? "border-emerald-500/30 text-emerald-600" : ""}
          >
            {economicsDecision
              ? (economicsEligible ? "Economics eligible" : String(economicsDecision.reason ?? "Not eligible"))
              : "Not evaluated"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="space-y-1.5 text-sm font-medium">
            Supplier catalog item ID
            <Input
              value={supplierCatalogItemId}
              onChange={(e) => setSupplierCatalogItemId(e.target.value)}
              placeholder="UUID from supplier catalog"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Supplier offer ID
            <Input
              value={supplierOfferId}
              onChange={(e) => setSupplierOfferId(e.target.value)}
              placeholder="UUID from canonical supplier offer"
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Canonical product ID
            <Input
              value={canonicalProductId}
              onChange={(e) => setCanonicalProductId(e.target.value)}
              placeholder="UUID from canonical product"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={checkEconomics} disabled={loading !== null}>
            {loading === "economics" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
            Check economics
          </Button>
          <span className="text-xs text-muted-foreground">Mode: Loadify supplier-fulfilled · Territory: GB</span>
        </div>

        {economicsDecision && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Decision" value={economicsEligible ? "Eligible" : String(economicsDecision.reason ?? "Blocked")} />
            <Metric label="Currency" value={String(economicsDecision.currency ?? "—")} />
            <Metric
              label="Customer price"
              value={typeof economicsDecision.grossCustomerPrice === "number"
                ? `${String(economicsDecision.currency ?? "")} ${economicsDecision.grossCustomerPrice.toFixed(2)}`
                : "—"}
            />
            <Metric label="Pricing policy" value={String(economicsDecision.pricingPolicyVersion ?? "—")} />
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold">Review & publication gate</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Checks canonical import approval, verified facts, asset rights, GB compliance and commercial economics.
                This gate is read-only and performs no publication.
              </p>
            </div>
            <Button type="button" onClick={checkPublicationGate} disabled={loading !== null}>
              {loading === "gate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Check publication gate
            </Button>
          </div>

          {publicationGate && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={publicationEligible ? "border-emerald-500/30 text-emerald-600" : "border-amber-500/30 text-amber-700"}
                >
                  {publicationEligible ? "Ready for final review" : "Blocked"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {String(publicationGate.reason ?? "publication gate evaluated")}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {publicationChecks.map((check, index) => {
                  const passed = check.passed === true;
                  const covers = Array.isArray(check.covers)
                    ? check.covers.filter((item): item is string => typeof item === "string")
                    : [];
                  return (
                    <div key={String(check.key ?? index)} className="rounded-xl border border-border bg-card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{String(check.key ?? "gate check").replace(/_/g, " ")}</div>
                        <Badge variant="outline" className={passed ? "border-emerald-500/30 text-emerald-600" : "border-amber-500/30 text-amber-700"}>
                          {passed ? "PASS" : "BLOCKED"}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{String(check.reason ?? "No reason returned")}</div>
                      {covers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {covers.map((item) => <Badge key={item} variant="outline">{item.replace(/_/g, " ")}</Badge>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="text-xs text-muted-foreground">
                Publication mutation: disabled · Supplier write: disabled · Buyer checkout exposure: disabled
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-600"><Sparkles className="h-5 w-5" /></div>
            <div>
              <h2 className="font-semibold">AI Product Builder</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                Prepare a facts-locked merchandising brief, then optionally generate structured merchandising copy through the
                server-side provider. Generation never publishes or mutates marketplace products.
              </p>
            </div>
          </div>
          <Badge variant="outline" className={preparedBrief ? "border-violet-500/30 text-violet-600" : ""}>
            {preparedBrief ? "Facts locked · brief ready" : "Locked"}
          </Badge>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={prepareAiBrief}
            disabled={loading !== null || !canonicalProductId.trim() || !review || acceptedCount < 1 || quarantinedCount > 0}
          >
            {loading === "ai" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Prepare AI brief
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={generateAiDraft}
            disabled={loading !== null || !preparedBrief || !aiProviderAvailable}
          >
            {loading === "aiGenerate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate AI draft
          </Button>
          <Badge variant="outline" className={aiProviderAvailable ? "border-emerald-500/30 text-emerald-600" : ""}>
            {aiProviderAvailable ? "AI provider ready" : "AI provider not configured"}
          </Badge>
          <span className="w-full text-xs text-muted-foreground">
            Reads verified canonical facts server-side; candidate URL facts are never sent to the AI brief or generation provider.
          </span>
        </div>

        {preparedBrief && verifiedFacts && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Verified source facts</div>
              <h3 className="mt-2 font-semibold">{String(verifiedFacts.title ?? "Untitled product")}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {String(verifiedFacts.description ?? "No verified description available.")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {verifiedFacts.brand ? <Badge variant="outline">Brand: {String(verifiedFacts.brand)}</Badge> : null}
                {verifiedFacts.sku ? <Badge variant="outline">SKU: {String(verifiedFacts.sku)}</Badge> : null}
                {verifiedFacts.gtin ? <Badge variant="outline">GTIN: {String(verifiedFacts.gtin)}</Badge> : null}
              </div>
            </div>
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">AI Facts Lock</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Presentation may improve structure, readability, SEO and merchandising language, but unsupported specifications,
                certifications, materials, origin, warranty, compatibility, performance, safety, medical, authenticity or delivery claims remain forbidden.
              </p>
              <div className="mt-3 text-xs font-medium text-muted-foreground">
                Provider call: {aiProviderAvailable ? "available after brief" : "disabled"} · Publication: disabled · Human review: required
              </div>
            </div>
          </div>
        )}
      </section>

      {merchDraft && preparedBrief && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h2 className="font-semibold">Merchandising editor & preview</h2>
              </div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                This editor is initialized only from verified canonical facts. Empty sections remain empty until a future AI provider
                or an operator supplies reviewed copy.
              </p>
            </div>
            <Badge variant="outline">Draft only · not published</Badge>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <label className="block space-y-1.5 text-sm font-medium">
                Product title
                <Input value={merchDraft.title} onChange={(e) => updateMerchField("title", e.target.value)} maxLength={300} />
              </label>

              <label className="block space-y-1.5 text-sm font-medium">
                Product description
                <textarea
                  value={merchDraft.description}
                  onChange={(e) => updateMerchField("description", e.target.value)}
                  rows={7}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium">
                Benefits
                <textarea
                  value={merchDraft.benefits}
                  onChange={(e) => updateMerchField("benefits", e.target.value)}
                  rows={5}
                  placeholder="One reviewed benefit per line"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium">
                  SEO title
                  <Input value={merchDraft.seoTitle} onChange={(e) => updateMerchField("seoTitle", e.target.value)} maxLength={70} />
                </label>
                <label className="block space-y-1.5 text-sm font-medium">
                  SEO description
                  <textarea
                    value={merchDraft.seoDescription}
                    onChange={(e) => updateMerchField("seoDescription", e.target.value)}
                    rows={3}
                    maxLength={180}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm font-medium">
                FAQ
                <textarea
                  value={merchDraft.faq}
                  onChange={(e) => updateMerchField("faq", e.target.value)}
                  rows={6}
                  placeholder="Reviewed Q&A only. Do not add unsupported product facts."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>

              <label className="block space-y-1.5 text-sm font-medium">
                Creative brief
                <textarea
                  value={merchDraft.creativeBrief}
                  onChange={(e) => updateMerchField("creativeBrief", e.target.value)}
                  rows={5}
                  placeholder="Visual direction based on approved product facts and assets."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Marketplace preview</div>
                <div className="mt-4 aspect-[4/3] rounded-xl border border-dashed border-border bg-card p-4">
                  <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                    Approved product asset preview will appear here after asset-rights review.
                  </div>
                </div>
                <h3 className="mt-4 text-xl font-bold leading-tight">
                  {merchDraft.title || "Product title"}
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {merchDraft.description || "Verified product description will appear here."}
                </p>

                {merchDraft.benefits.trim() && (
                  <ul className="mt-4 space-y-2 text-sm">
                    {merchDraft.benefits.split(/\r?\n/).map((benefit) => benefit.trim()).filter(Boolean).map((benefit, index) => (
                      <li key={`${benefit}-${index}`} className="flex gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">SEO preview</div>
                <div className="mt-3 text-base font-semibold">{merchDraft.seoTitle || "SEO title"}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {merchDraft.seoDescription || "SEO description"}
                </p>
                <div className="mt-3 text-xs text-muted-foreground">
                  Title {merchDraft.seoTitle.length}/70 · Description {merchDraft.seoDescription.length}/180
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
                <div className="text-sm font-semibold text-amber-800">Final human review</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Approval records the exact reviewed draft and its SHA-256 digest. It does not expose a buyer-facing listing.
                </p>
                <label className="mt-4 block space-y-1.5 text-sm font-medium">
                  Review reason
                  <textarea
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    rows={3}
                    placeholder="Why this merchandising draft is approved for the next publication gate"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={approveMerchandisingReview}
                  disabled={loading !== null || !publicationEligible || !reviewReason.trim()}
                >
                  {loading === "merchReview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  Approve reviewed merchandising
                </Button>
                {!publicationEligible && (
                  <div className="mt-2 text-xs text-muted-foreground">Publication gate must be PASS before approval.</div>
                )}
                {merchReview && (
                  <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3 text-sm">
                    <div className="font-semibold text-emerald-700">Merchandising review approved</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Buyer publication is still locked. Next gate: governed marketplace projection.
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3"
                      onClick={createMarketplaceProjection}
                      disabled={loading !== null || marketplaceProjection !== null}
                    >
                      {loading === "projection" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                      Create governed marketplace projection
                    </Button>
                    {marketplaceProjection && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs font-medium text-emerald-700">
                          Internal projection created · Buyer visible: {projectionPublication ? "YES" : "NO"} · Checkout: separately gated
                        </div>
                        <Button
                          type="button"
                          onClick={publishMarketplaceProjection}
                          disabled={loading !== null || projectionPublication !== null}
                        >
                          {loading === "publishProjection" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                          Publish to governed buyer catalog
                        </Button>
                        {projectionPublication && (
                          <div className="text-xs text-muted-foreground">
                            Buyer catalog publication recorded. Checkout still requires fresh supplier reservation and order orchestration.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <RoadmapCard icon={<Database className="h-5 w-5" />} title="Landed cost & margin" copy="Reuse Phase G economics so selling price is based on real supplier cost, shipping, tax/customs evidence and margin." />
        <RoadmapCard icon={<Sparkles className="h-5 w-5" />} title="AI Product Builder" copy="AI Facts Lock is implemented. Live generation remains disabled until verified canonical facts are available and an AI provider is explicitly configured." />
        <RoadmapCard icon={<ShieldCheck className="h-5 w-5" />} title="Review → Publish" copy="Publication remains a separate governed gate. The buyer stays inside Loadify while the approved supplier fulfils directly." />
      </section>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

function RoadmapCard({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
    </div>
  );
}
