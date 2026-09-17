import { useEffect, useState } from 'react';
import { RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileWorkspaceFrame from '@/components/mobile/MobileWorkspaceFrame';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ReturnRow {
  id: string;
  orderId: string;
  status: string;
  reason: string | null;
  refundAmount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

const statusClass = (status: string) => {
  if (['refunded', 'completed', 'received'].includes(status)) return 'bg-emerald-50 text-emerald-700';
  if (['rejected', 'cancelled'].includes(status)) return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
};

export default function MobileReturnsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    void supabase
      .from('returns')
      .select('id, orderId, status, reason, refundAmount, createdAt, updatedAt')
      .eq('buyerId', userId)
      .order('createdAt', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast({ title: 'Could not load returns', description: 'Please try again.', variant: 'destructive' });
          setItems([]);
        } else {
          setItems((data ?? []) as ReturnRow[]);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [toast, userId]);

  return (
    <MobileWorkspaceFrame eyebrow="Buyer protection" title="Returns & refunds">
      <section className="space-y-3 p-4">
        <p className="m-0 text-sm leading-6 text-[#5C687A]">
          Open an order to request a return, add evidence, track its decision and follow any refund.
        </p>
        <button
          type="button"
          onClick={() => navigate('/orders?mode=buy')}
          className="flex min-h-12 w-full items-center justify-between rounded-[16px] bg-[#0A234F] px-4 text-left text-sm font-bold text-white"
        >
          Find an order to return
          <ChevronRight className="h-4 w-4" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-[18px] bg-white p-8 text-sm text-[#667085]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading returns
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-6 text-center shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
            <RotateCcw className="mx-auto h-8 w-8 text-[#A0A8B4]" />
            <h2 className="mt-3 text-base font-black text-[#0A234F]">No returns yet</h2>
            <p className="mt-1 text-sm text-[#667085]">Eligible orders can be opened from Purchases.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/orders?mode=buy&orderId=${encodeURIComponent(item.orderId)}`)}
                className="flex w-full items-center gap-3 rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-4 text-left shadow-[0_7px_20px_rgba(10,35,79,0.05)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#F4F6F8] text-[#0A234F]">
                  <RotateCcw className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-[#0A234F]">Order {item.orderId.slice(0, 8)}</span>
                  <span className="mt-1 block truncate text-xs text-[#667085]">{item.reason || 'Return request'}</span>
                  <span className="mt-1 block text-[11px] text-[#8A94A3]">{new Date(item.createdAt).toLocaleDateString('en-GB')}</span>
                </span>
                <span className={`rounded-full px-2 py-1 text-[10px] font-black capitalize ${statusClass(item.status)}`}>
                  {item.status.replaceAll('_', ' ')}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#A0A8B4]" />
              </button>
            ))}
          </div>
        )}
      </section>
    </MobileWorkspaceFrame>
  );
}
