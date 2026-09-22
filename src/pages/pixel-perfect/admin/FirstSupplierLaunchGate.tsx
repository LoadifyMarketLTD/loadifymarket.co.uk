import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default function FirstSupplierLaunchGate({ supplierKey }: { supplierKey: string }) {
  const [key, setKey] = useState(supplierKey);
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (supplierKey.trim()) setKey(supplierKey.trim());
  }, [supplierKey]);

  async function evaluate() {
    const normalized = key.trim().toLowerCase();
    if (!normalized) {
      setError("Enter a real Supplier Foundation key before evaluating launch readiness.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-first-supplier-launch-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierKey: normalized, territory: "GB" }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || "Unable to evaluate first supplier launch gate.");
      setResult(body);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Unable to evaluate first supplier launch gate.");
    } finally {
      setLoading(false);
    }
  }

  const phase7 = asRecord(result?.phase7);
  const phase8 = asRecord(result?.phase8);
  const onboarding = asRecord(result?.onboarding);
  const acquisition = asRecord(result?.acquisition);
  const health = asRecord(result?.health);
  const phase7Blockers = strings(phase7?.blockers);
  const phase8Blockers = strings(phase8?.blockers);
  const missingQualification = strings(onboarding?.missingQualificationEvidence);
  const missingCapabilities = strings(onboarding?.missingCapabilityEvidence);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">First Supplier Launch Gate · P7 / P8</h2>
          </div>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            One read-only decision surface for the first authentic Direct Supplier. P7 requires real onboarding,
            qualification, SLA, compliance, adapter and acquisition readiness. P8 remains blocked until a controlled
            pilot has real activation evidence and passes acceptance after real pilot activity.
          </p>
        </div>
        <Badge variant="outline">No automatic activation</Badge>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="text-sm font-medium">
          Supplier key
          <Input
            className="mt-1"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="real-supplier-key"
          />
        </label>
        <Button type="button" variant="outline" onClick={() => void evaluate()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Evaluate P7 / P8
        </Button>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {!result && !error && (
        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm leading-6 text-muted-foreground">
          No decision has been evaluated yet. The gate performs reads only and cannot create a supplier, enable acquisition,
          create or activate a pilot, publish a product, submit an order or change payment state.
        </div>
      )}

      {result && (
        <>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <GateCard
              title="P7 · First real supplier readiness"
              passed={bool(phase7?.passed)}
              subtitle={bool(phase7?.passed) ? "Supplier evidence and acquisition path are ready." : "HOLD until every real supplier prerequisite is satisfied."}
              blockers={phase7Blockers}
            />
            <GateCard
              title="P8 · Controlled pilot acceptance"
              passed={bool(phase8?.passed)}
              subtitle={bool(phase8?.passed) ? "Controlled pilot acceptance evidence passed." : "HOLD until a matching controlled pilot passes real acceptance evidence."}
              blockers={phase8Blockers}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Supplier ID" value={text(result.supplierId) || "Not created"} />
            <Metric label="Lifecycle" value={text(onboarding?.lifecycleStatus) || "—"} />
            <Metric label="Onboarding" value={text(onboarding?.onboardingStatus) || "—"} />
            <Metric label="Feed transport" value={text(onboarding?.feedTransport) || "—"} />
            <Metric label="SLA version" value={String(onboarding?.activeSlaVersion ?? "Missing")} ok={typeof onboarding?.activeSlaVersion === "number"} />
            <Metric label="Compliance" value={String(onboarding?.complianceVersion ?? "Missing")} ok={typeof onboarding?.complianceVersion === "number"} />
            <Metric label="Catalog adapters" value={String(onboarding?.activeCatalogAdapterCount ?? 0)} ok={Number(onboarding?.activeCatalogAdapterCount ?? 0) > 0} />
            <Metric label="Acquisition" value={text(acquisition?.reason) || "Not ready"} ok={text(acquisition?.reason) === "acquisition_ready"} />
            <Metric label="Pilot exists" value={bool(phase8?.pilotExists) ? "YES" : "NO"} ok={bool(phase8?.pilotExists)} />
            <Metric label="Pilot activation" value={bool(phase8?.activationReady) ? "READY" : "BLOCKED"} ok={bool(phase8?.activationReady)} />
            <Metric label="Pilot acceptance" value={bool(phase8?.acceptancePassed) ? "PASS" : "BLOCKED"} ok={bool(phase8?.acceptancePassed)} />
            <Metric label="Supplier health" value={text(health?.status) || "No operational evidence yet"} ok={text(health?.status) === "healthy"} />
          </div>

          {(missingQualification.length > 0 || missingCapabilities.length > 0) && (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <EvidenceList title="Missing qualification evidence" values={missingQualification} />
              <EvidenceList title="Missing capability evidence" values={missingCapabilities} />
            </div>
          )}

          <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Real evidence is mandatory.</strong>
                <p className="mt-1">
                  Synthetic suppliers, invented qualification evidence and simulator-only evidence cannot close P7 or P8.
                  Simulator PASS is not Pilot PASS. Global Supplier Commerce remains separate from a bounded controlled pilot.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function GateCard({ title, passed, subtitle, blockers }: { title: string; passed: boolean; subtitle: string; blockers: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant={passed ? "default" : "outline"}>{passed ? "PASS" : "HOLD"}</Badge>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
      {blockers.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {blockers.slice(0, 16).map((blocker) => (
            <Badge key={blocker} variant="outline">{blocker.replace(/_/g, " ")}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2 break-all text-sm font-semibold">
        {ok === true && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
        {ok === false && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
        {value}
      </div>
    </div>
  );
}

function EvidenceList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.length === 0
          ? <Badge variant="outline">None</Badge>
          : values.map((value) => <Badge key={value} variant="outline">{value.replace(/_/g, " ")}</Badge>)}
      </div>
    </div>
  );
}
