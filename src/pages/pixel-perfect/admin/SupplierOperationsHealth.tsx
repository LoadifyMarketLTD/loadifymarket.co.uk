import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function recordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => asRecord(item) !== null) : [];
}

export default function SupplierOperationsHealth({ supplierId }: { supplierId: string }) {
  const [health, setHealth] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHealth = useCallback(async () => {
    const normalizedSupplierId = supplierId.trim();
    if (!normalizedSupplierId) {
      setHealth(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId: normalizedSupplierId }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || "Unable to read Supplier Health.");
      const snapshot = asRecord(body.supplierHealth);
      if (!snapshot) throw new Error("Supplier Health returned an invalid response.");
      setHealth(snapshot);
    } catch (caught) {
      setHealth(null);
      setError(caught instanceof Error ? caught.message : "Unable to read Supplier Health.");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const status = text(health?.status);
  const action = text(health?.recommendedAction);
  const score = number(health?.healthScore);
  const samples = number(health?.evidenceSamples);
  const components = recordArray(health?.components);
  const reasons = Array.isArray(health?.reasons)
    ? health.reasons.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Supplier Operations Health</h2>
          </div>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            Read-only operational monitoring from Supplier Control Centre evidence: API reliability, price integrity,
            stock/price freshness, fulfilment, tracking and reconciliation. Recommendations never activate commerce or controls automatically.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadHealth()} disabled={!supplierId.trim() || loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh health
        </Button>
      </div>

      {!supplierId.trim() && (
        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Resolve a real Supplier Foundation ID through onboarding before operational health can be evaluated.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {health && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Health status" value={status || "unknown"} good={status === "healthy"} />
            <Metric label="Health score" value={score === null ? "—" : String(score)} />
            <Metric label="Evidence samples" value={samples === null ? "0" : String(samples)} />
            <Metric label="Recommendation" value={(action || "observe_only").replace(/_/g, " ")} good={action === "normal_caps"} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {components.map((component) => {
              const componentScore = number(component.score);
              const failures = number(component.failures) ?? 0;
              const componentSamples = number(component.samples) ?? 0;
              return (
                <div key={text(component.key)} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">{text(component.key).replace(/_/g, " ")}</strong>
                    <Badge variant={failures === 0 && componentSamples > 0 ? "default" : "outline"}>
                      {componentScore === null ? "NO DATA" : `${componentScore}%`}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {componentSamples} samples · {failures} failures
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{text(component.reason)}</p>
                </div>
              );
            })}
          </div>

          {reasons.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <strong>Observed health reasons</strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {reasons.map((reason) => <Badge key={reason} variant="outline">{reason.replace(/_/g, " ")}</Badge>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Supplier Health is recommendation-only. This panel performs no supplier, commerce, payment or external mutation.
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-center gap-2 break-all text-sm font-semibold">
        {good === true && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
        {value}
      </div>
    </div>
  );
}
