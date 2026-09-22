import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function asRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => asRecord(item) !== null) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function bool(value: unknown): boolean {
  return value === true;
}

export default function ControlledPilotReadiness() {
  const [pilotId, setPilotId] = useState("");
  const [status, setStatus] = useState<JsonRecord | null>(null);
  const [readiness, setReadiness] = useState<JsonRecord | null>(null);
  const [acceptance, setAcceptance] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState<"status" | "readiness" | "acceptance" | null>(null);
  const [error, setError] = useState("");

  const callPilot = useCallback(async (action: "status" | "readiness" | "acceptance", explicitPilotId?: string) => {
    setError("");
    setLoading(action);
    try {
      const id = (explicitPilotId ?? pilotId).trim();
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "status"
          ? { action, ...(id ? { pilotId: id } : {}) }
          : { action, pilotId: id }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || `Unable to evaluate controlled pilot ${action}.`);
      const result = asRecord(body.result);
      if (!result) throw new Error("Controlled pilot returned an invalid response.");
      if (action === "status") {
        setStatus(result);
        const resolved = text(result.pilotId);
        if (resolved) setPilotId(resolved);
        const nestedReadiness = asRecord(result.readiness);
        const nestedAcceptance = asRecord(result.acceptance);
        setReadiness(nestedReadiness);
        setAcceptance(nestedAcceptance);
      } else if (action === "readiness") {
        setReadiness(result);
      } else {
        setAcceptance(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to evaluate controlled pilot.");
    } finally {
      setLoading(null);
    }
  }, [pilotId]);

  useEffect(() => {
    void callPilot("status", "");
  }, [callPilot]);

  const exists = status?.exists === true;
  const ready = readiness?.ready === true;
  const passed = acceptance?.passed === true;
  const readinessFailures = asRecordArray(readiness?.failures);
  const acceptanceFailures = asRecordArray(acceptance?.failures);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Controlled Pilot Readiness</h2>
          </div>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            Read-only Phase O control view. It reports pilot status, activation readiness and acceptance evidence.
            This panel cannot create, prepare or activate a pilot.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void callPilot("status")} disabled={loading !== null}>
          {loading === "status" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh pilot
        </Button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <label className="text-sm font-medium">Pilot ID</label>
          <Input
            className="mt-1"
            value={pilotId}
            onChange={(event) => setPilotId(event.target.value)}
            placeholder="Leave empty to inspect the latest pilot"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void callPilot("status")} disabled={loading !== null}>Load status</Button>
          <Button type="button" variant="outline" onClick={() => void callPilot("readiness")} disabled={!pilotId.trim() || loading !== null}>
            {loading === "readiness" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Evaluate readiness
          </Button>
          <Button type="button" variant="outline" onClick={() => void callPilot("acceptance")} disabled={!pilotId.trim() || loading !== null}>
            {loading === "acceptance" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Evaluate acceptance
          </Button>
        </div>
      </div>

      {error && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      {!exists && status && (
        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          No controlled pilot exists. This is expected until a real supplier, real pilot offers, simulator evidence and a real buyer cohort are ready.
        </div>
      )}

      {exists && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Status" value={text(status?.status) || "unknown"} ok={text(status?.status) === "active"} />
            <Metric label="Territory" value={text(status?.territory) || "—"} ok={text(status?.territory) === "GB"} />
            <Metric label="Pilot master control" value={bool(status?.pilotControlEnabled) ? "ENABLED" : "DISABLED"} ok={bool(status?.pilotControlEnabled)} />
            <Metric label="Global supplier commerce" value={bool(status?.globalSupplierCommerceEnabled) ? "ENABLED" : "OFF"} ok={!bool(status?.globalSupplierCommerceEnabled)} />
            <Metric label="Supplier" value={text(status?.supplierId) || "—"} />
            <Metric label="Provider" value={text(status?.providerKey) || "—"} />
            <Metric label="Cohort" value={text(status?.cohort) || "—"} />
            <Metric label="Cohort members" value={String(status?.cohortMemberCount ?? 0)} />
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <DecisionCard
              title="Activation readiness"
              passed={ready}
              reason={text(readiness?.reason) || "not evaluated"}
              failures={readinessFailures}
            />
            <DecisionCard
              title="Pilot acceptance"
              passed={passed}
              reason={text(acceptance?.reason) || "not evaluated"}
              failures={acceptanceFailures}
            />
          </div>

          <div className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Activation is intentionally not available here.</strong>
                <p className="mt-1 leading-6">A real pilot must first satisfy Supplier Foundation, verified adapter, passed simulator, explicit cohort, bounded offer set and live stock/price readiness. Simulator PASS is not Pilot PASS.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
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

function DecisionCard({ title, passed, reason, failures }: { title: string; passed: boolean; reason: string; failures: JsonRecord[] }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant={passed ? "default" : "outline"}>{passed ? "PASS" : "BLOCKED"}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
      {failures.length > 0 && (
        <div className="mt-4 space-y-2">
          {failures.slice(0, 12).map((failure, index) => (
            <div key={index} className="rounded-lg border border-border/70 p-3 text-xs leading-5">
              <strong>{text(failure.check) || "check"}</strong>
              <span className="ml-2 text-muted-foreground">{text(failure.reason) || JSON.stringify(failure)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
