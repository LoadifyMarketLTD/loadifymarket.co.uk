import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ShipmentEvent {
  id: string;
  status: string;
  location: string;
  description: string;
  createdAt: string;
}

interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery: string;
  events: ShipmentEvent[];
}

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get('order');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (orderNumber) {
      handleTrackByOrder(orderNumber);
    }
  }, [orderNumber]);

  const handleTrackByOrder = async (ordNum: string) => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch shipment by order number
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('orderId', ordNum)
        .single();

      if (shipmentError || !shipmentData) {
        setError('No tracking information found for this order.');
        setShipment(null);
        return;
      }

      // Fetch shipment events
      const { data: eventsData } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipmentId', shipmentData.id)
        .order('createdAt', { ascending: false });

      setShipment({
        ...shipmentData,
        events: eventsData || [],
      });
    } catch (err) {
      setError('Failed to fetch tracking information.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch shipment by tracking number
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('*')
        .eq('trackingNumber', trackingNumber)
        .single();

      if (shipmentError || !shipmentData) {
        setError('Tracking number not found.');
        setShipment(null);
        return;
      }

      // Fetch shipment events
      const { data: eventsData } = await supabase
        .from('shipment_events')
        .select('*')
        .eq('shipmentId', shipmentData.id)
        .order('createdAt', { ascending: false });

      setShipment({
        ...shipmentData,
        events: eventsData || [],
      });
    } catch (err) {
      setError('Failed to fetch tracking information.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-6 w-6 text-gray-500" />;
      case 'packed':
        return <Package className="h-6 w-6 text-blue-500" />;
      case 'in_transit':
        return <Truck className="h-6 w-6 text-gold-600" />;
      case 'delivered':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      default:
        return <Package className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pending',
      packed: 'Packed',
      in_transit: 'In Transit',
      out_for_delivery: 'Out for Delivery',
      delivered: 'Delivered',
      returned: 'Returned',
    };
    return labels[status] || status;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Track Your Order</h1>

      {/* Tracking Form */}
      <div className="card mb-8">
        <form onSubmit={handleTrack} className="max-w-xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tracking Number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter your tracking number"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary whitespace-nowrap"
            >
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </form>
      </div>

      {/* Shipment Details */}
      {shipment && (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {getStatusLabel(shipment.status)}
                </h2>
                <p className="text-gray-600">
                  Tracking Number: <span className="font-mono">{shipment.trackingNumber}</span>
                </p>
                <p className="text-gray-600">
                  Carrier: {shipment.carrier}
                </p>
              </div>
              <div>
                {getStatusIcon(shipment.status)}
              </div>
            </div>

            {shipment.estimatedDelivery && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Estimated Delivery:</strong>{' '}
                  {new Date(shipment.estimatedDelivery).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {/* Tracking Timeline */}
          <div className="card">
            <h3 className="text-xl font-bold mb-6">Tracking History</h3>
            
            {shipment.events && shipment.events.length > 0 ? (
              <div className="space-y-6">
                {shipment.events.map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    {/* Timeline Line */}
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-4 h-4 rounded-full border-2
                        ${index === 0 
                          ? 'bg-gold-500 border-gold-500' 
                          : 'bg-gray-300 border-gray-300'
                        }
                      `} />
                      {index < shipment.events.length - 1 && (
                        <div className="w-0.5 h-full bg-gray-300 flex-1 min-h-[40px]" />
                      )}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 pb-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {event.description}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </p>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 whitespace-nowrap ml-4">
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">
                No tracking events available yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && !shipment && !error && (
        <div className="card text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Enter your tracking number above to track your shipment.
          </p>
        </div>
      )}
    </div>
  );
}
