import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ShoppingBag, ArrowRight, Package, Shield, Truck, Star } from 'lucide-react';
import { useCartStore } from '../store';
import { useCart } from '../contexts/CartContext';
import { BRAND } from '../constants/brand';

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { clearCart: clearZustandCart } = useCartStore();
  const { clearCart: clearContextCart } = useCart();

  useEffect(() => {
    // Clear both cart stores after successful payment.
    // The pixel-perfect public checkout uses CartContext (key: loadify_cart).
    // Protected/legacy pages use the Zustand store (key: loadify-cart).
    // Clearing both ensures the cart is always empty after a successful payment
    // regardless of which store the user's session was using.
    clearZustandCart();
    clearContextCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-xl p-6 p-10 text-center">
          {/* Success Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Order Confirmed!</h1>
          <p className="text-gray-500 text-base mb-2">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
          {sessionId && (
            <p className="text-gray-400 text-xs mb-6 font-mono">
              Ref: {sessionId.slice(0, 8)}…{sessionId.slice(-4)}
            </p>
          )}

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-gold/10 rounded-lg flex-shrink-0">
                <Package className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Order Processing</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Your order is being processed and will be dispatched soon.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
              <div className="p-2 bg-gold/10 rounded-lg flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Confirmation Email</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  A confirmation email has been sent to your inbox.
                </p>
              </div>
            </div>
          </div>

          {/* Marketplace Trust Badges */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-8 text-left">
            <p className="text-white text-sm font-semibold mb-3">Marketplace Checkout Complete</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-gray-600 text-xs">Secure Marketplace Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-gray-600 text-xs">Seller Fulfilled Shipping</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gold flex-shrink-0" />
                <span className="text-gray-600 text-xs">Independent Marketplace Sellers</span>
              </div>
            </div>
            <p className="text-gray-400 text-xs mt-3 leading-relaxed">
              Your item will be packaged and shipped directly by the seller.
              If there is an issue with your order, you can raise a dispute from your orders page within {BRAND.returnsDays} days of delivery.
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
