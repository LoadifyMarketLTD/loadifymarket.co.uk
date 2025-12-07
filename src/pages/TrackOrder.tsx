import { useState } from 'react';
import { Search, Package, MapPin, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';

interface TrackingResult {
  order: {
    orderNumber: string;
    createdAt: string;
    total: number;
    status: string;
    items: Array<{ title: string }>;
    seller: {
      id: string;
      name: string;
    } | null;
  };
  shipment: {
    id: string;
    status: string;
    courier_name: string | null;
    tracking_number: string | null;
    proof_of_delivery_url: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  shipment_events: Array<{
    id: string;
    status: string;
    message: string | null;
    created_at: string;
  }>;
  state: string;
}

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!orderNumber) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);

    try {
      const params = new URLSearchParams({ orderNumber });
      if (email) params.append('email', email);

      const response = await fetch(`/.netlify/functions/shipments-track?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to track order');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Delivered':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Dispatched':
      case 'In Transit':
      case 'Out for Delivery':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'Delivery Failed':
      case 'Returned':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(price);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-navy-800 mb-2">Track Your Order</h1>
          <p className="text-gray-600">Enter your order number to see the latest delivery status</p>
        </div>

        {/* Search Form */}
        <div className="card mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="orderNumber">
                Order Number *
              </label>
              <input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., ORD-123456"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="email">
                Email (optional)
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input-field"
              />
              <p className="text-xs text-gray-500 mt-1">
                Providing your email helps us verify the order
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center"
            >
              {loading ? (
                'Searching...'
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  Track Order
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="card">
              <div className="flex items-center mb-4">
                <Package className="h-6 w-6 text-navy-800 mr-2" />
                <h2 className="text-xl font-bold">Order Summary</h2>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Order Number</p>
                  <p className="font-medium">{result.order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-gray-600">Order Date</p>
                  <p className="font-medium">{formatDate(result.order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Amount</p>
                  <p className="font-medium">{formatPrice(result.order.total)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Seller</p>
                  <p className="font-medium">{result.order.seller?.name || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Shipment Status */}
            {result.shipment ? (
              <div className="card">
                <div className="flex items-center mb-4">
                  <Truck className="h-6 w-6 text-navy-800 mr-2" />
                  <h2 className="text-xl font-bold">Shipment Details</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center">
                      {getStatusIcon(result.shipment.status)}
                      <span className="ml-2 font-medium">{result.shipment.status}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      Last updated: {formatDate(result.shipment.updated_at)}
                    </span>
                  </div>

                  {result.shipment.courier_name && (
                    <div>
                      <p className="text-sm text-gray-600">Courier</p>
                      <p className="font-medium">{result.shipment.courier_name}</p>
                    </div>
                  )}

                  {result.shipment.tracking_number && (
                    <div>
                      <p className="text-sm text-gray-600">Tracking Number</p>
                      <p className="font-medium font-mono">{result.shipment.tracking_number}</p>
                    </div>
                  )}

                  {result.shipment.proof_of_delivery_url && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Proof of Delivery</p>
                      <a
                        href={result.shipment.proof_of_delivery_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-700 underline"
                      >
                        View Proof of Delivery
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="flex items-center justify-center p-8 text-center">
                  <div>
                    <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      Order Being Prepared
                    </h3>
                    <p className="text-gray-600">
                      Your order is being prepared for shipment. You'll receive tracking information
                      once it's dispatched.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {result.shipment_events.length > 0 && (
              <div className="card">
                <div className="flex items-center mb-4">
                  <MapPin className="h-6 w-6 text-navy-800 mr-2" />
                  <h2 className="text-xl font-bold">Tracking Timeline</h2>
                </div>

                <div className="relative">
                  {result.shipment_events.map((event, index) => (
                    <div key={event.id} className="flex pb-6 last:pb-0">
                      <div className="flex flex-col items-center mr-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 border-2 border-blue-500">
                          {getStatusIcon(event.status)}
                        </div>
                        {index < result.shipment_events.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-300 mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="font-medium">{event.status}</p>
                        {event.message && (
                          <p className="text-sm text-gray-600">{event.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
