import { useState, useEffect } from 'react';
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { useSearchParams } from 'react-router-dom';
import { Package, Search, Truck, CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
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

const getCarrierTrackingDestination = (courierName: string | null) => {
  if (!courierName) return null;
  const carrier = courierName.trim().toLowerCase();

  if (carrier.includes('royal mail')) {
    return { label: 'Track with Royal Mail', url: 'https://www.royalmail.com/track-your-item' };
  }
  if (carrier.includes('dpd')) {
    return { label: 'Track with DPD', url: 'https://track.dpd.co.uk/' };
  }
  if (carrier.includes('evri') || carrier.includes('hermes')) {
    return { label: 'Track with Evri', url: 'https://www.evri.com/track-a-parcel' };
  }

  return null;
};

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);

  const handleTrack = async (orderNum?: string, orderEmail?: string) => {
    const trackOrderNumber = (orderNum || orderNumber).trim();
    const trackEmail = (orderEmail !== undefined ? orderEmail : email).trim();

    if (!trackOrderNumber) {
      setError('Please enter an order number');
      return;
    }

    if (!trackEmail) {
      setError('Please enter the email address used when placing this order');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/track-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: trackOrderNumber, email: trackEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to track order');
      }

      setTrackingData(data);
      setOrderNumber(trackOrderNumber);
      setEmail(trackEmail);
      setSearchParams({ orderNumber: trackOrderNumber });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to track order');
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const orderNumberParam = searchParams.get('orderNumber');
    if (orderNumberParam) {
      setOrderNumber(orderNumberParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack();
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="w-6 h-6 text-success" aria-hidden="true" />;
      case 'in transit':
      case 'out for delivery':
      case 'dispatched':
        return <Truck className="w-6 h-6 text-blue-600" aria-hidden="true" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-6 h-6 text-warning" aria-hidden="true" />;
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

  const carrierTracking = trackingData?.shipment?.tracking_number
    ? getCarrierTrackingDestination(trackingData.shipment.courier_name)
    : null;

  return (
    <MainLayout>
      <SEO
        title="Track Your Order | Loadify Market"
        description="Track the status and delivery progress of your Loadify Market order in real time."
        canonical="/track-order"
      />
      <main id="main-content" className="flex-1 pt-4 md:pt-28 pb-16">
      <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-navy-800 mb-2">Track Your Order</h1>
        <p className="text-gray-600">Enter your order number to track your shipment</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orderNumber" className="block text-sm font-medium text-gray-700 mb-1">Order Number *</label>
            <input id="orderNumber" type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g., ORD-1234567890-ABC" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your.email@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent" required />
            <p className="text-xs text-gray-500 mt-1">Enter the email address you used when placing the order.</p>
          </div>
          {error && <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg">{error}</div>}
          <button type="submit" disabled={loading} className="w-full bg-orange-500 text-gray-900 py-3 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
            {loading ? <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>Tracking...</> : <><Search className="w-5 h-5" aria-hidden="true" />Track Order</>}
          </button>
        </form>
      </div>

      {trackingData && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy-800 mb-4">Order Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-600">Order Number</p><p className="font-semibold">{trackingData.order.orderNumber}</p></div>
              <div><p className="text-sm text-gray-600">Order Date</p><p className="font-semibold">{formatDate(trackingData.order.createdAt)}</p></div>
              <div><p className="text-sm text-gray-600">Total</p><p className="font-semibold">£{trackingData.order.total.toFixed(2)}</p></div>
              <div><p className="text-sm text-gray-600">Seller</p><p className="font-semibold">{trackingData.order.seller?.name || 'N/A'}</p></div>
            </div>
            {trackingData.order.product && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600 mb-2">Product</p>
                <div className="flex items-center gap-3">
                  {trackingData.order.product.image && <img src={trackingData.order.product.image} alt="" className="w-16 h-16 object-cover rounded" aria-hidden="true" />}
                  <p className="font-semibold">{trackingData.order.product.title}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-navy-800 mb-4">Shipment Status</h2>
            {trackingData.state === 'being_prepared' ? (
              <div className="flex items-center gap-3 p-4 bg-primary-soft border border-primary/40 rounded-lg">
                <Package className="w-8 h-8 text-warning" aria-hidden="true" />
                <div><p className="font-semibold text-primary">Your order is being prepared</p><p className="text-sm text-primary">The seller is preparing your order for shipment. You'll receive tracking information soon.</p></div>
              </div>
            ) : trackingData.shipment ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  {getStatusIcon(trackingData.shipment.status)}
                  <div><p className="font-semibold text-lg">{trackingData.shipment.status}</p><p className="text-sm text-gray-600">Last updated: {formatDate(trackingData.shipment.updated_at)}</p></div>
                </div>
                {(trackingData.shipment.courier_name || trackingData.shipment.tracking_number) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    {trackingData.shipment.courier_name && <div><p className="text-sm text-gray-600">Courier</p><p className="font-semibold">{trackingData.shipment.courier_name}</p></div>}
                    {trackingData.shipment.tracking_number && <div><p className="text-sm text-gray-600">Tracking Number</p><p className="font-semibold font-mono break-all">{trackingData.shipment.tracking_number}</p></div>}
                  </div>
                )}
                {carrierTracking && (
                  <div className="mb-4">
                    <a
                      href={carrierTracking.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full sm:w-fit min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0B2F6B] px-5 py-3 text-base font-semibold text-white no-underline shadow-sm hover:bg-[#0A234F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                    >
                      <span>{carrierTracking.label}</span>
                      <ExternalLink className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </a>
                    <p className="text-xs text-gray-500 mt-2">Opens the courier's official tracking page. Your tracking number is shown above.</p>
                  </div>
                )}
                {trackingData.shipment.proof_of_delivery_url && (
                  <div className="mb-4"><p className="text-sm text-gray-600 mb-2">Proof of Delivery</p><a href={trackingData.shipment.proof_of_delivery_url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600 underline">View proof of delivery image</a></div>
                )}
              </div>
            ) : null}
          </div>

          {trackingData.events.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-navy-800 mb-4">Tracking History</h2>
              <div className="space-y-4">
                {trackingData.events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center"><div className={`w-3 h-3 rounded-full ${index === trackingData.events.length - 1 ? 'bg-orange-500' : 'bg-gray-400'}`}></div>{index < trackingData.events.length - 1 && <div className="w-0.5 h-full bg-gray-300 mt-1"></div>}</div>
                    <div className="flex-1 pb-4"><p className="font-semibold text-navy-800">{event.status}</p>{event.message && <p className="text-sm text-gray-600">{event.message}</p>}<p className="text-xs text-gray-500 mt-1">{formatDate(event.created_at)}</p></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
      </main>
    </MainLayout>
  );
}
