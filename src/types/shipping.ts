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
  dispatched_at?: string | null;
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

// ── Shipping methods / rates / product-shipping ──────────────

export interface ShippingMethod {
  id: string;
  name: string;
  courier?: string | null;
  tracking: boolean;
  active: boolean;
  created_at: string;
  /** Rates are joined when fetching methods with their prices. */
  shipping_rates?: ShippingRate[];
}

export interface ShippingRate {
  id: string;
  method_id: string;
  price: number;
  currency: string;
  min_weight?: number | null;
  max_weight?: number | null;
  created_at: string;
}

export interface ProductShipping {
  id: string;
  product_id: string;
  method_id: string;
  dispatch_time?: string | null;
  created_at: string;
  /** Joined when fetching product shipping options. */
  shipping_methods?: ShippingMethod;
}

