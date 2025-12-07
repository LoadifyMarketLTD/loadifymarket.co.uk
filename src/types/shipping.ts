export type ShipmentStatus = 
  | 'Pending' 
  | 'Processing' 
  | 'Dispatched' 
  | 'In Transit' 
  | 'Out for Delivery' 
  | 'Delivered' 
  | 'Returned' 
  | 'Delivery Failed';

export interface Shipment {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  courier_name?: string | null;
  tracking_number?: string | null;
  status: ShipmentStatus;
  proof_of_delivery_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus | string;
  message?: string | null;
  changed_by?: string | null;
  created_at: string;
}
