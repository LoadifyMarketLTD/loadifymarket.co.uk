/**
 * MakeOfferSheet
 *
 * A modal bottom-sheet that lets a buyer submit an offer amount for a product.
 * Calls the conversation-offer Netlify function which creates a real offer
 * record in the `offers` table and a display message in chat.
 *
 * Props:
 *   open           – controlled open state
 *   onOpenChange   – called when the sheet should close
 *   conversationId – id of the conversation to post into
 *   receiverId     – the other party's user id (seller, unused server-side but
 *                    kept for backwards-compatible prop interface)
 *   productTitle   – shown in the offer card inside chat
 *   onSent         – optional callback after the offer is created
 */

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { Check, Loader2, Tag } from "lucide-react";
import { trackOfferCreated } from "@/lib/analytics";
import { authorizedFetch } from "@/lib/authorizedFetch";

interface MakeOfferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  receiverId: string;
  productTitle?: string;
  onSent?: () => void;
}

type SubmitState = "idle" | "loading" | "success";

const SUCCESS_STATE_DURATION_MS = 2500;

export default function MakeOfferSheet({
  open,
  onOpenChange,
  conversationId,
  productTitle = "this item",
  onSent,
}: MakeOfferSheetProps) {
  const { user } = useAuthStore();
  const [pounds, setPounds] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const submitLockedRef = useRef(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessTimeout = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
  };

  const resetSubmitState = ({ clearAmount = false }: { clearAmount?: boolean } = {}) => {
    clearSuccessTimeout();
    submitLockedRef.current = false;
    setSubmitState("idle");
    if (clearAmount) {
      setPounds("");
    }
  };

  useEffect(() => () => {
    clearSuccessTimeout();
  }, []);

  /** Reset local state whenever the sheet closes, regardless of how it's dismissed. */
  const handleOpenChange = (next: boolean) => {
    if (!next && submitState !== "idle") {
      return;
    }
    if (!next) {
      resetSubmitState({ clearAmount: true });
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (submitLockedRef.current || submitState !== "idle") {
      return;
    }

    if (!user?.id) {
      toast({ title: "Please sign in to make an offer", variant: "destructive" });
      return;
    }

    const numPounds = parseFloat(pounds.replace(/[^0-9.]/g, ""));
    if (isNaN(numPounds) || numPounds <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (numPounds > 99_999) {
      toast({ title: "Offer cannot exceed £99,999", variant: "destructive" });
      return;
    }
    const amountPence = Math.round(numPounds * 100);

    submitLockedRef.current = true;
    setSubmitState("loading");

    try {
      const res = await authorizedFetch("/.netlify/functions/conversation-offer", {
        method: "POST",
        body: JSON.stringify({ conversationId, amountPence }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" })) as { error?: string };
        const description = err.error ?? `HTTP ${res.status}`;
        resetSubmitState();
        toast({
          title: res.status === 409 ? "Offer already pending" : "Failed to send offer",
          description,
          variant: "destructive",
        });
        return;
      }

      setSubmitState("success");
      toast({ title: "Your offer has been sent successfully." });

      try {
        trackOfferCreated({ conversationId, amountPence });
        onSent?.();
      } catch (callbackError) {
        console.warn("MakeOfferSheet: non-fatal success callback error", callbackError);
      }

      clearSuccessTimeout();
      successTimeoutRef.current = setTimeout(() => {
        resetSubmitState({ clearAmount: true });
        onOpenChange(false);
      }, SUCCESS_STATE_DURATION_MS);
    } catch (err) {
      resetSubmitState();
      toast({
        title: "Failed to send offer",
        description: (err as Error).message,
        variant: "destructive",
      });
    }
  };

  const isLocked = submitState !== "idle";
  const submitButtonLabel = (() => {
    if (submitState === "loading") {
      return (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Sending…
        </span>
      );
    }

    if (submitState === "success") {
      return (
        <span className="inline-flex items-center gap-2">
          <Check className="h-4 w-4" />
          Offer Sent
        </span>
      );
    }

    return "Send Offer";
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-[calc(100vw-1.5rem)] sm:max-w-sm"
        onEscapeKeyDown={(event) => {
          if (isLocked) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          if (isLocked) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Make an Offer
          </DialogTitle>
          <DialogDescription className="sr-only">
            Enter an amount and send an offer to the seller for this listing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Enter the amount you'd like to offer for{" "}
            <span className="font-medium text-foreground">{productTitle}</span>.
            The seller will be notified.
          </p>

          {/* Amount input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-foreground pointer-events-none">
              £
            </span>
            <input
              type="number"
              min="0.01"
              max="99999"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={pounds}
              onChange={(e) => setPounds(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
              disabled={isLocked}
              className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={isLocked}
          >
            Cancel
          </Button>
          <Button
            className={`flex-1 font-semibold ${
              submitState === "success"
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : "bg-primary text-black hover:bg-primary-hover"
            }`}
            onClick={() => void handleSubmit()}
            disabled={isLocked || !pounds}
          >
            {submitButtonLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
