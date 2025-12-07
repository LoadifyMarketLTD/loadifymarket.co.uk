import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Search, Truck, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { ShipmentEvent } from '../types/shipping';

interface TrackingData {
  order: {
    orderNumber: string;
    createdAt: string;
    total: number;
    status: string;
    product: {
      title: string;
      image: string | null;
    } | null;
    seller: {
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
  events: ShipmentEvent[];
  state: 'tracked' | 'being_prepared';
}

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  useEffect(() => {
    const orderNumberParam = searchParams.get('orderNumber');
    if (orderNumberParam) {
      setOrderNumber(orderNumberParam);
      handleTrack(orderNumberParam, '');
    }
  }, []); // Run only on mount

  const handleTrack = async (orderNum?: string, orderEmail?: string) => {
    const trackOrderNumber = orderNum || orderNumber;
    const trackEmail = orderEmail !== undefined ? orderEmail : email;

    if (!trackOrderNumber) {
      setError('Please enter an order number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ orderNumber: trackOrderNumber });
      if (trackEmail) {
        params.append('email', trackEmail);
      }

      const response = await fetch(`/.netlify/functions/track-shipment?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to track order');
      }

      setTrackingData(data);
      setSearchParams({ orderNumber: trackOrderNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track order');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack();
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-green-600" aria-hidden="true" />;
      case 'in transit':
      case 'out for delivery':
      case 'dispatched':
        return <Truck className="w-6 h-6 text-blue-600" aria-hidden="true" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-6 h-6 text-yellow-600" aria-hidden="true" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-600" aria-hidden="true" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-navy-800 mb-2">Track Your Order</h1>
        <p className="text-gray-600">Enter your order number to track your shipment</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Order Number *
            </label>
            <input
              id="orderNumber"
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g., ORD-1234567890-ABC"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional, for verification)
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Tracking...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" aria-hidden="true" />
                Track Order
              </>
            )}
          </button>
        </form>
      </div>

      {trackingData && (
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy-800 mb-4">Order Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="font-semibold">{trackingData.order.orderNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-semibold">{formatDate(trackingData.order.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="font-semibold">£{trackingData.order.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Seller</p>
                <p className="font-semibold">{trackingData.order.seller?.name || 'N/A'}</p>
              </div>
            </div>
            {trackingData.order.product && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Product</p>
                <div className="flex items-center gap-3">
                  {trackingData.order.product.image && (
                    <img
                      src={trackingData.order.product.image}
                      alt=""
                      className="w-16 h-16 object-cover rounded"
                      aria-hidden="true"
                    />
                  )}
                  <p className="font-semibold">{trackingData.order.product.title}</p>
                </div>
              </div>
            )}
          </div>

          {/* Shipment Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy-800 mb-4">Shipment Status</h2>
            
            {trackingData.state === 'being_prepared' ? (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Package className="w-8 h-8 text-yellow-600" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-yellow-800">Your order is being prepared</p>
                  <p className="text-sm text-yellow-700">
                    The seller is preparing your order for shipment. You'll receive tracking information soon.
                  </p>
                </div>
              </div>
            ) : trackingData.shipment ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon(trackingData.shipment.status)}
                  <div>
                    <p className="font-semibold text-lg">{trackingData.shipment.status}</p>
                    <p className="text-sm text-gray-600">
                      Last updated: {formatDate(trackingData.shipment.updated_at)}
                    </p>
                  </div>
                </div>

                {(trackingData.shipment.courier_name || trackingData.shipment.tracking_number) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    {trackingData.shipment.courier_name && (
                      <div>
                        <p className="text-sm text-gray-600">Courier</p>
                        <p className="font-semibold">{trackingData.shipment.courier_name}</p>
                      </div>
                    )}
                    {trackingData.shipment.tracking_number && (
                      <div>
                        <p className="text-sm text-gray-600">Tracking Number</p>
                        <p className="font-semibold font-mono">{trackingData.shipment.tracking_number}</p>
                      </div>
                    )}
                  </div>
                )}

                {trackingData.shipment.proof_of_delivery_url && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Proof of Delivery</p>
                    <a
                      href={trackingData.shipment.proof_of_delivery_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 hover:text-orange-600 underline"
                    >
                      View proof of delivery image
                    </a>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Timeline */}
          {trackingData.events.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy-800 mb-4">Tracking History</h2>
              <div className="space-y-4">
                {trackingData.events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${index === trackingData.events.length - 1 ? 'bg-orange-500' : 'bg-gray-400'}`}></div>
                      {index < trackingData.events.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="font-semibold text-navy-800">{event.status}</p>
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
  );
}
