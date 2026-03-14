import { useCartStore } from '../store';
import { Link } from 'react-router-dom';
import { Bookmark, ShoppingBag, Trash2, Package } from 'lucide-react';

const VAT_RATE = 0.20;

export default function CartPage() {
  const { items, savedForLater, removeItem, updateQuantity, saveForLater, moveToCart, removeSaved, getTotalPrice } = useCartStore();

  // Product prices are stored VAT-inclusive. Break them out for display.
  const totalIncVat = getTotalPrice();
  const subtotalExVat = totalIncVat / (1 + VAT_RATE);
  const vatAmount = totalIncVat - subtotalExVat;

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(p);

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
        <div className="card text-center py-12">
          <p className="text-gray-600 mb-4">Your cart is empty</p>
          <Link to="/catalog" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Shopping Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Active Cart Items */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="card">
                <div className="flex items-start gap-4">
                  {/* Product Image */}
                  <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.productId}`} className="font-semibold hover:underline line-clamp-2 mb-1 block">
                      {item.title}
                    </Link>
                    <p className="text-gray-600 text-lg font-bold">{formatPrice(item.price)}</p>
                    <p className="text-xs text-gray-400">per unit, incl. VAT</p>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val) && val >= 1) updateQuantity(item.productId, val);
                          }}
                        className="input-field w-20"
                      />
                    </div>
                    <p className="text-sm font-semibold text-right">{formatPrice(item.price * item.quantity)}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveForLater(item.productId)}
                        className="text-sm text-navy-800 hover:underline flex items-center gap-1"
                        title="Save for later"
                      >
                        <Bookmark className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="text-sm text-red-600 hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Saved for Later Section */}
          {savedForLater.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Bookmark className="w-6 h-6" />
                Saved for Later ({savedForLater.length})
              </h2>
              <div className="space-y-4">
                {savedForLater.map((item) => (
                  <div key={item.productId} className="card bg-gray-50">
                    <div className="flex items-start gap-4">
                      {/* Product Image */}
                      <Link to={`/product/${item.productId}`} className="flex-shrink-0">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/product/${item.productId}`} className="font-semibold hover:underline line-clamp-2 mb-1 block">
                          {item.title}
                        </Link>
                        <p className="text-gray-600 text-lg font-bold">{formatPrice(item.price)}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => moveToCart(item.productId)}
                          className="text-sm text-navy-800 hover:underline flex items-center gap-1"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          Move to Cart
                        </button>
                        <button
                          onClick={() => removeSaved(item.productId)}
                          className="text-sm text-red-600 hover:underline flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="card h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal (ex. VAT):</span>
              <span>{formatPrice(subtotalExVat)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">VAT (20%):</span>
              <span>{formatPrice(vatAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total (incl. VAT):</span>
              <span>{formatPrice(totalIncVat)}</span>
            </div>
          </div>
          <Link to="/checkout" className="btn-primary w-full block text-center">
            Proceed to Checkout
          </Link>
          <Link to="/catalog" className="btn-outline w-full block text-center mt-3">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
