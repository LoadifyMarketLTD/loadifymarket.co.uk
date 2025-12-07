import { useState, useEffect } from 'react';
import { X, Upload, Check, Truck, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SHIPPING_OPTIONS } from '../types/shipping';
import type { ShipmentStatus } from '../types/shipping';

interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  status: string;
}

interface Shipment {
  id: string;
  status: ShipmentStatus;
  courier_name: string | null;
  tracking_number: string | null;
  proof_of_delivery_url: string | null;
}

interface ShipmentEvent {
  id: string;
  status: string;
  message: string | null;
  created_at: string;
}

interface Props {
  order: Order;
  onClose: () => void;
}

const STATUS_OPTIONS: ShipmentStatus[] = [
  'Pending',
  'Processing',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Returned',
  'Delivery Failed',
];

export default function SellerShipmentForm({ order, onClose }: Props) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingMethod, setShippingMethod] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [status, setStatus] = useState<ShipmentStatus>('Pending');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchShipment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id]);

  const fetchShipment = async () => {
    try {
      setLoading(true);

      // Fetch existing shipment
      const { data: shipmentData } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', order.id)
        .single();

      if (shipmentData) {
        setShipment(shipmentData);
        setCourierName(shipmentData.courier_name || '');
        setTrackingNumber(shipmentData.tracking_number || '');
        setStatus(shipmentData.status);

        // Fetch events
        const { data: eventsData } = await supabase
          .from('shipment_events')
          .select('*')
          .eq('shipment_id', shipmentData.id)
          .order('created_at', { ascending: false });

        setEvents(eventsData || []);
      }
    } catch (error) {
      console.error('Error fetching shipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShipment = async () => {
    setSaving(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert('Please log in to continue');
        return;
      }

      const payload: Record<string, unknown> = {
        order_id: order.id,
        courier_name: courierName,
        tracking_number: trackingNumber,
      };

      if (shippingMethod) payload.shipping_method = shippingMethod;
      if (shippingCost) payload.shipping_cost = parseFloat(shippingCost);

      const response = await fetch('/.netlify/functions/shipments-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save shipment');
      }

      alert('Shipment saved successfully!');
      await fetchShipment();
    } catch (error) {
      console.error('Error saving shipment:', error);
      alert(error instanceof Error ? error.message : 'Failed to save shipment');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!shipment) {
      alert('Please create the shipment first');
      return;
    }

    setSaving(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert('Please log in to continue');
        return;
      }

      const response = await fetch(`/.netlify/functions/shipments-update-status/${shipment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status,
          message: statusMessage || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update status');
      }

      alert('Status updated successfully!');
      setStatusMessage('');
      await fetchShipment();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shipment) return;

    setUploading(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        alert('Please log in to continue');
        return;
      }

      // Get signed upload URL
      const uploadResponse = await fetch('/.netlify/functions/shipments-upload-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipment_id: shipment.id,
          file_name: file.name,
          content_type: file.type,
        }),
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to get upload URL');
      }

      // Upload file to signed URL
      const uploadFileResponse = await fetch(uploadData.upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadFileResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Confirm upload
      const confirmResponse = await fetch('/.netlify/functions/shipments-confirm-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipment_id: shipment.id,
          file_path: uploadData.file_path,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || 'Failed to confirm upload');
      }

      alert('Proof of delivery uploaded successfully!');
      await fetchShipment();
    } catch (error) {
      console.error('Error uploading proof:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload proof');
    } finally {
      setUploading(false);
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Manage Shipment - {order.orderNumber}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Shipment Details */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Shipment Details
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1">Courier Name</label>
              <input
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g., DHL, Royal Mail"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shipping Method</label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value)}
                className="input-field"
              >
                <option value="">Select method</option>
                {SHIPPING_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} - £{option.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shipping Cost (£)</label>
              <input
                type="number"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                placeholder="0.00"
                className="input-field"
              />
            </div>

            <button
              onClick={handleSaveShipment}
              disabled={saving}
              className="w-full btn-primary"
            >
              {saving ? 'Saving...' : shipment ? 'Update Shipment' : 'Create Shipment'}
            </button>
          </div>

          {/* Right Column: Status & Events */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg flex items-center">
              <Truck className="h-5 w-5 mr-2" />
              Status & Tracking
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                className="input-field"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Status Message (optional)</label>
              <textarea
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="Add a note about this status update"
                className="input-field"
                rows={2}
              />
            </div>

            <button
              onClick={handleUpdateStatus}
              disabled={saving || !shipment}
              className="w-full btn-secondary"
            >
              {saving ? 'Updating...' : 'Update Status'}
            </button>

            {/* Upload Proof of Delivery */}
            {shipment && (
              <div>
                <label className="block text-sm font-medium mb-1">Proof of Delivery</label>
                {shipment.proof_of_delivery_url ? (
                  <div className="space-y-2">
                    <div className="flex items-center text-green-600">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-sm">Uploaded</span>
                    </div>
                    <a
                      href={shipment.proof_of_delivery_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:underline text-sm"
                    >
                      View Proof
                    </a>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleUploadProof}
                      disabled={uploading}
                      className="hidden"
                      id="proof-upload"
                    />
                    <label
                      htmlFor="proof-upload"
                      className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Proof'}
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Events Timeline */}
            {events.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Timeline</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {events.map((event) => (
                    <div key={event.id} className="text-sm border-l-2 border-blue-500 pl-3">
                      <p className="font-medium">{event.status}</p>
                      {event.message && <p className="text-gray-600">{event.message}</p>}
                      <p className="text-xs text-gray-500">{formatDate(event.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
