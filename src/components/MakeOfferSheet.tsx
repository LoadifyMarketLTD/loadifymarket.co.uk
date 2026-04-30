/**
 * MakeOfferSheet
 *
 * A modal bottom-sheet that lets a buyer submit an offer amount for a product.
 * The offer is stored as a JSON-encoded message in the conversations/messages
 * tables so it can be rendered as a special offer bubble in the chat thread:
 *   {"_t":"offer","amount_pence":5000,"productTitle":"…"}
 *
 * Props:
 *   open           – controlled open state
 *   onOpenChange   – called when the sheet should close
 *   conversationId – id of the conversation to post into
 *   receiverId     – the other party's user id (seller)
 *   productTitle   – shown in the offer card inside chat
 *   onSent         – optional callback after the message is inserted
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { Tag } from "lucide-react";

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
  receiverId,
  productTitle = "this item",
  onSent,
}: MakeOfferSheetProps) {
  const { user } = useAuthStore();
  const [pounds, setPounds] = useState("");
  const [sending, setSending] = useState(false);

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
    const amount_pence = Math.round(numPounds * 100);

    setSending(true);
    try {
      const offerPayload = JSON.stringify({
        _t: "offer",
        amount_pence,
        productTitle,
      });

      const { error } = await supabase.from("messages").insert({
        conversationId,
        senderId: user.id,
        receiverId,
        message: offerPayload,
      });

      if (error) throw error;

      toast({ title: `Offer of £${numPounds.toFixed(2)} sent!` });
      setPounds("");
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#FBBF24]" />
            Make an Offer
          </DialogTitle>
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
            onClick={() => { setPounds(""); onOpenChange(false); }}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-[#FBBF24] hover:bg-[#F59E0B] text-[#020617] font-semibold"
            onClick={() => void handleSubmit()}
            disabled={sending || !pounds}
          >
            {sending ? "Sending…" : "Send Offer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
