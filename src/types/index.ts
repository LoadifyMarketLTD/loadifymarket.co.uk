export type UserRole = 'guest' | 'buyer' | 'seller' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerProfile {
  userId: string;
  shippingAddress?: Address;
  billingAddress?: Address;
}

export interface SellerProfile {
  userId: string;
  businessName?: string;
  vatNumber?: string;
  stripeAccountId?: string;
  isApproved: boolean;
  rating: number;
  totalSales: number;
  commission: number; // percentage
  companyRegistrationNumber?: string;
  businessAddress?: Address;
  contactPhone?: string;
  payoutDetails?: {
    accountHolderName?: string;
    sortCode?: string;
    accountNumber?: string;
    bankName?: string;
  };
  profileCompleteness?: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

export type ProductType = 'product' | 'pallet' | 'lot' | 'clearance';
export type ProductCondition = 'new' | 'used' | 'refurbished';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'clearance';

export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  type: ProductType;
  condition: ProductCondition;
  categoryId: string;
  subcategoryId?: string;
  price: number; // price including VAT
  priceExVat?: number;
  vatRate: number; // e.g., 0.20 for 20%
  stockQuantity: number;
  stockStatus: StockStatus;
  images: string[];
  specifications?: Record<string, string>;
  weight?: number; // kg
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  palletInfo?: {
    palletCount: number;
    itemsPerPallet: number;
    palletType: string;
  };
  isActive: boolean;
  isApproved: boolean;
  views: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  imageUrl?: string;
  order: number;
}

export type OrderStatus = 
  | 'pending' 
  | 'paid' 
  | 'packed' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled' 
  | 'refunded';

export interface Order {
  id: string;
  orderNumber: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  quantity: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  commission: number;
  shippingAmount?: number;
  status: OrderStatus;
  shippingAddress: Address;
  billingAddress: Address;
  trackingNumber?: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveredAt?: string;
  invoiceUrl?: string;
  proofOfDelivery?: {
    images: string[];
    signature?: string;
    deliveredBy?: string;
    receivedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  price: number;
  title?: string;
  sellerId?: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  rating: number; // 1-5
  comment?: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  sellerRating?: number;
  createdAt: string;
  updatedAt: string;
}

export type ReturnReason = 
  | 'damaged'
  | 'wrong_item'
  | 'not_as_described'
  | 'changed_mind'
  | 'other';

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface Return {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  reason: ReturnReason;
  description: string;
  images?: string[];
  status: ReturnStatus;
  refundAmount?: number;
  buyerTrackingNumber?: string;
  sellerTrackingNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'closed';

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  subject: string;
  description: string;
  images?: string[];
  status: DisputeStatus;
  resolution?: string;
  refundAmount?: number;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  stripePayoutId?: string;
  createdAt: string;
  paidAt?: string;
}

export interface Wishlist {
  userId: string;
  productIds: string[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
}

export interface NotificationSettings {
  userId: string;
  orderConfirmation: boolean;
  shippingUpdates: boolean;
  deliveryConfirmation: boolean;
  promotionalEmails: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  productId?: string;
  orderId?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  user1Id: string;
  user2Id: string;
  productId?: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface Cart {
  id: string;
  userId?: string;
  sessionId?: string;
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentSession {
  id: string;
  userId?: string;
  stripeSessionId: string;
  orderId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SellerStore {
  userId: string;
  storeName?: string;
  storeSlug?: string;
  storeLogo?: string;
  storeDescription?: string;
  storeBanner?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportedListing {
  id: string;
  productId: string;
  reportedBy: string;
  reason: string;
  description?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}
