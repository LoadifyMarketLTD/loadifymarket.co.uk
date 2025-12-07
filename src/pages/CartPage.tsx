import { useCartStore } from '../store';
import { Link } from 'react-router-dom';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice } = useCartStore();

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
          {items.map((item) => (
            <div key={item.productId} className="card flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Product ID: {item.productId}</h3>
                <p className="text-gray-600">£{item.price.toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value))}
                  className="input-field w-20"
                />
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
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
