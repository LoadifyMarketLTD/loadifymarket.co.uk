import { useCartStore } from '../store';
import { Link } from 'react-router-dom';
import { Bookmark, ShoppingBag, Trash2 } from 'lucide-react';

export default function CartPage() {
  const { items, savedForLater, removeItem, updateQuantity, saveForLater, moveToCart, removeSaved, getTotalPrice } = useCartStore();

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
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Product ID: {item.productId}</h3>
                    <p className="text-gray-600 text-lg font-bold">£{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                        className="input-field w-20"
                      />
                    </div>
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
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Product ID: {item.productId}</h3>
                        <p className="text-gray-600 text-lg font-bold">£{item.price.toFixed(2)}</p>
                        <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                      </div>
                      <div className="flex gap-2">
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
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>£{getTotalPrice().toFixed(2)}</span>
            </div>
          </div>
          <Link to="/checkout" className="btn-primary w-full block text-center">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
