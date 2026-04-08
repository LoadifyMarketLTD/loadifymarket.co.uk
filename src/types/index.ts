export type UserRole = 'buyer' | 'seller' | 'admin' | 'owner';

// Marketplace roles for sellers/users
export type MarketplaceRole = 'carrier' | 'broker' | 'seller' | null;

// Payment behaviour indicator
export type PaymentBehaviour = 'pays_on_time' | 'sometimes_late' | 'repeated_delays' | null;

/**
 * Canonical seller account lifecycle status (migration 210).
 *   draft     → signed up; setup not yet complete
 *   submitted → profile complete; Stripe not yet fully ready
 *   active    → profile complete AND Stripe ready (auto-set)
 *   suspended → manually suspended by admin/owner
 */
export type SellerStatus = 'draft' | 'submitted' | 'active' | 'suspended';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  marketplaceRole?: MarketplaceRole;
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Cached from seller_profiles at login time. Only set for role==='seller'. */
  sellerStatus?: SellerStatus;
}

export interface BuyerProfile {
  userId: string;
  shippingAddress?: Address;
  billingAddress?: Address;
}

export type SellerVerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export interface VerificationDocument {
  type: 'identity' | 'business_registration' | 'vat_certificate' | 'proof_of_address';
  url: string;
  uploadedAt: string;
  verifiedAt?: string;
  rejectedReason?: string;
}

export interface SellerProfile {
  userId: string;
  // Core identity
  fullName?: string;
  storeName?: string;
  phone?: string;
  country?: string;
  // Business details (optional)
  businessName?: string;
  vatNumber?: string;
  companyRegistrationNumber?: string;
  businessAddress?: Address;
  // Seller activation status (canonical — migration 210)
  sellerStatus?: SellerStatus;
  activatedAt?: string;
  // Legacy verification fields (deprecated — kept for backwards compatibility)
  // Use sellerStatus instead of verificationStatus for new code.
  verificationStatus?: SellerVerificationStatus;
  verificationDocuments?: VerificationDocument[];
  verifiedAt?: string;
  suspensionReason?: string;
  // Stripe Connect Express
  stripeAccountId?: string;
  stripeConnectStatus?: 'pending' | 'restricted' | 'active' | null;
  /** @deprecated Use sellerStatus === 'active' instead */
  isApproved: boolean;
  // Reputation metrics
  rating: number;
  totalSales: number;
  salesCount?: number;
  disputeRate?: number;        // 0.0 – 1.0
  deliverySuccessRate?: number; // 0.0 – 1.0
  commission: number; // percentage
  // Listing limit: 5 for unverified, unlimited for verified
  listingLimit?: number;
  contactPhone?: string;
  payoutDetails?: {
    accountHolderName?: string;
    sortCode?: string;
    accountNumber?: string;
    bankName?: string;
  };
  profileCompleteness?: number;
  marketplaceRole?: MarketplaceRole;
  paymentBehaviour?: PaymentBehaviour;
  // Shipping preferences (migration 260)
  shippingDefaults?: {
    carrier?: string;
    dispatchTime?: string;
    originPostcode?: string;
    freeShippingThreshold?: string;
  };
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

export type ProductType = 'product' | 'pallet' | 'lot' | 'clearance' | 'retail' | 'handmade' | 'wholesale';
export type ProductCondition = 'new' | 'used' | 'refurbished' | 'returns_stock' | 'mixed' | 'other';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'clearance';

// Listing type for filtering and display
export type ListingType = 'pallet' | 'wholesale' | 'retail' | 'handmade';

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
  // New fields for marketplace diversity
  listingType?: ListingType; // Main classification for filtering
  isHandmade?: boolean; // Flag for handmade items
  isUnique?: boolean; // Flag for unique/one-of-a-kind items
  artistName?: string; // For handmade items - creator/artist name
  isActive: boolean;
  isApproved: boolean;
  views: number;
  rating: number;
  reviewCount: number;
  addToCartCount?: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Optional seller info for display (joined from users table)
  seller?: {
    businessName?: string;
    isApproved?: boolean;
    rating?: number;
    marketplaceRole?: MarketplaceRole;
    paymentBehaviour?: PaymentBehaviour;
    userId?: string;
    storeSlug?: string;
    location?: string;
  };
  // Flattened seller store fields (joined from seller_stores)
  storeSlug?: string;
  storeName?: string;
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
  title: string;
  image?: string;
  sellerId?: string;
  storeName?: string;
}

export type ReviewStatus = 'published' | 'hidden' | 'removed' | 'flagged';

export interface ReviewSellerResponse {
  text: string;
  respondedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  orderId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
  images?: string[];
  videoUrl?: string;
  isVerifiedPurchase: boolean;
  sellerRating?: number;
  sellerResponse?: ReviewSellerResponse;
  helpfulCount: number;
  helpfulVoters?: string[]; // user IDs who marked helpful
  status: ReviewStatus;
  isAbusive?: boolean;
  adminNote?: string;
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

export type BuyerProtectionReason =
  | 'item_not_received'
  | 'not_as_described'
  | 'item_damaged'
  | 'defective_product'
  | 'seller_not_responding'
  | 'other';

export type DisputeResolutionType =
  | 'full_refund'
  | 'partial_refund'
  | 'replacement'
  | 'rejected'
  | 'withdrawn';

export type EscrowStatus =
  | 'held'          // payment captured, not yet released
  | 'released'      // released to seller after delivery confirmation
  | 'refunded'      // returned to buyer
  | 'partial_refund'; // partial amount returned

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  subject: string;
  description: string;
  protectionReason?: BuyerProtectionReason;
  images?: string[];
  status: DisputeStatus;
  resolution?: string;
  resolutionType?: DisputeResolutionType;
  refundAmount?: number;
  resolvedBy?: string;
  sellerResponseDeadline?: string;  // 48 hrs from open
  adminReviewDeadline?: string;     // 5 days from open
  escrowStatus?: EscrowStatus;
  buyerAbuseFlagged?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  stripePayoutId?: string;    // Stripe automatic payout to bank (set by Stripe)
  stripeTransferId?: string;  // Stripe Connect Transfer ID (set by platform after sale)
  createdAt: string;
  paidAt?: string;
}

export interface SellerBalance {
  sellerId: string;
  availableAmount: number;
  pendingAmount: number;
  totalEarned: number;
  currency: string;
  updatedAt: string;
}

export type PayoutRequestStatus = 'requested' | 'approved' | 'rejected' | 'paid' | 'cancelled';

export interface PayoutRequest {
  id: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: PayoutRequestStatus;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
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

export type RFQStatus = 'pending' | 'replied';

export interface RFQRequest {
  id: string;
  product_name: string;
  quantity: string;
  destination_country: string;
  estimated_budget: string;
  buyer_email: string;
  message?: string;
  status: RFQStatus;
  created_at: string;
}
