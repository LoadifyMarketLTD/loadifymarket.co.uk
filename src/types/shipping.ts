// Shipping & Tracking Types for DHL-like feature

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

// Shipping options for checkout
export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'standard',
    name: 'Standard Delivery',
    description: 'Delivered in 3-5 business days',
    price: 5.00,
    estimatedDays: '3-5 business days',
  },
  {
    id: 'express',
    name: 'Express Delivery',
    description: 'Delivered in 1-2 business days',
    price: 12.00,
    estimatedDays: '1-2 business days',
  },
  {
    id: 'pallet',
    name: 'Pallet Delivery',
    description: 'For large or pallet orders',
    price: 50.00,
    estimatedDays: '5-7 business days',
  },
];
