import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ArrowRight, Database, Loader2, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authorizedFetch } from "@/lib/authorizedFetch";
import SupplierApplicationQueue from "./SupplierApplicationQueue";
import ControlledPilotReadiness from "./ControlledPilotReadiness";
import SupplierOperationsHealth from "./SupplierOperationsHealth";
import FirstSupplierLaunchGate from "./FirstSupplierLaunchGate";

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

interface DirectSupplierOnboardingForm {
  supplierKey: string;
  legalName: string;
  registrationCountry: string;
  registrationNumber: string;
  vatNumber: string;
  feedTransport: "json_api" | "json_feed" | "feed_url" | "csv" | "xml" | "sftp" | "manual_catalog";
  sourceFormat: "json" | "csv" | "xml" | "canonical_json";
  warehouseDeclarations: string;
  territories: string;
  capabilities: string;
  configRef: string;
  commercialTermsRef: string;
  currency: string;
  paymentTermsDays: string;
  dispatchSlaHours: string;
  returnWindowDays: string;
  onboardingStatus: "draft" | "qualification" | "ready_for_review" | "approved" | "blocked";
  reviewReason: string;
}

function sourceFormatForTransport(
  transport: DirectSupplierOnboardingForm["feedTransport"],
): DirectSupplierOnboardingForm["sourceFormat"] {
  if (transport === "csv") return "csv";
  if (transport === "xml") return "xml";
  if (transport === "manual_catalog") return "canonical_json";
  return "json";
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
  const [discoveryNote, setDiscoveryNote] = useState("");
  const [discoveryCandidate, setDiscoveryCandidate] = useState<JsonRecord | null>(null);
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
  const [alternateSupplierOfferId, setAlternateSupplierOfferId] = useState("");
  const [offerBindingReason, setOfferBindingReason] = useState("");
  const [fallbackAllowed, setFallbackAllowed] = useState(true);
  const [offerSelection, setOfferSelection] = useState<JsonRecord | null>(null);
  const [offerBinding, setOfferBinding] = useState<JsonRecord | null>(null);
  const [sourcePolicies, setSourcePolicies] = useState<JsonRecord[]>([]);
  const [supplierOnboarding, setSupplierOnboarding] = useState<DirectSupplierOnboardingForm>({
    supplierKey: "", legalName: "", registrationCountry: "GB", registrationNumber: "", vatNumber: "",
    feedTransport: "csv", sourceFormat: "csv", warehouseDeclarations: "main:GB", territories: "GB", capabilities: "catalog,variants,stock,price",
    configRef: "", commercialTermsRef: "", currency: "GBP", paymentTermsDays: "", dispatchSlaHours: "",
    returnWindowDays: "", onboardingStatus: "draft", reviewReason: "",
  });
  const [supplierOnboardingResult, setSupplierOnboardingResult] = useState<JsonRecord | null>(null);
  const [sourceSupplierApplicationId, setSourceSupplierApplicationId] = useState("");
  const [sourceSupplierApplicationLabel, setSourceSupplierApplicationLabel] = useState("");
  const [transportPreviewPayload, setTransportPreviewPayload] = useState("");
  const [transportFieldMapJson, setTransportFieldMapJson] = useState("{}");
  const [transportAmountUnit, setTransportAmountUnit] = useState<"minor" | "major">("minor");
  const [transportXmlRecordElement, setTransportXmlRecordElement] = useState("product");
  const [transportNormalization, setTransportNormalization] = useState<JsonRecord | null>(null);
  const [acquisitionEnabled, setAcquisitionEnabled] = useState(false);
  const [acquisitionMode, setAcquisitionMode] = useState<"manual" | "scheduled">("manual");
  const [acquisitionRefreshMinutes, setAcquisitionRefreshMinutes] = useState("60");
  const [acquisitionResult, setAcquisitionResult] = useState<JsonRecord | null>(null);
  const [acquisitionPreflight, setAcquisitionPreflight] = useState<JsonRecord | null>(null);
  const [onboardingReadiness, setOnboardingReadiness] = useState<JsonRecord | null>(null);
  const [qualificationEvidenceType, setQualificationEvidenceType] = useState("identity");
  const [qualificationSourceRef, setQualificationSourceRef] = useState("");
  const [qualificationSummary, setQualificationSummary] = useState("");
  const [capabilityName, setCapabilityName] = useState("catalog");
  const [capabilitySourceRef, setCapabilitySourceRef] = useState("");
  const [capabilitySummary, setCapabilitySummary] = useState("");
  const [complianceSourceRef, setComplianceSourceRef] = useState("");
  const [complianceSummary, setComplianceSummary] = useState("");
  const [lifecycleTarget, setLifecycleTarget] = useState<"verification" | "approved">("verification");
  const [onboardingGovernanceReason, setOnboardingGovernanceReason] = useState("");
  const [slaVersion, setSlaVersion] = useState("1");
  const [adapterStatus, setAdapterStatus] = useState<"verification" | "active">("verification");
  const [reviewReason, setReviewReason] = useState("");
  const [aiBrief, setAiBrief] = useState<JsonRecord | null>(null);
  const [merchDraft, setMerchDraft] = useState<MerchandisingDraft | null>(null);
  const [loading, setLoading] = useState<"url" | "discoverySave" | "review" | "plan" | "economics" | "gate" | "merchReview" | "projection" | "publishProjection" | "offerSelection" | "offerBind" | "offerApprove" | "offerDisable" | "supplierOnboarding" | "transportNormalize" | "acquisitionPreflight" | "acquisitionControl" | "acquireNow" | "onboardingReadiness" | "qualification" | "sla" | "compliance" | "lifecycle" | "capability" | "adapter" | "ai" | "aiGenerate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reviewPackage = asRecord(review?.reviewPackage);
  const governance = asRecord(review?.intakeGovernance);
  const foundation = asRecord(review?.foundationBinding);
  const reviewItems = safeRecordArray(reviewPackage?.items);
  const acceptedCount = Number(reviewPackage?.acceptedCount ?? 0);
  const quarantinedCount = Number(reviewPackage?.quarantinedCount ?? 0);
  const stage = String(governance?.stage ?? "not loaded");
  const supplierFound = foundation?.supplierFound === true;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await authorizedFetch("/.netlify/functions/admin-supplier-source-policy");
        if (!response.ok) return;
        const body = (await response.json()) as JsonRecord;
        const channels = safeRecordArray(body.channels);
        if (!cancelled) setSourcePolicies(channels);
      } catch {
        // Source policy visibility is informational; operational flows remain independently gated.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const preview = asRecord(sourcePreview?.preview);
  const previewFacts = asRecord(preview?.facts);
  const previewImages = Array.isArray(previewFacts?.images)
    ? previewFacts.images.filter((item): item is string => typeof item === "string")
    : [];
  const onboardingCandidateEnvelope = asRecord(supplierOnboardingResult?.candidate);
  const onboardingCandidate = asRecord(onboardingCandidateEnvelope?.candidate);
  const normalizationEnvelope = asRecord(transportNormalization?.normalization);
  const normalizationBatch = asRecord(normalizationEnvelope?.batch);
  const normalizationVariants = safeRecordArray(normalizationBatch?.variants);
  const acquisitionRun = asRecord(acquisitionResult?.acquisition);
  const acquisitionControl = asRecord(acquisitionResult?.control);
  const acquisitionPreflightSnapshot = asRecord(acquisitionPreflight?.preflight);
  const acquisitionPreflightBinding = asRecord(acquisitionPreflightSnapshot?.binding);
  const acquisitionPreflightConfig = asRecord(acquisitionPreflightSnapshot?.config);
  const readinessSnapshot = asRecord(onboardingReadiness?.readiness);
  const resolvedSupplierId = String(readinessSnapshot?.supplierId ?? onboardingCandidate?.supplierId ?? "");
  const readinessBlockers = Array.isArray(readinessSnapshot?.blockers)
    ? readinessSnapshot.blockers.filter((item): item is string => typeof item === "string")
    : [];
  const missingQualification = Array.isArray(readinessSnapshot?.missingQualificationEvidence)
    ? readinessSnapshot.missingQualificationEvidence.filter((item): item is string => typeof item === "string")
    : [];
  const missingCapabilities = Array.isArray(readinessSnapshot?.missingCapabilityEvidence)
    ? readinessSnapshot.missingCapabilityEvidence.filter((item): item is string => typeof item === "string")
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

  async function saveDiscoveryCandidate() {
    setError(null);
    setDiscoveryCandidate(null);
    if (!productUrl.trim() || !preview) {
      setError("Inspect a product URL before saving a discovery candidate.");
      return;
    }

    setLoading("discoverySave");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-product-discovery-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl.trim(), note: discoveryNote.trim() }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to save discovery candidate."));
      setDiscoveryCandidate(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save discovery candidate.");
    } finally {
      setLoading(null);
    }
  }

  function loadQualifiedSupplierApplication(application: JsonRecord) {
    const applicationId = String(application.id ?? "").trim();
    const status = String(application.status ?? "").trim().toLowerCase();
    const legalName = String(application.legal_name ?? "").trim();
    const methods = Array.isArray(application.catalog_methods)
      ? application.catalog_methods.filter((item): item is DirectSupplierOnboardingForm["feedTransport"] =>
          typeof item === "string"
          && ["json_api", "json_feed", "feed_url", "csv", "xml", "sftp", "manual_catalog"].includes(item),
        )
      : [];
    const territories = Array.isArray(application.fulfilment_territories)
      ? application.fulfilment_territories.filter((item): item is string => typeof item === "string")
      : [];

    if (!applicationId || status !== "qualified" || !legalName || methods.length === 0) {
      setError("Only a qualified supplier application with a valid legal name and catalogue method can be loaded into onboarding.");
      return;
    }

    const feedTransport = methods[0];
    setSupplierOnboarding((current) => ({
      ...current,
      supplierKey: "",
      legalName,
      registrationCountry: String(application.registration_country ?? "GB").trim().toUpperCase(),
      registrationNumber: String(application.registration_number ?? "").trim(),
      vatNumber: String(application.vat_number ?? "").trim(),
      feedTransport,
      sourceFormat: sourceFormatForTransport(feedTransport),
      warehouseDeclarations: "",
      territories: territories.join(","),
      capabilities: "catalog",
      configRef: "",
      commercialTermsRef: "",
      paymentTermsDays: "",
      dispatchSlaHours: application.dispatch_sla_hours == null ? "" : String(application.dispatch_sla_hours),
      returnWindowDays: "",
      onboardingStatus: "draft",
      reviewReason: `Loaded from qualified public application ${applicationId}. Confirm supplier key, warehouse references, selected catalogue route, requested capabilities, commercial terms and evidence before progressing.`,
    }));
    setSupplierKey("");
    setSupplierOnboardingResult(null);
    setSourceSupplierApplicationId(applicationId);
    setSourceSupplierApplicationLabel(legalName);
    setError(null);
    window.setTimeout(() => {
      document.getElementById("direct-supplier-onboarding")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function saveSupplierOnboarding(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSupplierOnboardingResult(null);

    const territories = supplierOnboarding.territories.split(",").map((item) => item.trim().toUpperCase()).filter(Boolean);
    const capabilities = supplierOnboarding.capabilities.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
    const warehouseDeclarations = supplierOnboarding.warehouseDeclarations
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.lastIndexOf(":");
        if (separator <= 0) return null;
        const externalWarehouseRef = item.slice(0, separator).trim();
        const country = item.slice(separator + 1).trim().toUpperCase();
        return externalWarehouseRef && /^[A-Z]{2}$/.test(country)
          ? { externalWarehouseRef, country }
          : null;
      })
      .filter((item): item is { externalWarehouseRef: string; country: string } => item !== null);
    if (!supplierOnboarding.supplierKey.trim() || !supplierOnboarding.legalName.trim()) {
      setError("Supplier key and legal name are required for Direct Supplier onboarding.");
      return;
    }
    if (territories.length === 0) {
      setError("At least one supported territory is required.");
      return;
    }
    if (warehouseDeclarations.length === 0) {
      setError("Declare at least one supplier warehouse as reference:country, for example main:GB.");
      return;
    }

    setLoading("supplierOnboarding");
    try {
      const candidateResponse = await authorizedFetch("/.netlify/functions/admin-direct-supplier-foundation-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingVersion: 1,
          supplierKey: supplierOnboarding.supplierKey.trim().toLowerCase(),
          legalName: supplierOnboarding.legalName.trim(),
          registrationCountry: supplierOnboarding.registrationCountry.trim().toUpperCase(),
          registrationNumber: supplierOnboarding.registrationNumber.trim() || undefined,
          vatNumber: supplierOnboarding.vatNumber.trim() || undefined,
          feedTransport: supplierOnboarding.feedTransport,
          sourceFormat: supplierOnboarding.sourceFormat,
          warehouseDeclarations,
          supportedTerritories: territories,
          requestedCapabilities: capabilities,
          commercialApproval: false,
          hostedActivation: "off",
        }),
      });
      const candidateBody = (await candidateResponse.json()) as JsonRecord;
      if (!candidateResponse.ok) throw new Error(String(candidateBody.error ?? "Unable to create supplier candidate."));
      const candidate = asRecord(candidateBody.candidate);
      const supplierId = String(candidate?.supplierId ?? "");
      if (!supplierId) throw new Error("Supplier candidate did not return a Supplier Foundation ID.");

      const profileResponse = await authorizedFetch("/.netlify/functions/admin-supplier-onboarding-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          payload: {
            supplierId,
            sourceClass: "direct_supplier",
            feedTransport: supplierOnboarding.feedTransport,
            sourceFormat: supplierOnboarding.sourceFormat,
            configRef: supplierOnboarding.configRef.trim() || undefined,
            supportedTerritories: territories,
            requestedCapabilities: capabilities,
            commercialTermsRef: supplierOnboarding.commercialTermsRef.trim() || undefined,
            currency: supplierOnboarding.currency.trim().toUpperCase() || undefined,
            paymentTermsDays: supplierOnboarding.paymentTermsDays || undefined,
            dispatchSlaHours: supplierOnboarding.dispatchSlaHours || undefined,
            returnWindowDays: supplierOnboarding.returnWindowDays || undefined,
            onboardingStatus: supplierOnboarding.onboardingStatus,
            reviewReason: supplierOnboarding.reviewReason.trim() || undefined,
          },
        }),
      });
      const profileBody = (await profileResponse.json()) as JsonRecord;
      if (!profileResponse.ok) throw new Error(String(profileBody.error ?? "Unable to save supplier onboarding profile."));
      let applicationLink: JsonRecord | null = null;
      if (sourceSupplierApplicationId) {
        const applicationResponse = await authorizedFetch("/.netlify/functions/admin-supplier-applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            payload: {
              applicationId: sourceSupplierApplicationId,
              status: "converted",
              convertedSupplierId: supplierId,
              reviewNotes: supplierOnboarding.reviewReason.trim() || undefined,
            },
          }),
        });
        const applicationBody = (await applicationResponse.json()) as JsonRecord;
        if (applicationResponse.ok) {
          applicationLink = applicationBody;
          setSourceSupplierApplicationId("");
          setSourceSupplierApplicationLabel("");
        } else {
          setError(`Supplier candidate and onboarding profile were saved, but the source application could not be linked: ${String(applicationBody.error ?? "unknown error")}`);
        }
      }

      setSupplierOnboardingResult({ candidate: candidateBody, profile: profileBody, applicationLink });
      setSupplierKey(supplierOnboarding.supplierKey.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save Direct Supplier onboarding.");
    } finally {
      setLoading(null);
    }
  }

  async function previewTransportNormalization() {
    setError(null);
    setTransportNormalization(null);
    if (!supplierOnboarding.supplierKey.trim() || !transportPreviewPayload.trim()) {
      setError("Supplier key and a source payload are required for transport normalization preview.");
      return;
    }

    let fieldMap: JsonRecord | undefined;
    try {
      const parsed = JSON.parse(transportFieldMapJson || "{}") as unknown;
      if (parsed && (typeof parsed !== "object" || Array.isArray(parsed))) {
        throw new Error("Field mapping must be a JSON object.");
      }
      fieldMap = asRecord(parsed) ?? undefined;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Field mapping JSON is invalid.");
      return;
    }

    setLoading("transportNormalize");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-direct-supplier-normalize-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierKey: supplierOnboarding.supplierKey.trim().toLowerCase(),
          transport: supplierOnboarding.feedTransport,
          sourceFormat: supplierOnboarding.sourceFormat,
          rawPayload: transportPreviewPayload,
          fieldMap: fieldMap && Object.keys(fieldMap).length > 0 ? fieldMap : undefined,
          amountUnit: transportAmountUnit,
          minorUnitDigits: 2,
          xmlRecordElement: supplierOnboarding.sourceFormat === "xml"
            ? transportXmlRecordElement.trim() || "product"
            : undefined,
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) {
        const details = Array.isArray(body.errors) ? body.errors.join(" · ") : String(body.error ?? "Unable to normalize supplier source.");
        throw new Error(details);
      }
      setTransportNormalization(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to normalize supplier source.");
    } finally {
      setLoading(null);
    }
  }

  async function preflightAcquisitionConfig() {
    setError(null);
    setAcquisitionPreflight(null);
    const supplierKey = supplierOnboarding.supplierKey.trim().toLowerCase();
    const configRef = supplierOnboarding.configRef.trim();
    if (!supplierKey) {
      setError("Supplier key is required before config preflight.");
      return;
    }
    if (!/^env:[A-Z][A-Z0-9_]{2,127}$/.test(configRef)) {
      setError("Config preflight requires configRef in env:VARIABLE_NAME format.");
      return;
    }

    setLoading("acquisitionPreflight");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-acquisition-preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierKey,
          configRef,
          transport: supplierOnboarding.feedTransport,
          sourceFormat: supplierOnboarding.sourceFormat,
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to preflight acquisition config."));
      setAcquisitionPreflight(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to preflight acquisition config.");
    } finally {
      setLoading(null);
    }
  }

  async function saveAcquisitionControl() {
    setError(null);
    setAcquisitionResult(null);
    if (!resolvedSupplierId) {
      setError("Resolve the Supplier Foundation ID before configuring acquisition.");
      return;
    }
    if (acquisitionEnabled && !/^env:[A-Z][A-Z0-9_]{2,127}$/.test(supplierOnboarding.configRef.trim())) {
      setError("Enabled acquisition requires configRef in env:VARIABLE_NAME format.");
      return;
    }
    const refreshMinutes = Number(acquisitionRefreshMinutes);
    if (acquisitionMode === "scheduled" && (!Number.isInteger(refreshMinutes) || refreshMinutes < 15 || refreshMinutes > 10080)) {
      setError("Scheduled refresh must be between 15 and 10080 minutes.");
      return;
    }

    setLoading("acquisitionControl");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-acquisition-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: resolvedSupplierId,
          enabled: acquisitionEnabled,
          mode: acquisitionMode,
          refreshMinutes: acquisitionMode === "scheduled" ? refreshMinutes : undefined,
          configRef: supplierOnboarding.configRef.trim(),
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to update supplier acquisition control."));
      setAcquisitionResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update supplier acquisition control.");
    } finally {
      setLoading(null);
    }
  }

  async function acquireSupplierNow() {
    setError(null);
    setAcquisitionResult(null);
    const key = supplierOnboarding.supplierKey.trim().toLowerCase();
    if (!key) {
      setError("Supplier key is required before acquisition.");
      return;
    }

    setLoading("acquireNow");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-direct-supplier-acquire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierKey: key }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) {
        const blockers = Array.isArray(body.blockers) ? body.blockers.join(" · ") : "";
        throw new Error([String(body.error ?? "Supplier acquisition failed."), blockers].filter(Boolean).join(" — "));
      }
      setAcquisitionResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Supplier acquisition failed.");
    } finally {
      setLoading(null);
    }
  }

  async function evaluateOnboardingReadiness() {
    setError(null);
    setOnboardingReadiness(null);
    const key = supplierOnboarding.supplierKey.trim().toLowerCase() || supplierKey.trim().toLowerCase();
    if (!key) {
      setError("Enter a supplier key before evaluating onboarding readiness.");
      return;
    }
    setLoading("onboardingReadiness");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-onboarding-readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierKey: key, territory: "GB" }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to evaluate supplier onboarding readiness."));
      setOnboardingReadiness(body);
      setSupplierKey(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate supplier onboarding readiness.");
    } finally {
      setLoading(null);
    }
  }

  async function runFoundationMutation(
    action: "set_qualification" | "activate_sla" | "set_compliance" | "set_lifecycle" | "register_adapter",
    payload: JsonRecord,
    loadingKey: "qualification" | "sla" | "compliance" | "lifecycle" | "adapter",
  ) {
    if (!resolvedSupplierId) {
      setError("Resolve the Supplier Foundation ID first by saving onboarding or refreshing readiness.");
      return false;
    }
    setError(null);
    setLoading(loadingKey);
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-foundation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload: { supplierId: resolvedSupplierId, ...payload } }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Supplier Foundation update failed."));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Supplier Foundation update failed.");
      return false;
    } finally {
      setLoading(null);
    }
  }

  async function saveQualificationEvidence() {
    if (!qualificationSourceRef.trim()) {
      setError("Qualification source reference is required for verified evidence.");
      return;
    }
    const ok = await runFoundationMutation("set_qualification", {
      evidenceType: qualificationEvidenceType,
      status: "verified",
      sourceRef: qualificationSourceRef.trim(),
      evidenceSummary: qualificationSummary.trim() || undefined,
    }, "qualification");
    if (ok) await evaluateOnboardingReadiness();
  }

  async function activateSupplierSla() {
    if (!supplierOnboarding.commercialTermsRef.trim()) {
      setError("Commercial terms reference is required before activating the supplier SLA.");
      return;
    }
    const ok = await runFoundationMutation("activate_sla", {
      version: slaVersion,
      commercialTermsRef: supplierOnboarding.commercialTermsRef.trim(),
      dispatchHours: supplierOnboarding.dispatchSlaHours || undefined,
      returnWindowDays: supplierOnboarding.returnWindowDays || undefined,
      effectiveFrom: new Date().toISOString(),
    }, "sla");
    if (ok) await evaluateOnboardingReadiness();
  }

  async function saveSupplierCompliance() {
    if (!complianceSourceRef.trim()) {
      setError("Compliance source reference is required.");
      return;
    }
    const ok = await runFoundationMutation("set_compliance", {
      territory: "GB",
      riskClass: "green",
      status: "approved",
      evidenceSummary: complianceSummary.trim() || "Reviewed supplier compliance evidence",
      sourceRefs: [complianceSourceRef.trim()],
    }, "compliance");
    if (ok) await evaluateOnboardingReadiness();
  }

  async function advanceSupplierLifecycle() {
    if (!onboardingGovernanceReason.trim()) {
      setError("A lifecycle governance reason is required.");
      return;
    }
    const ok = await runFoundationMutation("set_lifecycle", {
      status: lifecycleTarget,
      reason: onboardingGovernanceReason.trim(),
    }, "lifecycle");
    if (ok) await evaluateOnboardingReadiness();
  }

  async function saveSupplierCapabilityEvidence() {
    if (!resolvedSupplierId || !capabilitySourceRef.trim()) {
      setError("Resolve the supplier and provide a capability evidence source reference.");
      return;
    }
    setError(null);
    setLoading("capability");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-onboarding-capability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: resolvedSupplierId,
          territory: "GB",
          capability: capabilityName,
          status: "verified",
          sourceRefs: [capabilitySourceRef.trim()],
          evidenceSummary: capabilitySummary.trim() || undefined,
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to save supplier capability evidence."));
      await evaluateOnboardingReadiness();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save supplier capability evidence.");
    } finally {
      setLoading(null);
    }
  }

  async function registerDirectSupplierAdapter() {
    const capabilities = supplierOnboarding.capabilities
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!supplierOnboarding.configRef.trim()) {
      setError("A server-side config reference is required before adapter registration.");
      return;
    }
    const ok = await runFoundationMutation("register_adapter", {
      providerKey: "direct_supplier",
      adapterKey: "direct_supplier",
      interfaceVersion: 1,
      adapterVersion: "1.0.0",
      status: adapterStatus,
      capabilities,
      configRef: supplierOnboarding.configRef.trim(),
    }, "adapter");
    if (ok) await evaluateOnboardingReadiness();
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
  const offerSelectionResult = asRecord(offerSelection?.result);
  const selectedSupplierOffer = asRecord(offerSelectionResult?.selected);
  const rankedSupplierOffers = safeRecordArray(offerSelectionResult?.ranked);
  const rejectedSupplierOffers = safeRecordArray(offerSelectionResult?.rejected);

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

  async function evaluateProjectionOffers() {
    setError(null);
    setOfferSelection(null);
    const projection = asRecord(marketplaceProjection?.projection);
    const projectionId = String(projection?.projectionId ?? "");
    if (!projectionId) {
      setError("Create the governed marketplace projection before evaluating supplier offers.");
      return;
    }

    setLoading("offerSelection");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-offer-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", projectionId, requestedQuantity: 1, territory: "GB" }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to evaluate supplier offers."));
      setOfferSelection(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate supplier offers.");
    } finally {
      setLoading(null);
    }
  }

  async function mutateProjectionOffer(action: "bind" | "approve" | "disable") {
    setError(null);
    setOfferBinding(null);
    const projection = asRecord(marketplaceProjection?.projection);
    const projectionId = String(projection?.projectionId ?? "");
    if (!projectionId) {
      setError("Create the governed marketplace projection before managing supplier offers.");
      return;
    }
    if (!alternateSupplierOfferId.trim() || !offerBindingReason.trim()) {
      setError("Supplier offer ID and a governance reason are required.");
      return;
    }

    setLoading(action === "bind" ? "offerBind" : action === "approve" ? "offerApprove" : "offerDisable");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-offer-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          projectionId,
          supplierOfferId: alternateSupplierOfferId.trim(),
          reason: offerBindingReason.trim(),
          fallbackAllowed,
        }),
      });
      const body = (await response.json()) as JsonRecord;
      if (!response.ok) throw new Error(String(body.error ?? "Unable to update supplier offer binding."));
      setOfferBinding(body);
      await evaluateProjectionOffers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update supplier offer binding.");
    } finally {
      setLoading(null);
    }
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

      {sourcePolicies.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-semibold">Loadify Supplier Hub · independent supply channels</h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                Supplier identity, commercial authority, rights/compliance, economics and publication remain separate gates.
                Discovery can never publish directly, and Loadify assumes no physical warehouse.
              </p>
            </div>
            <Badge variant="outline">Provider-neutral · Fail-closed</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {sourcePolicies.map((policy) => {
              const transports = Array.isArray(policy.allowedTransports)
                ? policy.allowedTransports.filter((item): item is string => typeof item === "string")
                : [];
              return (
                <div key={String(policy.channel)} className="rounded-xl border border-border bg-background p-4">
                  <div className="text-sm font-semibold">{String(policy.label ?? policy.channel)}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {transports.slice(0, 6).map((transport) => (
                      <Badge key={transport} variant="outline" className="text-[10px]">{transport.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{String(policy.notes ?? "")}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <SupplierApplicationQueue onLoadQualifiedApplication={loadQualifiedSupplierApplication} />

      <ControlledPilotReadiness />

      <SupplierOperationsHealth supplierId={resolvedSupplierId} />

      <FirstSupplierLaunchGate supplierKey={supplierOnboarding.supplierKey || supplierKey} />

      <section id="direct-supplier-onboarding" className="scroll-mt-28 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold">Direct Supplier onboarding</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Create a real Supplier Foundation candidate and persist reviewed source/commercial configuration.
              This records onboarding intent only: no capability promotion, supplier activation, listing, order or payment is created.
            </p>
          </div>
          <Badge variant="outline">First-class direct supply</Badge>
        </div>

        {sourceSupplierApplicationId && (
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">
            <strong>Qualified application loaded: {sourceSupplierApplicationLabel}</strong>
            <p className="mt-1 text-muted-foreground">
              Only submitted facts were copied. Supplier key, warehouse references, capability scope, configuration,
              commercial terms and evidence were intentionally not invented and still require admin confirmation.
            </p>
          </div>
        )}

        <form onSubmit={saveSupplierOnboarding} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium">
            Supplier key
            <Input value={supplierOnboarding.supplierKey} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, supplierKey: e.target.value }))} placeholder="acme-wholesale-uk" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Legal name
            <Input value={supplierOnboarding.legalName} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, legalName: e.target.value }))} placeholder="Supplier legal entity" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Registration country
            <Input value={supplierOnboarding.registrationCountry} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, registrationCountry: e.target.value }))} maxLength={2} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Feed / import transport
            <select
              value={supplierOnboarding.feedTransport}
              onChange={(e) => {
                const feedTransport = e.target.value as DirectSupplierOnboardingForm["feedTransport"];
                const sourceFormat = feedTransport === "csv"
                  ? "csv"
                  : feedTransport === "xml"
                    ? "xml"
                    : feedTransport === "manual_catalog"
                      ? "canonical_json"
                      : feedTransport === "json_api" || feedTransport === "json_feed"
                        ? "json"
                        : supplierOnboarding.sourceFormat;
                setSupplierOnboarding((v) => ({ ...v, feedTransport, sourceFormat }));
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="json_api">API</option>
              <option value="json_feed">JSON feed</option>
              <option value="feed_url">Feed URL</option>
              <option value="csv">CSV upload / import</option>
              <option value="xml">XML upload / import</option>
              <option value="sftp">SFTP</option>
              <option value="manual_catalog">Manual catalog</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Source format
            <select
              value={supplierOnboarding.sourceFormat}
              onChange={(e) => setSupplierOnboarding((v) => ({ ...v, sourceFormat: e.target.value as DirectSupplierOnboardingForm["sourceFormat"] }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
              <option value="canonical_json">Canonical JSON</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Registration number
            <Input value={supplierOnboarding.registrationNumber} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, registrationNumber: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            VAT number
            <Input value={supplierOnboarding.vatNumber} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, vatNumber: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Supplier warehouses
            <Input value={supplierOnboarding.warehouseDeclarations} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, warehouseDeclarations: e.target.value }))} placeholder="main:GB,eu-hub:IE" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Supported territories
            <Input value={supplierOnboarding.territories} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, territories: e.target.value }))} placeholder="GB,IE" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Server config reference
            <Input value={supplierOnboarding.configRef} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, configRef: e.target.value }))} placeholder="env:SUPPLIER_ACQUISITION_ACME_V1" />
          </label>

          <label className="space-y-1.5 text-sm font-medium md:col-span-2">
            Requested capabilities
            <Input value={supplierOnboarding.capabilities} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, capabilities: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Commercial terms reference
            <Input value={supplierOnboarding.commercialTermsRef} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, commercialTermsRef: e.target.value }))} placeholder="contract / approved terms ref" />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Currency
            <Input value={supplierOnboarding.currency} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, currency: e.target.value }))} maxLength={3} />
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            Payment terms days
            <Input type="number" min="0" value={supplierOnboarding.paymentTermsDays} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, paymentTermsDays: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Dispatch SLA hours
            <Input type="number" min="0" value={supplierOnboarding.dispatchSlaHours} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, dispatchSlaHours: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Return window days
            <Input type="number" min="0" value={supplierOnboarding.returnWindowDays} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, returnWindowDays: e.target.value }))} />
          </label>
          <label className="space-y-1.5 text-sm font-medium">
            Onboarding status
            <select value={supplierOnboarding.onboardingStatus} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, onboardingStatus: e.target.value as DirectSupplierOnboardingForm["onboardingStatus"] }))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="draft">Draft</option>
              <option value="qualification">Qualification</option>
              <option value="ready_for_review">Ready for review</option>
              <option value="approved">Approved (Foundation gates required)</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>

          <label className="space-y-1.5 text-sm font-medium md:col-span-2 xl:col-span-4">
            Review reason
            <Input value={supplierOnboarding.reviewReason} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, reviewReason: e.target.value }))} placeholder="Evidence / decision note for this onboarding state" />
          </label>

          <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
            <Button type="submit" disabled={loading !== null}>
              {loading === "supplierOnboarding" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Save Direct Supplier onboarding
            </Button>
            <span className="text-xs text-muted-foreground">Credentials are forbidden here; configRef points only to server-side configuration.</span>
          </div>

          {supplierOnboardingResult && (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3 text-sm text-emerald-700 md:col-span-2 xl:col-span-4">
              Supplier candidate and onboarding dossier saved. Activation remains unchanged and downstream qualification/compliance/economics gates still apply.
            </div>
          )}
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold">Transport normalization preview</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Convert supplier JSON, CSV or flat XML into the canonical Direct Supplier batch before staging.
              Feed URL and SFTP are configuration-only here: this preview performs no network access, persistence, publication or supplier order.
            </p>
          </div>
          <Badge variant="outline">Local normalization only</Badge>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-medium">
              Source payload
              <textarea
                value={transportPreviewPayload}
                onChange={(e) => setTransportPreviewPayload(e.target.value)}
                className="min-h-56 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                placeholder={supplierOnboarding.sourceFormat === "csv"
                  ? "product_id,variant_id,name,currency,price,country"
                  : supplierOnboarding.sourceFormat === "xml"
                    ? "<catalog><product>...</product></catalog>"
                    : "[{ ...supplier product... }]"}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1.5 text-sm font-medium">
                Amount unit
                <select value={transportAmountUnit} onChange={(e) => setTransportAmountUnit(e.target.value as "minor" | "major")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="minor">Minor units (1299)</option>
                  <option value="major">Major units (12.99)</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                XML record element
                <Input value={transportXmlRecordElement} onChange={(e) => setTransportXmlRecordElement(e.target.value)} disabled={supplierOnboarding.sourceFormat !== "xml"} placeholder="product" />
              </label>
              <div className="flex items-end">
                <Button type="button" onClick={() => void previewTransportNormalization()} disabled={loading !== null || !transportPreviewPayload.trim()} className="w-full">
                  {loading === "transportNormalize" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                  Normalize preview
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block space-y-1.5 text-sm font-medium">
              Field mapping JSON
              <textarea
                value={transportFieldMapJson}
                onChange={(e) => setTransportFieldMapJson(e.target.value)}
                className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                placeholder='{"externalProductRef":"product_id","externalVariantRef":"variant_id","title":"name","currency":"currency","amount":"price","warehouseCountry":"country"}'
              />
            </label>
            <p className="text-xs leading-5 text-muted-foreground">
              Leave the mapping as an empty object for canonical field names. JSON mappings support dotted paths. CSV/XML mappings use column or tag names.
              Secrets and credentials are rejected by the preview endpoint.
            </p>

            {transportNormalization && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">records {String(normalizationEnvelope?.recordCount ?? normalizationVariants.length)}</Badge>
                  <Badge variant="outline">transport {String(normalizationBatch?.transport ?? "—")}</Badge>
                  <Badge variant="outline">format {String(normalizationBatch?.sourceFormat ?? "—")}</Badge>
                  <Badge variant="outline">external access NO</Badge>
                  <Badge variant="outline">persistence NO</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {normalizationVariants.slice(0, 3).map((variant, index) => (
                    <div key={index} className="rounded-lg border border-border bg-background p-3 text-xs">
                      <div className="font-semibold">{String(variant.title ?? "Untitled")}</div>
                      <div className="mt-1 text-muted-foreground">
                        {String(variant.externalVariantRef ?? "—")} · {String(variant.currency ?? "—")} {String(variant.amountMinor ?? "—")} minor units · stock {String(variant.stockQuantity ?? "—")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold">Remote acquisition runtime</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Enable remote acquisition only after onboarding/Foundation gates are approved. Credentials never enter this form:
              configRef points to a Netlify environment secret containing the supplier HTTP/API/SFTP configuration.
            </p>
          </div>
          <Badge variant="outline">Fail-closed · staging only</Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">Acquisition control</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={acquisitionEnabled}
                  onChange={(e) => setAcquisitionEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                Acquisition enabled
              </label>
              <select
                value={acquisitionMode}
                onChange={(e) => setAcquisitionMode(e.target.value as "manual" | "scheduled")}
                className="h-10 rounded-md border border-input bg-card px-3 text-sm"
              >
                <option value="manual">Manual only</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <Input
                value={supplierOnboarding.configRef}
                onChange={(e) => setSupplierOnboarding((v) => ({ ...v, configRef: e.target.value }))}
                placeholder="env:SUPPLIER_ACQUISITION_ACME_V1"
              />
              <Input
                type="number"
                min="15"
                max="10080"
                value={acquisitionRefreshMinutes}
                onChange={(e) => setAcquisitionRefreshMinutes(e.target.value)}
                disabled={acquisitionMode !== "scheduled"}
                placeholder="Refresh minutes"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void preflightAcquisitionConfig()} disabled={loading !== null || !supplierOnboarding.supplierKey.trim() || !supplierOnboarding.configRef.trim()}>
                {loading === "acquisitionPreflight" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Preflight configRef
              </Button>
              <Button type="button" variant="outline" onClick={() => void saveAcquisitionControl()} disabled={loading !== null || !resolvedSupplierId}>
                {loading === "acquisitionControl" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Save acquisition control
              </Button>
              <Button type="button" onClick={() => void acquireSupplierNow()} disabled={loading !== null || !supplierOnboarding.supplierKey.trim()}>
                {loading === "acquireNow" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Acquire now
              </Button>
            </div>

            {acquisitionPreflightSnapshot && (
              <div className="mt-3 rounded-xl border border-border bg-card p-3">
                <div className="grid gap-2 text-sm sm:grid-cols-3">
                  <Metric label="Secret provisioned" value={acquisitionPreflightSnapshot.provisioned === true ? "YES" : "NO"} />
                  <Metric label="Config valid" value={acquisitionPreflightSnapshot.valid === true ? "YES" : "NO"} />
                  <Metric label="Binding" value={acquisitionPreflightSnapshot.bound === true ? "MATCH" : "BLOCKED"} />
                  <Metric label="Supplier key" value={acquisitionPreflightBinding?.supplierKeyMatches === true ? "MATCH" : "—"} />
                  <Metric label="Transport" value={acquisitionPreflightBinding?.transportMatches === true ? "MATCH" : "—"} />
                  <Metric label="Source format" value={acquisitionPreflightBinding?.sourceFormatMatches === true ? "MATCH" : "—"} />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Preflight performs no DNS lookup or supplier request. Secret material returned: NO. External access: NO.
                  {acquisitionPreflightConfig?.kind ? ` Runtime config: ${String(acquisitionPreflightConfig.kind)}.` : ""}
                </div>
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Scheduled mode is evaluated every 15 minutes but only suppliers explicitly enabled here can run.
              Remote fetches are limited, redirect-free, public-network only and persist only to governed staging/quarantine.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">Latest acquisition action</div>
            {!acquisitionResult ? (
              <p className="mt-2 text-sm text-muted-foreground">No acquisition action in this session.</p>
            ) : (
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <Metric label="Control enabled" value={String(acquisitionControl?.acquisitionEnabled ?? "—")} />
                <Metric label="Mode" value={String(acquisitionControl?.acquisitionMode ?? "—")} />
                <Metric label="Run ID" value={String(acquisitionRun?.runId ?? "—")} />
                <Metric label="Batch ID" value={String(acquisitionRun?.batchId ?? "—")} />
                <Metric label="Accepted" value={String(acquisitionRun?.acceptedCount ?? "—")} />
                <Metric label="Quarantined" value={String(acquisitionRun?.quarantinedCount ?? "—")} />
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Acquisition never publishes a marketplace listing, promotes capabilities, creates supplier orders or performs payment.
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold">Qualification → capability verification → catalog handoff</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
              Record only reviewed evidence. Direct Supplier capability verification is supplier-specific; one supplier can never validate another.
              Catalog ingestion remains blocked until the Supplier Foundation, commercial/SLA, compliance and active catalog adapter gates all pass.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void evaluateOnboardingReadiness()} disabled={loading !== null}>
            {loading === "onboardingReadiness" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Refresh readiness
          </Button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Supplier ID" value={resolvedSupplierId || "Unresolved"} />
          <Metric label="Lifecycle" value={String(readinessSnapshot?.lifecycleStatus ?? "—")} />
          <Metric label="Onboarding" value={String(readinessSnapshot?.onboardingStatus ?? "—")} />
          <Metric label="Catalog handoff" value={readinessSnapshot?.catalogIngestionEligible === true ? "READY" : "BLOCKED"} />
        </div>

        {readinessSnapshot && (
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Readiness blockers</div>
              <div className="mt-2 text-sm">{readinessBlockers.length ? readinessBlockers.join(" · ") : "None"}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missing qualification</div>
              <div className="mt-2 text-sm">{missingQualification.length ? missingQualification.join(" · ") : "None"}</div>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Missing capability evidence</div>
              <div className="mt-2 text-sm">{missingCapabilities.length ? missingCapabilities.join(" · ") : "None"}</div>
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">1. Qualification evidence</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Supplier Foundation requires current evidence for identity, business, fulfilment, feed/import quality, tracking, returns, documentation, compliance and content rights.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select value={qualificationEvidenceType} onChange={(e) => setQualificationEvidenceType(e.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                {["identity","business_identity","warehouse_origin","uk_shipping","api_feed_capability","stock_reliability","price_reliability","tracking","returns","documentation","compliance","content_rights"].map((value) => (
                  <option key={value} value={value}>{value === "api_feed_capability" ? "feed/import capability" : value.replace(/_/g, " ")}</option>
                ))}
              </select>
              <Input value={qualificationSourceRef} onChange={(e) => setQualificationSourceRef(e.target.value)} placeholder="Evidence source reference" />
              <Input className="sm:col-span-2" value={qualificationSummary} onChange={(e) => setQualificationSummary(e.target.value)} placeholder="Reviewed evidence summary" />
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void saveQualificationEvidence()} disabled={loading !== null || !resolvedSupplierId}>
              {loading === "qualification" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify qualification evidence
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">2. Commercial terms & SLA</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Activates a versioned internal SLA record only. It does not enable Supplier Commerce or provider ordering.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input value={slaVersion} onChange={(e) => setSlaVersion(e.target.value)} placeholder="SLA version" />
              <Input value={supplierOnboarding.commercialTermsRef} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, commercialTermsRef: e.target.value }))} placeholder="Commercial terms reference" />
              <Input type="number" min="1" value={supplierOnboarding.dispatchSlaHours} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, dispatchSlaHours: e.target.value }))} placeholder="Dispatch SLA hours" />
              <Input type="number" min="0" value={supplierOnboarding.returnWindowDays} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, returnWindowDays: e.target.value }))} placeholder="Return window days" />
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void activateSupplierSla()} disabled={loading !== null || !resolvedSupplierId}>
              {loading === "sla" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activate reviewed SLA
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">3. GB compliance decision</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Approval requires a real source reference. Red-risk suppliers remain fail-closed in the database.
            </p>
            <div className="mt-3 space-y-3">
              <Input value={complianceSourceRef} onChange={(e) => setComplianceSourceRef(e.target.value)} placeholder="Compliance source reference" />
              <Input value={complianceSummary} onChange={(e) => setComplianceSummary(e.target.value)} placeholder="Compliance review summary" />
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void saveSupplierCompliance()} disabled={loading !== null || !resolvedSupplierId}>
              {loading === "compliance" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record approved GB compliance
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">4. Supplier lifecycle</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Approval is rejected unless all canonical qualification, SLA and compliance gates are already satisfied.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select value={lifecycleTarget} onChange={(e) => setLifecycleTarget(e.target.value as "verification" | "approved")} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                <option value="verification">Verification</option>
                <option value="approved">Approved</option>
              </select>
              <Input value={onboardingGovernanceReason} onChange={(e) => setOnboardingGovernanceReason(e.target.value)} placeholder="Governance reason" />
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void advanceSupplierLifecycle()} disabled={loading !== null || !resolvedSupplierId}>
              {loading === "lifecycle" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Apply lifecycle decision
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">5. Supplier-specific capability evidence</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              This evidence belongs to this supplier only. Verify each requested capability from real documentation, test evidence or contractual proof.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select value={capabilityName} onChange={(e) => setCapabilityName(e.target.value)} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                {["supplier_identity","catalog","variants","stock","price","shipping","order_submission","acknowledgement","tracking","cancellation","returns","reimbursement"].map((value) => (
                  <option key={value} value={value}>{value.replace(/_/g, " ")}</option>
                ))}
              </select>
              <Input value={capabilitySourceRef} onChange={(e) => setCapabilitySourceRef(e.target.value)} placeholder="Capability evidence source" />
              <Input className="sm:col-span-2" value={capabilitySummary} onChange={(e) => setCapabilitySummary(e.target.value)} placeholder="What was verified" />
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void saveSupplierCapabilityEvidence()} disabled={loading !== null || !resolvedSupplierId}>
              {loading === "capability" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify supplier capability
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="text-sm font-semibold">6. Direct Supplier adapter & catalog handoff</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Verification mode is non-live. Active mode is database-blocked until every registered capability has current supplier-specific evidence.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <select value={adapterStatus} onChange={(e) => setAdapterStatus(e.target.value as "verification" | "active")} className="h-10 rounded-md border border-input bg-card px-3 text-sm">
                <option value="verification">Verification</option>
                <option value="active">Active (evidence required)</option>
              </select>
              <Input value={supplierOnboarding.configRef} onChange={(e) => setSupplierOnboarding((v) => ({ ...v, configRef: e.target.value }))} placeholder="env:SUPPLIER_ACQUISITION_ACME_V1" />
            </div>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void registerDirectSupplierAdapter()} disabled={loading !== null || !resolvedSupplierId}>
              {loading === "adapter" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Register / verify adapter
            </Button>
            <div className="mt-3 text-xs text-muted-foreground">
              {readinessSnapshot?.catalogIngestionEligible === true
                ? "Catalog handoff is READY. Continue below with governed batch review and Phase F import planning."
                : "Catalog handoff remains BLOCKED. Resolve the readiness blockers above first."}
            </div>
          </div>
        </div>
      </section>

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
              <div className="mt-4 space-y-4 rounded-xl border border-primary/15 bg-primary/[0.03] p-4">
                <div className="grid gap-4 sm:grid-cols-[96px_1fr]">
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

                <div className="border-t border-border pt-4">
                  <label className="block space-y-1.5 text-xs font-medium">
                    Discovery note
                    <Input
                      value={discoveryNote}
                      onChange={(e) => setDiscoveryNote(e.target.value)}
                      placeholder="Why this product is worth sourcing"
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button type="button" variant="outline" onClick={saveDiscoveryCandidate} disabled={loading !== null}>
                      {loading === "discoverySave" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                      Save discovery candidate
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Discovery is non-commercial until an authorised supplier offer passes the later gates.
                    </span>
                  </div>
                  {discoveryCandidate && (
                    <div className="mt-3 text-xs font-medium text-emerald-700">
                      Discovery candidate saved. No listing, supplier offer, checkout or provider order was created.
                    </div>
                  )}
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
                      <div className="mt-3 space-y-4">
                        <div className="text-xs font-medium text-emerald-700">
                          Internal projection created · Buyer visible: {projectionPublication ? "YES" : "NO"} · Checkout: multi-supplier gated
                        </div>

                        <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-sm font-semibold">Multi-supplier fulfilment set</div>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Add only supplier offers for the same canonical product and territory. Binding does not bypass stock,
                                economics, shipping, tracking, returns or provider capability gates.
                              </p>
                            </div>
                            <Button type="button" variant="outline" onClick={evaluateProjectionOffers} disabled={loading !== null}>
                              {loading === "offerSelection" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                              Evaluate eligible offers
                            </Button>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-2">
                            <label className="space-y-1.5 text-xs font-medium">
                              Alternative supplier offer ID
                              <Input
                                value={alternateSupplierOfferId}
                                onChange={(e) => setAlternateSupplierOfferId(e.target.value)}
                                placeholder="Approved offer UUID for the same canonical product"
                              />
                            </label>
                            <label className="space-y-1.5 text-xs font-medium">
                              Governance reason
                              <Input
                                value={offerBindingReason}
                                onChange={(e) => setOfferBindingReason(e.target.value)}
                                placeholder="Why this offer is safe for this projection"
                              />
                            </label>
                          </div>

                          <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={fallbackAllowed}
                              onChange={(e) => setFallbackAllowed(e.target.checked)}
                              className="h-4 w-4 rounded border-border"
                            />
                            Allow as automatic fallback only when the original customer promise is preserved
                          </label>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" variant="outline" onClick={() => void mutateProjectionOffer("bind")} disabled={loading !== null}>
                              {loading === "offerBind" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Bind candidate
                            </Button>
                            <Button type="button" variant="outline" onClick={() => void mutateProjectionOffer("approve")} disabled={loading !== null}>
                              {loading === "offerApprove" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Approve offer
                            </Button>
                            <Button type="button" variant="outline" onClick={() => void mutateProjectionOffer("disable")} disabled={loading !== null}>
                              {loading === "offerDisable" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Disable offer
                            </Button>
                          </div>

                          {offerBinding && (
                            <div className="mt-3 text-xs text-emerald-700">
                              Supplier offer binding updated successfully.
                            </div>
                          )}

                          {offerSelectionResult && (
                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                              <Metric
                                label="Selected supplier"
                                value={selectedSupplierOffer ? String(selectedSupplierOffer.supplierKey ?? selectedSupplierOffer.supplierOfferId ?? "Eligible") : "None"}
                              />
                              <Metric label="Eligible offers" value={String(rankedSupplierOffers.length)} />
                              <Metric label="Rejected offers" value={String(rejectedSupplierOffers.length)} />
                            </div>
                          )}
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
                            Buyer catalog publication recorded. Checkout still requires fresh multi-supplier selection, exact SKU reservation and payment revalidation.
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
