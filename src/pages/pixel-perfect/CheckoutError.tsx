import { Link, useSearchParams } from 'react-router-dom';
import MainLayout from "@/layouts/MainLayout";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CheckoutError = () => {
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const errorMessage = (() => {
    switch (reason) {
      case 'payment_failed':
        return 'Your payment could not be processed. Please check your card details and try again.';
      case 'card_declined':
        return 'Your card was declined. Please try a different payment method.';
      case 'session_expired':
        return 'Your checkout session has expired. Please return to your cart and try again.';
      default:
        return 'Something went wrong during checkout. Please try again or contact support if the problem persists.';
    }
  })();

  return (
    <MainLayout>
      <main id="main-content" className="pt-28 pb-20 flex items-center justify-center">
        <div className="w-full max-w-lg px-4">
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
            {/* Error Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Payment Unsuccessful</h1>
            <p className="text-gray-500 text-base mb-6">{errorMessage}</p>

            {/* Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-left mb-8">
              <p className="text-sm text-gray-600">
                <strong className="text-gray-800">What happened?</strong> Your order has not
                been placed and you have not been charged. Your cart items are still saved.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="default">
                <Link to="/cart">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Return to Cart
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continue Browsing
                </Link>
              </Button>
            </div>

            {/* Support link */}
            <p className="mt-6 text-sm text-muted-foreground">
              Need help?{' '}
              <Link to="/contact" className="text-primary underline inline-flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default CheckoutError;
