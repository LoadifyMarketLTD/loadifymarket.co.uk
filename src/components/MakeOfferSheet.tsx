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

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { Loader2, Tag } from "lucide-react";
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

export default function MakeOfferSheet({
  open,
  onOpenChange,
  conversationId,
  productTitle = "this item",
  onSent,
}: MakeOfferSheetProps) {
  const { user } = useAuthStore();
  const [pounds, setPounds] = useState("");
  const [sending, setSending] = useState(false);

  /** Reset local state whenever the sheet closes, regardless of how it's dismissed. */
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPounds("");
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
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

    setSending(true);
    try {
      const res = await authorizedFetch("/.netlify/functions/conversation-offer", {
        method: "POST",
        body: JSON.stringify({ conversationId, amountPence }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" })) as { error?: string };
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      toast({ title: `Offer of £${numPounds.toFixed(2)} sent!` });
      trackOfferCreated({ conversationId, amountPence });
      setPounds("");
      handleOpenChange(false);
      onSent?.();
    } catch (err) {
      toast({
        title: "Failed to send offer",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
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
              placeholder="0.00"
              value={pounds}
              onChange={(e) => setPounds(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
              className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-3 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleOpenChange(false)}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-warning text-background font-semibold"
            onClick={() => void handleSubmit()}
            disabled={sending || !pounds}
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : "Send Offer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
