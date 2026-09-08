import { useCallback, useEffect, useMemo, useState } from "react";
import { Flag, Loader2, ShieldOff, UserRound, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

type SafetyReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";
type SafetyReportKind = "user" | "review";

interface SafetyReport {
  id: string;
  kind: SafetyReportKind;
  targetId: string;
  reportedBy: string;
  reason: string;
  description: string | null;
  status: SafetyReportStatus;
  createdAt: string;
  context?: string | null;
}

const statusClass: Record<SafetyReportStatus, string> = {
  pending: "border-warning/40 text-warning bg-warning/10",
  reviewed: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  resolved: "border-emerald-500/30 text-success bg-success/10",
  dismissed: "border-slate-500/30 text-slate-400 bg-slate-500/10",
};

export default function SafetyReportQueue() {
  const [reports, setReports] = useState<SafetyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, reviewsRes] = await Promise.all([
        supabase.from("reported_users").select("id, reportedUserId, reportedBy, reason, description, context, status, createdAt").order("createdAt", { ascending: false }),
        supabase.from("reported_reviews").select("id, reviewId, reportedBy, reason, description, status, createdAt").order("createdAt", { ascending: false }),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (reviewsRes.error) throw reviewsRes.error;

      const userReports: SafetyReport[] = (usersRes.data ?? []).map((row) => ({
        id: row.id,
        kind: "user",
        targetId: row.reportedUserId,
        reportedBy: row.reportedBy,
        reason: row.reason,
        description: row.description,
        status: row.status as SafetyReportStatus,
        createdAt: row.createdAt,
        context: row.context,
      }));
      const reviewReports: SafetyReport[] = (reviewsRes.data ?? []).map((row) => ({
        id: row.id,
        kind: "review",
        targetId: row.reviewId,
        reportedBy: row.reportedBy,
        reason: row.reason,
        description: row.description,
        status: row.status as SafetyReportStatus,
        createdAt: row.createdAt,
      }));
      setReports([...userReports, ...reviewReports].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)));
    } catch (error) {
      toast({ title: "Safety reports unavailable", description: error instanceof Error ? error.message : "Could not load reports.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = useMemo(() => reports.filter((report) => report.status === "pending").length, [reports]);

  const setStatus = async (report: SafetyReport, status: SafetyReportStatus) => {
    setBusy(report.id);
    try {
      const table = report.kind === "user" ? "reported_users" : "reported_reviews";
      const { error } = await supabase.from(table).update({
        status,
        resolvedAt: status === "resolved" ? new Date().toISOString() : null,
      }).eq("id", report.id);
      if (error) throw error;
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status } : item));
    } catch (error) {
      toast({ title: "Moderation update failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const hideReview = async (report: SafetyReport) => {
    if (report.kind !== "review") return;
    setBusy(report.id);
    try {
      const { error: reviewError } = await supabase.from("reviews").update({ status: "hidden" }).eq("id", report.targetId);
      if (reviewError) throw reviewError;
      const { error: reportError } = await supabase.from("reported_reviews").update({ status: "resolved", resolvedAt: new Date().toISOString() }).eq("id", report.id);
      if (reportError) throw reportError;
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status: "resolved" } : item));
      toast({ title: "Review hidden", description: "The review is no longer public and the report is resolved." });
    } catch (error) {
      toast({ title: "Could not hide review", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-white/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">User & review safety reports</h2>
          <p className="text-xs text-muted-foreground/85">{reports.length} reports ? {pending} pending</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-white/5 p-6 text-center text-sm text-muted-foreground/85"><Flag className="mx-auto mb-2 h-6 w-6 opacity-50" />No user or review reports.</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={`${report.kind}-${report.id}`} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {report.kind === "user" ? <UserRound className="h-4 w-4 text-primary" /> : <MessageSquareWarning className="h-4 w-4 text-primary" />}
                    <span className="text-sm font-semibold text-white">{report.kind === "user" ? "User report" : "Review report"}</span>
                    <Badge variant="outline" className={statusClass[report.status]}>{report.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground/85">Target: {report.targetId.slice(0, 8).toUpperCase()} ? Reporter: {report.reportedBy.slice(0, 8).toUpperCase()}</p>
                  {report.context ? <p className="mt-1 text-xs text-muted-foreground/85">Context: {report.context.replace(/_/g, " ")}</p> : null}
                  <p className="mt-2 text-sm font-medium text-white">{report.reason.replace(/_/g, " ")}</p>
                  {report.description ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground/85">{report.description}</p> : null}
                  <p className="mt-2 text-[11px] text-muted-foreground/65">{new Date(report.createdAt).toLocaleString("en-GB")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.status === "pending" ? <Button size="sm" variant="outline" disabled={busy === report.id} onClick={() => void setStatus(report, "reviewed")}>Mark reviewed</Button> : null}
                  {report.kind === "review" && report.status !== "resolved" ? <Button size="sm" variant="outline" disabled={busy === report.id} onClick={() => void hideReview(report)}><ShieldOff className="mr-1.5 h-3.5 w-3.5" />Hide review</Button> : null}
                  {report.status !== "resolved" ? <Button size="sm" disabled={busy === report.id} onClick={() => void setStatus(report, "resolved")}>Resolve</Button> : null}
                  {report.status !== "dismissed" ? <Button size="sm" variant="ghost" disabled={busy === report.id} onClick={() => void setStatus(report, "dismissed")}>Dismiss</Button> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
