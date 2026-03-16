import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore, useAuthStore } from '../store';
import { supabase } from '../lib/supabase';
import { formatPrice } from '../lib/formatPrice';
import type { ShippingMethod } from '../types/shipping';
import { CreditCard, Info, MapPin, Package, Shield, Star, Truck } from 'lucide-react';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

// Hardcoded fallback used when no shipping methods are configured in the DB
const FALLBACK_SHIPPING = [
  { id: 'royal-mail-standard', name: 'Royal Mail Standard', price: 3.99, description: '2–3 business days', courier: 'Royal Mail' },
  { id: 'royal-mail-24', name: 'Royal Mail Tracked 24', price: 4.99, description: 'Next business day', courier: 'Royal Mail' },
];

type ShippingOption = {
  id: string;
  name: string;
  price: number;
  description?: string;
  courier?: string | null;
  tracking?: boolean;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [selectedShippingId, setSelectedShippingId] = useState('');
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(true);
  const [guestEmail, setGuestEmail] = useState('');
  const [createAccount, setCreateAccount] = useState(false);

  const [shippingAddress, setShippingAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    country: 'GB',
  });

  const [billingAddress, setBillingAddress] = useState<Address>({
    line1: '',
    line2: '',
    city: '',
    postcode: '',
    country: 'GB',
  });

  // Fetch shipping methods from DB for the products in the cart.
  // Use a stable string key derived from product IDs so the effect only
  // re-runs when the set of products in the cart actually changes.
  const productIdsKey = [...new Set(items.map((i) => i.productId))].sort().join(',');

  const hasMultipleSellers = useMemo(
    () => new Set(items.map((i) => i.sellerId).filter(Boolean)).size > 1,
    [items],
  );

  useEffect(() => {
    const productIds = productIdsKey ? productIdsKey.split(',') : [];
    if (productIds.length === 0) {
      setShippingOptions(FALLBACK_SHIPPING);
      setSelectedShippingId(FALLBACK_SHIPPING[0].id);
      setShippingLoading(false);
      return;
    }

    setShippingLoading(true);

    const fetchShipping = async () => {
      try {
        const { data } = await supabase
          .from('product_shipping')
          .select('method_id, shipping_methods(*, shipping_rates(*))')
          .in('product_id', productIds);

        // Deduplicate by method_id and build ShippingOption list
        const seen = new Set<string>();
        const opts: ShippingOption[] = [];

        for (const row of data || []) {
          const method = (row as unknown as { method_id: string; shipping_methods: ShippingMethod | null })
            .shipping_methods;
          if (!method || seen.has(method.id) || !method.active) continue;
          seen.add(method.id);
          const rate = method.shipping_rates?.[0];
          opts.push({
            id: method.id,
            name: method.name,
            price: rate ? Number(rate.price) : 0,
            courier: method.courier,
            tracking: method.tracking,
          });
        }

        if (opts.length > 0) {
          setShippingOptions(opts);
          setSelectedShippingId((prev) => {
            // Keep previous selection if still available, otherwise default to first
            return opts.some((o) => o.id === prev) ? prev : opts[0].id;
          });
        } else {
          // No DB methods configured — use hardcoded fallback
          setShippingOptions(FALLBACK_SHIPPING);
          setSelectedShippingId(FALLBACK_SHIPPING[0].id);
        }
      } catch {
        setShippingOptions(FALLBACK_SHIPPING);
        setSelectedShippingId(FALLBACK_SHIPPING[0].id);
      } finally {
        setShippingLoading(false);
      }
    };

    fetchShipping();
  }, [productIdsKey]); // re-run when the set of cart products changes

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const VAT_RATE = 0.20;
  const selectedShipping = shippingOptions.find((o) => o.id === selectedShippingId) ?? shippingOptions[0];
  const shippingAmount = selectedShipping?.price ?? 0;

  const subtotal = total / (1 + VAT_RATE);
  const shippingVAT = shippingAmount * VAT_RATE;
  const vatAmount = (total - subtotal) + shippingVAT;
  const grandTotal = total + shippingAmount + shippingVAT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate guest email if not logged in
    if (!user && !guestEmail) {
      alert('Please provide an email address');
      return;
    }

    if (!user && guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      alert('Please provide a valid email address');
      return;
    }
    
    if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postcode) {
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
          buyerId: user?.id || null,
          guestEmail: !user ? guestEmail : null,
          createAccount: !user ? createAccount : false,
          shippingAddress,
          billingAddress: sameAsShipping ? shippingAddress : billingAddress,
          shippingAmount,
          shippingMethod: selectedShipping?.name ?? '',
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
              {/* Guest Email Section */}
              {!user && (
                <div className="card mb-6 bg-blue-50 border-blue-200">
                  <h2 className="text-xl font-bold mb-4">Contact Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                        className="input-field"
                        placeholder="your@email.com"
                      />
                      <p className="text-xs text-gray-600 mt-1">
                        We'll send your order confirmation and tracking information to this email.
                      </p>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="createAccount"
                        checked={createAccount}
                        onChange={(e) => setCreateAccount(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="createAccount" className="text-sm">
                        Create an account for faster checkout next time
                      </label>
                    </div>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                      Already have an account?{' '}
                      <a href="/login?redirect=/checkout" className="text-navy-800 font-medium hover:underline">
                        Sign in
                      </a>
                    </div>
                  </div>
                </div>
              )}

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
                        value={shippingAddress.postcode}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, postcode: e.target.value })}
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

                {shippingLoading ? (
                  <p className="text-gray-500 text-sm">Loading shipping options…</p>
                ) : (
                  <div className="space-y-3">
                    {shippingOptions.map((option) => {
                      return (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            selectedShippingId === option.id
                              ? 'border-orange-500 bg-orange-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="shippingMethod"
                              value={option.id}
                              checked={selectedShippingId === option.id}
                              onChange={() => setSelectedShippingId(option.id)}
                              className="flex-shrink-0"
                            />
                            <Truck className="h-5 w-5 text-gray-500 flex-shrink-0" aria-hidden="true" />
                            <div>
                              <p className="font-semibold">{option.name}</p>
                              {option.description && (
                                <p className="text-sm text-gray-600">{option.description}</p>
                              )}
                              {option.courier && !option.description && (
                                <p className="text-sm text-gray-500">{option.courier}</p>
                              )}
                            </div>
                          </div>
                          <p className="font-bold text-navy-800">
                            {option.price === 0 ? 'Free' : formatPrice(option.price)}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Multi-Seller Shipping Notice */}
              {hasMultipleSellers && (
                <div className="flex gap-3 p-4 mb-6 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold mb-1">Marketplace Shipping Notice</p>
                    <p className="text-blue-700 leading-relaxed">
                      Items in your order may be shipped separately by different sellers.
                      Each seller is responsible for packaging and dispatching their products.
                      Delivery times may vary depending on the seller.
                    </p>
                  </div>
                </div>
              )}

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
                          value={billingAddress.postcode}
                          onChange={(e) => setBillingAddress({ ...billingAddress, postcode: e.target.value })}
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

              {/* Marketplace Notice */}
              <div className="mb-6 p-4 border border-blue-200 bg-blue-50 rounded-lg text-sm text-gray-700">
                <p className="font-semibold mb-2">Marketplace Notice</p>
                <p className="mb-2">
                  You are purchasing this product from an independent seller using the Loadify Market
                  platform.
                </p>
                <p className="mb-2">
                  Loadify Market facilitates the transaction but is not the seller of the product and
                  does not handle product fulfilment or shipping.
                </p>
                <p>All products are shipped directly by the seller who listed the product.</p>
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

              {/* Items grouped by seller */}
              {(() => {
                // Group items by sellerId for display
                const groups: { sellerId: string; storeName: string; items: typeof items }[] = [];
                for (const item of items) {
                  const sid = item.sellerId || item.productId;
                  const existing = groups.find((g) => g.sellerId === sid);
                  if (existing) {
                    existing.items.push(item);
                  } else {
                    groups.push({
                      sellerId: sid,
                      storeName: item.storeName || 'Marketplace Seller',
                      items: [item],
                    });
                  }
                }

                return (
                  <div className="space-y-4 mb-4">
                    {groups.map((group) => {
                      const groupTotal = group.items.reduce((s, i) => s + i.price * i.quantity, 0);
                      return (
                        <div key={group.sellerId} className="border border-gray-100 rounded-lg p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                            Seller: {group.storeName}
                          </p>
                          <div className="space-y-2">
                            {group.items.map((item) => (
                              <div key={item.productId} className="flex justify-between text-sm">
                                <span className="truncate max-w-[60%]">{item.quantity}× {item.title}</span>
                                <span className="flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
                            <span>Seller subtotal</span>
                            <span>{formatPrice(groupTotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

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
                  <span>
                    Shipping ({selectedShipping?.name ?? '—'})
                    {selectedShipping?.description && (
                      <span className="block text-xs text-gray-500">{selectedShipping.description}</span>
                    )}
                  </span>
                  <span>{shippingAmount === 0 ? 'Free' : formatPrice(shippingAmount)}</span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span>{formatPrice(grandTotal)}</span>
                </div>
              </div>

              {/* Shipping clarity note */}
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                <Truck className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                Shipped directly by the seller.
              </p>

              {/* Marketplace Trust Badges */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-gray-700 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium">Secure Marketplace Checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium">Seller Fulfilled Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <span className="font-medium">Verified Marketplace Sellers</span>
                </div>
                <p className="text-xs text-gray-500 pt-1">
                  Payment is processed securely through Stripe. Payment details are never stored on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
