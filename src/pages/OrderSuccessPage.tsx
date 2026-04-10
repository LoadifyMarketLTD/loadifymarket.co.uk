import { useEffect, useState } from 'react';
import MainLayout from "@/layouts/MainLayout";
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight, Package, Shield, Truck, Star } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { BRAND } from '../constants/brand';
import { supabase } from '../lib/supabase';
import { toast } from '../hooks/use-toast';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    clearCart();

    if (!sessionId) {
      setVerified(false);
      return;
    }

    // Verify that the order was actually created in the database
    const verifyOrder = async () => {
      const { data } = await supabase
        .from('payment_sessions')
        .select('id, status')
        .eq('stripeSessionId', sessionId)
        .eq('status', 'completed')
        .maybeSingle();

      if (!data) {
        // No completed order found — notify the user and redirect
        toast({ title: "Order not found", description: "We could not verify your order. Please check your orders page or contact support.", variant: "destructive" });
        navigate('/catalog', { replace: true });
        return;
      }
      setVerified(true);
    };

    verifyOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show nothing while we verify — navigation will happen if order not found
  if (verified === null) {
    return (
      <MainLayout>
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="flex-1 pt-28 pb-20 px-4 flex items-start justify-center">
        <div className="w-full max-w-lg mt-10">
          <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-10 text-center">
            {/* Success Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-white mb-3">Order Confirmed!</h1>
            <p className="text-white/60 text-base mb-2">
              Thank you for your purchase. Your order has been successfully placed.
            </p>
            {sessionId && (
              <p className="text-white/40 text-xs mb-6 font-mono">
                Ref: {sessionId.slice(0, 8)}…{sessionId.slice(-4)}
              </p>
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                  <Package className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Order Processing</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Your order is being processed and will be dispatched soon.
                  </p>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Confirmation Email</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    A confirmation email has been sent to your inbox.
                  </p>
                </div>
              </div>
            </div>

            {/* Marketplace Trust Badges */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-left">
              <p className="text-white text-sm font-semibold mb-3">Marketplace Checkout Complete</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/60 text-xs">Secure Marketplace Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/60 text-xs">Seller Fulfilled Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span className="text-white/60 text-xs">Independent Marketplace Sellers</span>
                </div>
              </div>
              <p className="text-white/40 text-xs mt-3 leading-relaxed">
                Your item will be packaged and shipped directly by the seller.
                If there is an issue with your order, you can raise a dispute from your orders page within {BRAND.returnsDays} days of delivery.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/pp/buyer/orders"
                className="flex-1 flex items-center justify-center gap-2 font-bold rounded-full py-3 px-6 text-white"
                style={{ background: "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)" }}
              >
                <ShoppingBag className="w-5 h-5" />
                View My Orders
              </Link>
              <Link
                to="/catalog"
                className="flex-1 flex items-center justify-center gap-2 font-semibold rounded-full py-3 px-6 text-white/85 border border-white/25"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                Continue Shopping
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
