/**
 * AdminStripeEvents.tsx
 *
 * Admin-only viewer for the stripe_events table.
 *
 * Shows every Stripe webhook event processed by the platform — useful for:
 *   • Auditing webhook delivery
 *   • Diagnosing failed / skipped events
 *   • Confirming idempotency (duplicate Stripe retries)
 *
 * Access: admin only (enforced by RLS on the stripe_events table and the
 *         RequireAdmin guard wrapping /pp/admin/*)
 */

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, Search, AlertCircle, CheckCircle2, SkipForward, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button as CloseButton } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface StripeEvent {
  id: string;
  event_id: string;
  event_type: string;
  livemode: boolean;
  processed_at: string;
  status: "processed" | "failed" | "skipped";
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  processed: {
    label: "Processed",
    icon: CheckCircle2,
    className: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10",
  },
  failed: {
    label: "Failed",
    icon: AlertCircle,
    className: "border-red-500/30 text-red-400 bg-red-500/10",
  },
  skipped: {
    label: "Skipped",
    icon: SkipForward,
    className: "border-slate-200 text-slate-400",
  },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

// ── Component ─────────────────────────────────────────────────────────────────

const AdminStripeEvents = () => {
  const [events, setEvents] = useState<StripeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StripeEvent | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from("stripe_events")
        .select("id, event_id, event_type, livemode, processed_at, status, error_message, metadata")
        .order("processed_at", { ascending: false })
        .limit(300);

      if (qErr) throw qErr;
      setEvents((data ?? []) as StripeEvent[]);
    } catch (err: unknown) {
      const msg = (err as Error).message || "Failed to load Stripe events";
      // Surface a friendly message when the table simply hasn't been created yet
      // (migration 370_user_sync_stripe_events.sql needs to be applied).
      if (msg.includes("stripe_events") && msg.includes("schema cache")) {
        setError(
          "The stripe_events table does not exist in this database. " +
          "Run migration 370_user_sync_stripe_events.sql in the Supabase SQL Editor to create it."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  // ── Filter ─────────────────────────────────────────────────────────────────

  const filtered = events.filter(
    (e) =>
      e.event_type.toLowerCase().includes(search.toLowerCase()) ||
      e.event_id.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (s: string) => filtered.filter((e) => e.status === s);
  const failedCount = byStatus("failed").length;

  // ── Stats ──────────────────────────────────────────────────────────────────

  const liveCount = events.filter((e) => e.livemode).length;
  const testCount = events.filter((e) => !e.livemode).length;

  // ── Render table ───────────────────────────────────────────────────────────

  const renderTable = (rows: StripeEvent[]) => (
    <Table>
      <TableHeader>
        <TableRow style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Event Type</TableHead>
          <TableHead className="hidden md:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Event ID</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Processed</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Status</TableHead>
          <TableHead className="hidden sm:table-cell text-xs font-semibold tracking-wide uppercase" style={{ color: "rgba(71,85,105,0.8)" }}>Mode</TableHead>
          <TableHead className="text-xs font-semibold tracking-wide uppercase text-right" style={{ color: "rgba(71,85,105,0.8)" }}>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="py-12 text-center">
              <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                <Zap className="h-10 w-10 text-amber-300/40" />
                <p className="text-sm font-semibold text-slate-600">
                  {search || events.length > 0
                    ? "No events match your filter"
                    : "No Stripe webhook events recorded yet"}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed text-center">
                  {search
                    ? "Try clearing the search to see all events."
                    : events.length > 0
                    ? "Try selecting a different tab."
                    : "Events appear here once your Stripe webhook endpoint starts receiving traffic. Make sure your webhook URL is configured in the Stripe Dashboard and that the stripe-webhook Netlify function is deployed."}
                </p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          rows.map((evt) => {
            const cfg = statusConfig[evt.status] ?? statusConfig.processed;
            return (
              <TableRow
                key={evt.id}
                className="cursor-pointer hover:bg-white/[0.03] transition-colors"
                style={{ borderBottom: "1px solid #ffffff" }}
                onClick={() => setSelected(evt)}
              >
                <TableCell className="font-mono text-xs text-slate-900/80 max-w-[180px] truncate">
                  {evt.event_type}
                </TableCell>
                <TableCell className="hidden md:table-cell font-mono text-xs" style={{ color: "rgba(71,85,105,0.8)" }}>
                  {evt.event_id.slice(0, 24)}…
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs" style={{ color: "rgba(71,85,105,0.8)" }}>
                  {fmtDate(evt.processed_at)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs gap-1 ${cfg.className}`}>
                    <cfg.icon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge
                    variant="outline"
                    className={`text-xs ${evt.livemode ? "border-orange-500/30 text-orange-400 bg-orange-500/10" : "border-slate-200 text-slate-400"}`}
                  >
                    {evt.livemode ? "Live" : "Test"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    style={{ color: "rgba(71,85,105,0.8)" }}
                    onClick={(e) => { e.stopPropagation(); setSelected(evt); }}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  // ── Page ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-400" />
            Stripe Events
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(71,85,105,0.8)" }}>
            Webhook event log. Shows the last 300 events.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={loading}
          className="border-slate-200 text-slate-500 hover:bg-slate-100 self-start sm:self-auto"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: events.length,          accent: "text-slate-900" },
          { label: "Failed",   value: failedCount,            accent: failedCount > 0 ? "text-red-400" : "text-emerald-400" },
          { label: "Live",     value: liveCount,              accent: "text-orange-400" },
          { label: "Test",     value: testCount,              accent: "text-slate-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)" }}
          >
            <p className="text-xs" style={{ color: "rgba(71,85,105,0.8)" }}>{stat.label}</p>
            <p className={`text-xl font-bold mt-1 ${stat.accent}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by event type or ID…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <TabsTrigger value="all" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">
            All <Badge variant="outline" className="ml-2 text-xs border-white/20 text-slate-500">{filtered.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="processed" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">
            Processed
          </TabsTrigger>
          <TabsTrigger value="failed" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">
            Failed
            {failedCount > 0 && (
              <Badge variant="outline" className="ml-2 text-xs border-red-500/30 text-red-400 bg-red-500/10">
                {failedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="skipped" className="data-[state=active]:text-slate-900 data-[state=active]:bg-white/10 text-slate-500">
            Skipped
          </TabsTrigger>
        </TabsList>

        {(["all", "processed", "failed", "skipped"] as const).map((tab) => (
          <TabsContent key={tab} value={tab}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: "rgba(100,116,139,0.65)" }} />
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)" }}>
                <div className="px-2 py-2 overflow-x-auto">
                  {renderTable(tab === "all" ? filtered : byStatus(tab))}
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        {selected && (() => {
          const cfg = statusConfig[selected.status] ?? statusConfig.processed;
          return (
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">{selected.event_type}</DialogTitle>
                <DialogDescription>{selected.event_id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge variant="outline" className={`text-xs gap-1 ${cfg.className}`}>
                      <cfg.icon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mode</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${selected.livemode ? "border-orange-500/30 text-orange-400 bg-orange-500/10" : "border-slate-200 text-slate-400"}`}
                    >
                      {selected.livemode ? "Live" : "Test"}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">Processed At</p>
                    <p className="font-medium">{fmtDate(selected.processed_at)}</p>
                  </div>
                </div>

                {selected.error_message && (
                  <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <p className="text-xs font-semibold text-red-400 mb-1">Error</p>
                    <p className="text-xs text-red-300 font-mono break-all">{selected.error_message}</p>
                  </div>
                )}

                {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                    <pre className="text-xs rounded-lg p-3 overflow-x-auto" style={{ background: "#ffffff", border: "1px solid rgba(148,163,184,0.35)", color: "rgba(255,255,255,0.7)" }}>
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <DialogFooter>
                <CloseButton variant="outline" onClick={() => setSelected(null)}>Close</CloseButton>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
};

export default AdminStripeEvents;
