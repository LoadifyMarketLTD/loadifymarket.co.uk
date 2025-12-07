import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useAuthStore } from '../store';
import { CreditCard, MapPin, Package, Truck } from 'lucide-react';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  postal_code: string;
  country: string;
}

type ShippingMethod = 'Standard' | 'Express' | 'Pallet';

const SHIPPING_OPTIONS = [
  { name: 'Standard' as ShippingMethod, cost: 5, description: '3-5 business days' },
  { name: 'Express' as ShippingMethod, cost: 12, description: '1-2 business days' },
  { name: 'Pallet' as ShippingMethod, cost: 50, description: 'For large/pallet orders' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('Standard');

  const [shippingAddress, setShippingAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    postal_code: '',
    country: 'GB',
  });

  const [billingAddress, setBillingAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    postal_code: '',
    country: 'GB',
  });

  if (!user) {
    navigate('/login?redirect=/checkout');
    return null;
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const VAT_RATE = 0.20;
  const COMMISSION_RATE = 0.07;
  const selectedShipping = SHIPPING_OPTIONS.find(opt => opt.name === shippingMethod) || SHIPPING_OPTIONS[0];
  const shippingAmount = selectedShipping.cost;

  const subtotal = total / (1 + VAT_RATE);
  const shippingVAT = shippingAmount * VAT_RATE;
  const vatAmount = (total - subtotal) + shippingVAT;
  const commissionAmount = subtotal * COMMISSION_RATE;
  const grandTotal = total + shippingAmount + shippingVAT;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postal_code) {
      alert('Please fill in all shipping address fields');
      return;
    }

    setLoading(true);

    try {
      // Call Netlify function to create Stripe checkout session
      const response = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            title: item.title || 'Product',
            sellerId: item.sellerId || 'unknown',
          })),
          buyerId: user.id,
          shippingAddress,
          billingAddress: sameAsShipping ? shippingAddress : billingAddress,
          shippingAmount,
          shippingMethod,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to proceed to checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit}>
              {/* Shipping Address */}
              <div className="card mb-6">
                <div className="flex items-center mb-4">
                  <MapPin className="h-6 w-6 text-navy-800 mr-2" />
                  <h2 className="text-xl font-bold">Shipping Address</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                    <input
                      type="text"
                      value={shippingAddress.line1}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                      required
                      className="input-field"
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Address Line 2</label>
                    <input
                      type="text"
                      value={shippingAddress.line2}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, line2: e.target.value })}
                      className="input-field"
                      placeholder="Apartment, suite, etc. (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">City *</label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                        required
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Postal Code *</label>
                      <input
                        type="text"
                        value={shippingAddress.postal_code}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postal_code: e.target.value })}
                        required
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Country *</label>
                    <select
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      required
                      className="input-field"
                    >
                      <option value="GB">United Kingdom</option>
                      <option value="IE">Ireland</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Shipping Method */}
              <div className="card mb-6">
                <div className="flex items-center mb-4">
                  <Truck className="h-6 w-6 text-navy-800 mr-2" aria-hidden="true" />
                  <h2 className="text-xl font-bold">Shipping Method</h2>
                </div>

                <div className="space-y-3">
                  {SHIPPING_OPTIONS.map((option) => (
                    <label
                      key={option.name}
                      className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        shippingMethod === option.name
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={option.name}
                          checked={shippingMethod === option.name}
                          onChange={(e) => setShippingMethod(e.target.value as ShippingMethod)}
                          className="mr-3"
                        />
                        <div>
                          <p className="font-semibold">{option.name}</p>
                          <p className="text-sm text-gray-600">{option.description}</p>
                        </div>
                      </div>
                      <p className="font-bold text-navy-800">{formatPrice(option.cost)}</p>
                    </label>
                  ))}
                </div>
              </div>

              {/* Billing Address */}
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <CreditCard className="h-6 w-6 text-navy-800 mr-2" />
                    <h2 className="text-xl font-bold">Billing Address</h2>
                  </div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Same as shipping</span>
                  </label>
                </div>

                {!sameAsShipping && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                      <input
                        type="text"
                        value={billingAddress.line1}
                        onChange={(e) => setBillingAddress({ ...billingAddress, line1: e.target.value })}
                        required={!sameAsShipping}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Address Line 2</label>
                      <input
                        type="text"
                        value={billingAddress.line2}
                        onChange={(e) => setBillingAddress({ ...billingAddress, line2: e.target.value })}
                        className="input-field"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City *</label>
                        <input
                          type="text"
                          value={billingAddress.city}
                          onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                          required={!sameAsShipping}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">Postal Code *</label>
                        <input
                          type="text"
                          value={billingAddress.postal_code}
                          onChange={(e) => setBillingAddress({ ...billingAddress, postal_code: e.target.value })}
                          required={!sameAsShipping}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">Country *</label>
                      <select
                        value={billingAddress.country}
                        onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                        required={!sameAsShipping}
                        className="input-field"
                      >
                        <option value="GB">United Kingdom</option>
                        <option value="IE">Ireland</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  'Processing...'
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceed to Payment
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <div className="flex items-center mb-4">
                <Package className="h-6 w-6 text-navy-800 mr-2" />
                <h2 className="text-xl font-bold">Order Summary</h2>
              </div>

              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span>{item.quantity}x Product</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal (excl. VAT)</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>VAT (20%)</span>
                  <span>{formatPrice(vatAmount)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{formatPrice(shippingAmount)}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span>Marketplace Commission (7%)</span>
                  <span>{formatPrice(commissionAmount)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700">
                <p className="font-medium mb-1">Secure Payment</p>
                <p className="text-xs">
                  Your payment will be processed securely through Stripe. Payment details are never stored on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
