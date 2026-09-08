import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useAuthPromptStore } from "@/store/authPromptStore";
import { toast } from "@/hooks/use-toast";

const REASONS = [
  ["spam", "Spam"],
  ["harassment", "Harassment or bullying"],
  ["hate", "Hate or discrimination"],
  ["sexual", "Sexual or inappropriate content"],
  ["illegal", "Illegal or dangerous activity"],
  ["misleading", "Misleading or fraudulent"],
  ["impersonation", "Impersonation"],
  ["other", "Other"],
] as const;

type ReportContext = "seller_profile" | "review" | "message" | "other";

interface SafetyReportDialogProps {
  targetType: "user" | "review";
  targetId: string;
  context?: ReportContext;
  contextId?: string;
  triggerLabel: string;
  className?: string;
}

export default function SafetyReportDialog({
  targetType,
  targetId,
  context = "other",
  contextId,
  triggerLabel,
  className,
}: SafetyReportDialogProps) {
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openDialog = () => {
    if (!user) {
      promptAuth(null);
      return;
    }
    if (targetType === "user" && user.id === targetId) {
      toast({ title: "You cannot report your own account", variant: "destructive" });
      return;
    }
    setOpen(true);
  };

  const submit = async () => {
    if (!user || !reason || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        reportedBy: user.id,
        reason,
        description: description.trim() || null,
      };
      const { error } = targetType === "user"
        ? await supabase.from("reported_users").insert({
            ...payload,
            reportedUserId: targetId,
            context,
            contextId: contextId ?? null,
          })
        : await supabase.from("reported_reviews").insert({
            ...payload,
            reviewId: targetId,
          });
      if (error) throw error;
      toast({ title: "Report submitted", description: "Thank you. Loadify will review this report." });
      setOpen(false);
      setReason("");
      setDescription("");
    } catch (error) {
      toast({
        title: "Could not submit report",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={openDialog} className={className}>
        <Flag className="mr-1.5 h-3.5 w-3.5" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{targetType === "user" ? "Report user" : "Report review"}</DialogTitle>
            <DialogDescription>
              Reports are sent to Loadify moderation. False or abusive reports may themselves violate our policies.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Reason</label>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Choose a reason</option>
                {REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-foreground">Details (optional)</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Add any details that will help our moderation team."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button type="button" onClick={() => void submit()} disabled={!reason || submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
