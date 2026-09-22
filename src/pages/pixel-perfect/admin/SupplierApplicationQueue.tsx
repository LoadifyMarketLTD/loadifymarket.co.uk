import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function asArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => asRecord(item) !== null) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): string {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").join(", ") : "";
}

export default function SupplierApplicationQueue() {
  const [applications, setApplications] = useState<JsonRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", payload: { limit: 100 } }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || "Unable to load supplier applications.");
      const result = asRecord(body.result);
      setApplications(asArray(result?.applications));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load supplier applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(applicationId: string, status: "reviewing" | "contacted" | "qualified" | "rejected") {
    setUpdatingId(applicationId);
    setError("");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          payload: {
            applicationId,
            status,
            reviewNotes: notes[applicationId]?.trim() || undefined,
          },
        }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || "Unable to update supplier application.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update supplier application.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-semibold">Supplier application queue</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            Public supplier applications are candidate-only. Reviewing or qualifying an application does not create a Supplier Foundation identity, promote capabilities or activate commerce.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh applications
        </Button>
      </div>

      {error && <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}

      <div className="mt-5 space-y-4">
        {!loading && applications.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No supplier applications have been submitted yet.
          </div>
        )}

        {applications.map((application) => {
          const id = text(application.id);
          const status = text(application.status) || "submitted";
          return (
            <article key={id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{text(application.legal_name) || "Unnamed supplier"}</h3>
                    <Badge variant="outline">{status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {text(application.contact_name)} · {text(application.contact_email)}
                    {text(application.contact_phone) ? ` · ${text(application.contact_phone)}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Application {id} · {text(application.created_at)}
                  </p>
                </div>
                {text(application.website) && (
                  <a href={text(application.website)} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                    Open website
                  </a>
                )}
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <Fact label="Registration" value={[text(application.registration_country), text(application.registration_number)].filter(Boolean).join(" · ")} />
                <Fact label="Categories" value={list(application.product_categories)} />
                <Fact label="Warehouses" value={list(application.warehouse_countries)} />
                <Fact label="Territories" value={list(application.fulfilment_territories)} />
                <Fact label="Catalogue methods" value={list(application.catalog_methods).replace(/_/g, " ")} />
                <Fact label="Catalogue size" value={String(application.catalog_size ?? "")} />
                <Fact label="Dispatch SLA" value={application.dispatch_sla_hours == null ? "" : `${String(application.dispatch_sla_hours)}h`} />
                <Fact label="Minimum order" value={application.minimum_order_value == null ? "" : `£${String(application.minimum_order_value)}`} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  ["Direct dispatch", application.direct_dispatch],
                  ["Blind shipping", application.blind_shipping],
                  ["Tracking", application.tracking_available],
                  ["Returns", application.returns_supported],
                ].map(([label, value]) => <Badge key={String(label)} variant={value === true ? "default" : "outline"}>{String(label)}: {value === true ? "YES" : "NO"}</Badge>)}
              </div>

              {text(application.notes) && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm leading-6">{text(application.notes)}</p>}

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-sm font-medium">Admin review note</label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={notes[id] ?? text(application.review_notes)}
                    onChange={(event) => setNotes((current) => ({ ...current, [id]: event.target.value }))}
                    placeholder="Evidence to request, commercial follow-up, reason for qualification or rejection…"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["reviewing", "contacted", "qualified", "rejected"] as const).map((next) => (
                    <Button key={next} type="button" variant={next === "rejected" ? "destructive" : "outline"} size="sm" disabled={updatingId === id} onClick={() => void updateStatus(id, next)}>
                      {updatingId === id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                      {next.replace(/_/g, " ")}
                    </Button>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/70 p-3"><div className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-medium">{value || "Not provided"}</div></div>;
}
