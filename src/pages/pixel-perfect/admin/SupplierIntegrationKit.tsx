import { useCallback, useEffect, useState } from "react";
import { Cable, Loader2, RefreshCw, Save, ShieldCheck } from "lucide-react";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type JsonRecord = Record<string, unknown>;

const CAPABILITIES = [
  "supplier_identity","catalog","variants","stock","price","shipping",
  "order_submission","acknowledgement","tracking","cancellation","returns","reimbursement",
] as const;

const TRANSPORTS = [
  "http_rest","graphql","feed_url","sftp","ftps","ftp","webhook","email","manual_portal","manual_file",
] as const;

type Capability = typeof CAPABILITIES[number];
type Transport = typeof TRANSPORTS[number];
type ExecutionMode = "manual_only" | "automated_read" | "automated_write";
type ProfileStatus = "draft" | "verified" | "blocked" | "stale";

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter((item): item is JsonRecord => asRecord(item) !== null) : [];
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default function SupplierIntegrationKit({ supplierId }: { supplierId: string }) {
  const [profiles, setProfiles] = useState<JsonRecord[]>([]);
  const [capability, setCapability] = useState<Capability>("catalog");
  const [transport, setTransport] = useState<Transport>("feed_url");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("automated_read");
  const [configRef, setConfigRef] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [mappingJson, setMappingJson] = useState("{}");
  const [status, setStatus] = useState<ProfileStatus>("draft");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<"load" | "save" | null>(null);
  const [error, setError] = useState("");

  const applyProfileToForm = useCallback((profile: JsonRecord | null) => {
    if (!profile) {
      setConfigRef("");
      setContractRef("");
      setMappingJson("{}");
      setStatus("draft");
      setNotes("");
      return;
    }
    const nextTransport = text(profile.transport);
    const nextExecution = text(profile.execution_mode);
    const nextStatus = text(profile.status);
    if (TRANSPORTS.includes(nextTransport as Transport)) setTransport(nextTransport as Transport);
    if (["manual_only","automated_read","automated_write"].includes(nextExecution)) setExecutionMode(nextExecution as ExecutionMode);
    if (["draft","verified","blocked","stale"].includes(nextStatus)) setStatus(nextStatus as ProfileStatus);
    setConfigRef(text(profile.config_ref));
    setContractRef(text(profile.contract_ref));
    setMappingJson(JSON.stringify(asRecord(profile.mapping) ?? {}, null, 2));
    setNotes(text(profile.notes));
  }, []);

  const loadProfiles = useCallback(async (preferredCapability: Capability = "catalog") => {
    const normalizedSupplierId = supplierId.trim();
    if (!normalizedSupplierId) return;

    setLoading("load");
    setError("");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-integration-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", supplierId: normalizedSupplierId }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || "Unable to load supplier integration profiles.");
      const result = asRecord(body.result);
      const nextProfiles = records(result?.profiles);
      setProfiles(nextProfiles);
      setCapability(preferredCapability);
      const nextSelected = nextProfiles.find((profile) =>
        text(profile.capability) === preferredCapability && text(profile.territory) === "GB"
      ) ?? null;
      applyProfileToForm(nextSelected);
    } catch (caught) {
      setProfiles([]);
      setError(caught instanceof Error ? caught.message : "Unable to load supplier integration profiles.");
    } finally {
      setLoading(null);
    }
  }, [applyProfileToForm, supplierId]);

  useEffect(() => {
    if (!supplierId.trim()) return;
    void loadProfiles("catalog");
  }, [loadProfiles, supplierId]);

  function alignExecutionMode(nextTransport: Transport) {
    setTransport(nextTransport);
    if (nextTransport === "ftp" || nextTransport === "manual_portal" || nextTransport === "manual_file") {
      setExecutionMode("manual_only");
      setConfigRef("");
      return;
    }
    if (nextTransport === "webhook") {
      setExecutionMode("automated_read");
      return;
    }
    if (["order_submission","cancellation","returns"].includes(capability)) {
      setExecutionMode("automated_write");
    } else {
      setExecutionMode("automated_read");
    }
  }

  async function saveProfile() {
    if (!supplierId.trim()) {
      setError("Resolve a real Supplier Foundation ID first.");
      return;
    }

    let mapping: JsonRecord;
    try {
      const parsed = JSON.parse(mappingJson || "{}") as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Mapping must be a JSON object.");
      }
      mapping = parsed as JsonRecord;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mapping JSON is invalid.");
      return;
    }

    if (executionMode !== "manual_only" && !/^env:[A-Z][A-Z0-9_]{2,127}$/.test(configRef.trim())) {
      setError("Automated profiles require configRef in env:VARIABLE_NAME format.");
      return;
    }
    if (status === "verified" && !contractRef.trim()) {
      setError("Verified integration profile requires a contract/documentation reference.");
      return;
    }

    setLoading("save");
    setError("");
    try {
      const response = await authorizedFetch("/.netlify/functions/admin-supplier-integration-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          supplierId: supplierId.trim(),
          territory: "GB",
          capability,
          transport,
          executionMode,
          configRef: executionMode === "manual_only" ? undefined : configRef.trim(),
          mapping,
          contractRef: contractRef.trim() || undefined,
          status,
          notes: notes.trim() || undefined,
        }),
      });
      const body = await response.json() as JsonRecord;
      if (!response.ok) throw new Error(text(body.error) || "Unable to save supplier integration profile.");
      await loadProfiles(capability);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save supplier integration profile.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Cable className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Universal Supplier Integration Kit</h2>
          </div>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
            Bind each supplier capability to its real transport without changing Loadify core logic.
            REST, GraphQL, feeds, SFTP/FTPS, webhook, email and manual channels are modelled separately.
            Plain FTP is recognised but remains manual-only by policy.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadProfiles(capability)} disabled={!supplierId.trim() || loading !== null}>
          {loading === "load" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh bindings
        </Button>
      </div>

      {!supplierId.trim() && (
        <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Save or resolve the real Supplier Foundation candidate before integration transports can be configured.
        </div>
      )}

      {supplierId.trim() && (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">
              Capability
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={capability}
                onChange={(event) => {
                  const next = event.target.value as Capability;
                  setCapability(next);
                  const nextSelected = profiles.find((profile) =>
                    text(profile.capability) === next && text(profile.territory) === "GB"
                  ) ?? null;
                  applyProfileToForm(nextSelected);
                  if (!nextSelected) {
                    if (["order_submission","cancellation","returns"].includes(next)) {
                      if (!["manual_portal","manual_file","ftp"].includes(transport)) setExecutionMode("automated_write");
                    } else if (executionMode === "automated_write") {
                      setExecutionMode("automated_read");
                    }
                  }
                }}
              >
                {CAPABILITIES.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium">
              Transport
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={transport}
                onChange={(event) => alignExecutionMode(event.target.value as Transport)}
              >
                {TRANSPORTS.map((item) => <option key={item} value={item}>{item.replace(/_/g, " ")}</option>)}
              </select>
            </label>

            <label className="text-sm font-medium">
              Execution mode
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={executionMode}
                onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)}
                disabled={transport === "ftp" || transport === "manual_portal" || transport === "manual_file"}
              >
                <option value="manual_only">Manual only</option>
                <option value="automated_read">Automated read</option>
                <option value="automated_write">Automated write</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Profile status
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as ProfileStatus)}
              >
                <option value="draft">Draft</option>
                <option value="verified">Verified</option>
                <option value="blocked">Blocked</option>
                <option value="stale">Stale</option>
              </select>
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Server config reference
              <Input
                className="mt-1"
                value={configRef}
                onChange={(event) => setConfigRef(event.target.value)}
                placeholder="env:SUPPLIER_ABC_ORDER_CONFIG"
                disabled={executionMode === "manual_only"}
              />
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Contract / documentation reference
              <Input
                className="mt-1"
                value={contractRef}
                onChange={(event) => setContractRef(event.target.value)}
                placeholder="supplier-docs/order-api-v1"
              />
            </label>

            <label className="text-sm font-medium md:col-span-2 xl:col-span-4">
              Non-secret mapping JSON
              <textarea
                className="mt-1 min-h-40 w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-xs"
                value={mappingJson}
                onChange={(event) => setMappingJson(event.target.value)}
                spellCheck={false}
              />
            </label>

            <label className="text-sm font-medium md:col-span-2 xl:col-span-4">
              Operator notes
              <textarea
                className="mt-1 min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Verified limitations, manual fallback, provider-specific notes."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void saveProfile()} disabled={loading !== null}>
              {loading === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save integration binding
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4" />
              No credentials are stored here. Automated transports reference server-side environment configuration only.
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profiles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                No capability bindings are configured for this supplier yet.
              </div>
            ) : profiles.map((profile) => (
              <button
                key={text(profile.id)}
                type="button"
                className="rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary/40"
                onClick={() => setCapability(text(profile.capability) as Capability)}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-sm">{text(profile.capability).replace(/_/g, " ")}</strong>
                  <Badge variant={text(profile.status) === "verified" ? "default" : "outline"}>{text(profile.status) || "draft"}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {text(profile.transport).replace(/_/g, " ")} · {text(profile.execution_mode).replace(/_/g, " ")}
                </p>
                <p className="mt-2 break-all text-[11px] text-muted-foreground">{text(profile.config_ref) || "no server config required"}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
