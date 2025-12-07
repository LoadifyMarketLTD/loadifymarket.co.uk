import { useState } from 'react';
import type { Shipment, ShipmentStatus } from '../types/shipping';
import { Upload, Truck, X } from 'lucide-react';

interface SellerShipmentFormProps {
  orderId: string;
  existingShipment?: Shipment | null;
  onClose: () => void;
  onSuccess: () => void;
}

const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'Pending',
  'Processing',
  'Dispatched',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Returned',
  'Delivery Failed',
];

export default function SellerShipmentForm({ orderId, existingShipment, onClose, onSuccess }: SellerShipmentFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [courierName, setCourierName] = useState(existingShipment?.courier_name || '');
  const [trackingNumber, setTrackingNumber] = useState(existingShipment?.tracking_number || '');
  const [status, setStatus] = useState<ShipmentStatus>(existingShipment?.status || 'Pending');
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  const handleCreateOrUpdate = async () => {
    if (!courierName && !trackingNumber) {
      setError('Please provide at least courier name or tracking number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch('/.netlify/functions/create-shipment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_id: orderId,
          courier_name: courierName || null,
          tracking_number: trackingNumber || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save shipment');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shipment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!existingShipment) {
      setError('Please create shipment first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;
      
      const response = await fetch(`/.netlify/functions/update-shipment-status/${existingShipment.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (file: File) => {
    if (!existingShipment) {
      setError('Please create shipment first');
      return;
    }

    setUploadingProof(true);
    setError('');

    try {
      const { data: { session } } = await (await import('../lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token;

      // Step 1: Get signed upload URL
      const uploadUrlResponse = await fetch(`/.netlify/functions/upload-proof-of-delivery/${existingShipment.id}/proof`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const uploadUrlData = await uploadUrlResponse.json();

      if (!uploadUrlResponse.ok) {
        throw new Error(uploadUrlData.error || 'Failed to get upload URL');
      }

      // Step 2: Upload file to Supabase Storage
      const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Step 3: Confirm upload
      const confirmResponse = await fetch(`/.netlify/functions/upload-proof-of-delivery/${existingShipment.id}/proof`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          filePath: uploadUrlData.path,
        }),
      });

      const confirmData = await confirmResponse.json();

      if (!confirmResponse.ok) {
        throw new Error(confirmData.error || 'Failed to confirm upload');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload proof of delivery');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProofUpload(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-navy-800">
            {existingShipment ? 'Manage Shipment' : 'Create Shipment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Shipment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-navy-800">Shipment Details</h3>
            
            <div>
              <label htmlFor="courierName" className="block text-sm font-medium text-gray-700 mb-1">
                Courier Name
              </label>
              <input
                id="courierName"
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g., DHL, Royal Mail, DPD"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="trackingNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Tracking Number
              </label>
              <input
                id="trackingNumber"
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter AWB/tracking number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleCreateOrUpdate}
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Truck className="w-5 h-5" aria-hidden="true" />
              {loading ? 'Saving...' : existingShipment ? 'Update Shipment' : 'Create Shipment'}
            </button>
          </div>

          {/* Status Update */}
          {existingShipment && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-navy-800">Update Status</h3>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {SHIPMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="statusMessage" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  id="statusMessage"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  placeholder="Add a note about this status update"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleUpdateStatus}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          )}

          {/* Proof of Delivery Upload */}
          {existingShipment && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-navy-800">Proof of Delivery</h3>
              
              {existingShipment.proof_of_delivery_url ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Current proof:</p>
                  <a
                    href={existingShipment.proof_of_delivery_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-600 underline"
                  >
                    View uploaded proof of delivery
                  </a>
                </div>
              ) : null}

              <div>
                <label className="block">
                  <span className="sr-only">Upload proof of delivery</span>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" aria-hidden="true" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> proof of delivery
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploadingProof}
                      />
                    </label>
                  </div>
                </label>
                {uploadingProof && (
                  <p className="text-sm text-gray-600 mt-2">Uploading...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
