import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { useCartStore } from '../store';
import { BRAND } from '../constants/brand';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart } = useCartStore();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Clear cart after successful payment
    if (!cleared) {
      clearCart();
      setCleared(true);
    }
  }, [clearCart, cleared]);

  return (
    <div className="min-h-screen bg-jet flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="card-glass p-10 text-center">
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
              <div className="p-2 bg-gold/10 rounded-lg flex-shrink-0">
                <Package className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Order Processing</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Your order is being processed and will be dispatched soon.
                </p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-gold/10 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Confirmation Email</p>
                <p className="text-white/50 text-xs mt-0.5">
                  A confirmation email has been sent to your inbox.
                </p>
              </div>
            </div>
          </div>

          {/* Buyer Protection Note */}
          <div className="bg-gold/5 border border-gold/20 rounded-xl p-4 mb-8 text-left">
            <p className="text-gold text-sm font-semibold mb-1">🛡️ {BRAND.name} Buyer Protection</p>
            <p className="text-white/60 text-xs leading-relaxed">
              Your purchase is protected. If anything goes wrong, you can open a dispute from your orders page within {BRAND.returnsDays} days.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/orders"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              View My Orders
            </Link>
            <Link
              to="/shop"
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
