import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useCartStore, useAuthStore } from '../store';
import { useWishlist } from '../lib/useWishlist';
import type { Product } from '../types';
import type { ProductShipping } from '../types/shipping';
import RelatedProducts from '../components/RelatedProducts';
import ProductQA from '../components/ProductQA';
import FrequentlyBoughtTogether from '../components/FrequentlyBoughtTogether';
import SellerPerformance from '../components/SellerPerformance';
import ProductReviews from '../components/ProductReviews';
import { buildTransportQuoteUrl } from '../lib/transportQuote';
import { updatePageMeta, injectStructuredData, generateProductSchema, pageSEO } from '../lib/seo';
import { formatPrice } from '../lib/formatPrice';
import {
  ShoppingCart,
  Heart,
  Share2,
  Star,
  Package,
  Truck,
  Sparkles,
  ChevronLeft,
  Shield,
  Zap,
  MessageCircle,
  FileText,
  Store,
} from 'lucide-react';

/** Product types that use the XDrive logistics / transport quote flow instead of normal checkout. */
const BULK_PRODUCT_TYPES: string[] = ['pallet', 'lot', 'wholesale', 'logistics'];

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [shippingOptions, setShippingOptions] = useState<ProductShipping[]>([]);
  const { addItem } = useCartStore();
  const { isInWishlist, loading: wishlistLoading, checkWishlist, toggleWishlist } = useWishlist();

  const fetchProduct = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          store:seller_stores(storeSlug, storeName)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Attach storeSlug and storeName to product for seller links
      const productWithStore = {
        ...data,
        storeSlug: (data.store as { storeSlug?: string; storeName?: string } | null)?.storeSlug,
        storeName: (data.store as { storeSlug?: string; storeName?: string } | null)?.storeName,
      };
      setProduct(productWithStore);

      // Fetch shipping options linked to this product
      const { data: shippingData } = await supabase
        .from('product_shipping')
        .select('*, shipping_methods(*, shipping_rates(*))')
        .eq('product_id', id);
      setShippingOptions(shippingData || []);

      // Track product view using enhanced tracking
      const sessionId = localStorage.getItem('sessionId') || 
        `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (!localStorage.getItem('sessionId')) {
        localStorage.setItem('sessionId', sessionId);
      }

      // Call the track_product_view function
      const { error: trackError } = await supabase.rpc('track_product_view', {
        p_product_id: id,
        p_user_id: user?.id || null,
        p_session_id: !user ? sessionId : null,
      });

      if (trackError) {
        console.warn('Error tracking product view:', trackError);
        // Fallback to simple increment if function doesn't exist
        await supabase
          .from('products')
          .update({ 
            views: (data.views || 0) + 1,
            lastViewedAt: new Date().toISOString()
          })
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (id) {
      fetchProduct();
      checkWishlist(id);
    }
  }, [id, fetchProduct, checkWishlist]);

  // Update page metadata for SEO when product loads
  useEffect(() => {
    if (!product) return;

    const BASE_URL = 'https://loadifymarket.co.uk';
    const canonical = `${BASE_URL}/product/${product.id}`;
    const description = product.description
      ? product.description.slice(0, 160)
      : `Buy ${product.title} on Loadify Market. ${product.condition} condition. From £${product.price.toFixed(2)}.`;

    updatePageMeta({
      title: `${product.title} | Loadify Market Ltd`,
      description,
      canonical,
      image: product.images?.[0],
      type: 'product',
      price: product.price,
      currency: 'GBP',
    });

    injectStructuredData(
      generateProductSchema({
        id: product.id,
        title: product.title,
        description: product.description || description,
        images: product.images,
        price: product.price,
        stock: product.stockQuantity,
        condition: product.condition,
        averageRating: product.rating > 0 ? product.rating : undefined,
      })
    );

    return () => {
      // Restore the default site title when navigating away
      document.title = pageSEO.home.title;
    };
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;

    // Check if user is authenticated
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?next=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }

    addItem({
      productId: product.id,
      quantity,
      price: product.price,
      title: product.title,
      image: product.images?.[0],
      sellerId: product.sellerId,
      storeName: product.storeName,
    });

    // Track add to cart
    try {
      const { error } = await supabase.rpc('track_add_to_cart', {
        p_product_id: product.id
      });

      if (error) {
        console.warn('Error tracking add to cart:', error);
        // Fallback to simple increment
        await supabase
          .from('products')
          .update({ 
            addToCartCount: (product.addToCartCount || 0) + 1
          })
          .eq('id', product.id);
      }
    } catch (error) {
      console.warn('Failed to track add to cart:', error);
    }

    // Could add a toast notification here
    alert('Product added to cart!');
  };

  // Bulk/pallet/wholesale products use XDrive transport, not normal checkout
  const isBulkProduct = product
    ? BULK_PRODUCT_TYPES.includes(product.type)
    : false;

  // Get type icon
  const getTypeIcon = () => {
    if (!product) return Package;
    switch (product.type) {
      case 'logistics':
        return Truck;
      case 'pallet':
        return Package;
      case 'handmade':
        return Sparkles;
      default:
        return Package;
    }
  };

  const TypeIcon = getTypeIcon();

  if (loading) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24">
        <div className="container-cinematic py-12">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading product...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24">
        <div className="container-cinematic py-12">
          <div className="card-glass text-center py-16">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
            <p className="text-gray-500 mb-6">
              The product you're looking for doesn't exist or has been removed.
            </p>
            <button onClick={() => navigate('/catalog')} className="btn-primary">
              Browse Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      {/* Breadcrumb */}
      <div className="bg-white/30">
        <div className="container-cinematic py-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gold transition-colors flex items-center gap-2 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Catalog
          </button>
        </div>
      </div>

      <div className="container-cinematic py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            {/* Main Image */}
            <div className="relative aspect-square rounded-premium-lg overflow-hidden bg-white mb-4">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <TypeIcon className="w-32 h-32 text-gray-300" />
                </div>
              )}

              {/* Type Badge */}
              {product.type !== 'product' && (
                <div className="absolute top-4 left-4 badge-premium flex items-center gap-1">
                  <TypeIcon className="w-3 h-3" />
                  <span>{product.type.toUpperCase()}</span>
                </div>
              )}

              {/* Warm glow for handmade */}
              {product.type === 'handmade' && (
                <div className="absolute inset-0 bg-gradient-to-t from-gold/10 via-transparent to-transparent pointer-events-none" />
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`rounded-premium-sm overflow-hidden border-2 transition-all duration-300 ${
                      selectedImage === index
                        ? 'border-gold shadow-cinematic-gold'
                        : 'border-gray-200 hover:border-white/30'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-20 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            {/* Title */}
            <h1 className="heading-section text-gray-900 mb-4">{product.title}</h1>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center mb-6">
                <div className="flex text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${i < Math.round(product.rating) ? 'fill-current' : ''}`}
                    />
                  ))}
                </div>
                <span className="text-gray-500 ml-3">({product.reviewCount} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="mb-8">
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-gold">{formatPrice(product.price)}</span>
                <span className="text-gray-400">VAT included</span>
              </div>
              {product.priceExVat && (
                <p className="text-sm text-gray-400 mt-2">
                  Ex VAT: {formatPrice(product.priceExVat)} | VAT ({product.vatRate * 100}%):{' '}
                  {formatPrice(product.price - product.priceExVat)}
                </p>
              )}
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.stockStatus === 'in_stock' ? (
                <span className="badge-stock flex items-center gap-2 w-fit">
                  <span className="h-2 w-2 bg-emerald-400 rounded-full"></span>
                  In Stock ({product.stockQuantity} available)
                </span>
              ) : product.stockStatus === 'low_stock' ? (
                <span className="badge-low-stock flex items-center gap-2 w-fit">
                  <span className="h-2 w-2 bg-amber-400 rounded-full"></span>
                  Low Stock (Only {product.stockQuantity} left)
                </span>
              ) : (
                <span className="badge-out-stock flex items-center gap-2 w-fit">
                  <span className="h-2 w-2 bg-red-400 rounded-full"></span>
                  Out of Stock
                </span>
              )}
            </div>

            {/* Condition */}
            <div className="mb-6">
              <span className="text-gray-400">Condition: </span>
              <span className="font-medium text-gray-900 capitalize">{product.condition}</span>
            </div>

            {/* Wholesale / Bulk structured details */}
            {(product.type === 'wholesale' || product.type === 'lot') && product.specifications && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
                  {product.type === 'wholesale' ? 'Wholesale Details' : 'Bulk Lot Details'}
                </h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {product.specifications.moq && (
                    <>
                      <dt className="text-gray-400">Min. Order Qty</dt>
                      <dd className="text-gray-900 font-semibold">{product.specifications.moq} units</dd>
                    </>
                  )}
                  {product.specifications.lotQuantity && (
                    <>
                      <dt className="text-gray-400">
                        {product.type === 'wholesale' ? 'Units in Lot' : 'Items in Lot'}
                      </dt>
                      <dd className="text-gray-900 font-semibold">{product.specifications.lotQuantity}</dd>
                    </>
                  )}
                  {product.specifications.moq && (
                    <>
                      <dt className="text-gray-400">Price per Unit</dt>
                      <dd className="text-gray-900 font-semibold">
                        {(() => {
                          const moqNum = parseInt(product.specifications.moq, 10);
                          return moqNum > 0
                            ? `£${(product.price / moqNum).toFixed(2)}`
                            : '—';
                        })()}
                      </dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {/* Pallet details */}
            {product.type === 'pallet' && product.palletInfo && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Pallet Details</h3>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {product.palletInfo.palletCount > 0 && (
                    <>
                      <dt className="text-gray-400">Number of Pallets</dt>
                      <dd className="text-gray-900 font-semibold">{product.palletInfo.palletCount}</dd>
                    </>
                  )}
                  {product.palletInfo.itemsPerPallet > 0 && (
                    <>
                      <dt className="text-gray-400">Items per Pallet</dt>
                      <dd className="text-gray-900 font-semibold">{product.palletInfo.itemsPerPallet}</dd>
                    </>
                  )}
                  {product.palletInfo.palletType && (
                    <>
                      <dt className="text-gray-400">Pallet Type</dt>
                      <dd className="text-white font-semibold capitalize">{product.palletInfo.palletType}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {/* Quantity Selector — retail products only */}
            {product.stockQuantity > 0 && !isBulkProduct && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-500 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="btn-glass w-12 h-12 flex items-center justify-center text-xl"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={product.stockQuantity}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        Math.max(1, Math.min(product.stockQuantity, parseInt(e.target.value) || 1))
                      )
                    }
                    className="input-field w-20 text-center"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                    className="btn-glass w-12 h-12 flex items-center justify-center text-xl"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 mb-4">
              {isBulkProduct ? (
                /* Bulk / pallet / wholesale — no normal checkout, go straight to transport quote */
                <Link
                  to={buildTransportQuoteUrl(product)}
                  className="btn-primary flex-1 flex items-center justify-center gap-3"
                >
                  <Truck className="h-5 w-5" />
                  Request Transport Quote
                </Link>
              ) : (
                /* Retail — normal Add to Cart flow */
                <button
                  onClick={handleAddToCart}
                  disabled={product.stockQuantity === 0}
                  className="btn-primary flex-1 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>{product.stockQuantity > 0 ? 'Add to Cart' : 'Out of Stock'}</span>
                </button>
              )}
              <button
                onClick={async () => {
                  if (product) {
                    const added = await toggleWishlist(product.id);
                    if (added !== null) {
                      alert(added ? 'Added to wishlist!' : 'Removed from wishlist!');
                    }
                  }
                }}
                disabled={wishlistLoading}
                className={`btn-glass p-4 transition-all ${
                  isInWishlist ? 'border-gold/50 bg-gold/10' : ''
                }`}
                title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-6 w-6 ${isInWishlist ? 'fill-gold text-gold' : ''}`} />
              </button>
              <button className="btn-glass p-4">
                <Share2 className="h-6 w-6" />
              </button>
            </div>

            {/* RFQ Button — retail / wholesale buyers only */}
            {!isBulkProduct && (
              <Link
                to={`/rfq?product=${encodeURIComponent(product.title)}`}
                className="btn-secondary w-full mb-8 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Request Wholesale Quote
              </Link>
            )}

            {/* Seller Info Panel */}
            <div className="card-glass mb-8">
              <SellerPerformance sellerId={product.sellerId} compact={false} />
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-2">
                {(product as Product & { storeSlug?: string }).storeSlug && (
                  <Link
                    to={`/seller/${(product as Product & { storeSlug?: string }).storeSlug}`}
                    className="btn-glass w-full py-3 flex items-center justify-center gap-2"
                  >
                    <Store className="w-5 h-5" />
                    View Seller Store
                  </Link>
                )}
                <Link
                  to={user
                    ? `/messages?sellerId=${product.sellerId}&productId=${product.id}`
                    : `/login?redirect=${encodeURIComponent(`/messages?sellerId=${product.sellerId}&productId=${product.id}`)}`}
                  className="btn-glass w-full py-3 flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Contact Seller
                </Link>
              </div>
            </div>

            {/* Seller Information — Legal Notice */}
            {(() => {
              const productWithStore = product as Product & { storeSlug?: string; storeName?: string };
              return (
                <div className="card-glass mb-8 border border-gray-200">
                  <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Store className="w-4 h-4 text-gold" />
                    Seller Information
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    This product is sold and shipped directly by the seller listed above.
                  </p>
                  <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                    Loadify Market operates as an online marketplace platform connecting buyers with
                    independent sellers. The seller is responsible for product availability, packaging,
                    shipping, delivery, returns, and customer service related to this product.
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-400">Sold by:</span>
                    {productWithStore.storeSlug ? (
                      <Link
                        to={`/seller/${productWithStore.storeSlug}`}
                        className="text-gold hover:text-gold/80 font-medium transition-colors"
                      >
                        {productWithStore.storeName || 'View Seller Store'}
                      </Link>
                    ) : (
                      <span className="text-gray-600 font-medium">{productWithStore.storeName || 'Marketplace Seller'}</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4">
              <div className="card-glass text-center py-4">
                <Shield className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xs text-gray-500">Secure Marketplace Checkout</p>
              </div>
              <div className="card-glass text-center py-4">
                <Zap className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xs text-gray-500">Seller Fulfilled Shipping</p>
              </div>
              <div className="card-glass text-center py-4">
                <Truck className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="text-xs text-gray-500">Verified Marketplace Sellers</p>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="card-glass mt-6 border border-gray-100">
              <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-gold" />
                Delivery Options
              </h3>

              {shippingOptions.length > 0 ? (
                <>
                  <div className="space-y-2 mb-4">
                    {shippingOptions.map((opt) => {
                      const method = opt.shipping_methods;
                      if (!method) return null;
                      const rate = method.shipping_rates?.[0];
                      const price = rate && rate.price > 0
                        ? formatPrice(Number(rate.price))
                        : 'Free';
                      return (
                        <div
                          key={opt.id}
                          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gold flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{method.name}</p>
                              {method.courier && (
                                <p className="text-xs text-gray-400">{method.courier}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-gold">{price}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dispatch time — use first option's value */}
                  {shippingOptions[0]?.dispatch_time && (
                    <p className="text-xs text-gray-400 mb-4">
                      Dispatch time: {shippingOptions[0].dispatch_time}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Delivery</span>
                    <span className="text-gray-700 font-medium">Royal Mail Tracked Delivery</span>
                  </div>
                </div>
              )}

              {/* XDrive Transport Quote link — bulk / pallet / wholesale / logistics only */}
              {isBulkProduct && (
                <>
                  {product.palletInfo && (
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="text-gray-400">Pallet count</span>
                      <span className="text-gray-700 font-medium">{product.palletInfo.palletCount}</span>
                    </div>
                  )}
                  <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                    Transport support is available via XDrive Logistics for pallet and bulk orders.
                  </p>
                  <Link
                    to={buildTransportQuoteUrl(product)}
                    className="btn-secondary w-full py-3 flex items-center justify-center gap-2 text-sm"
                  >
                    <Truck className="w-4 h-4" />
                    Request Transport Quote
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pallet Info */}
        {product.type === 'pallet' && product.palletInfo && (
          <div className="mt-12">
            <div className="card-glass glass-gold">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-6 h-6 text-gold" />
                Pallet Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-gray-400 text-sm">Pallet Count</p>
                  <p className="text-2xl font-bold text-gray-900">{product.palletInfo.palletCount}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Items per Pallet</p>
                  <p className="text-2xl font-bold text-gray-900">{product.palletInfo.itemsPerPallet}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Pallet Type</p>
                  <p className="text-2xl font-bold text-white capitalize">
                    {product.palletInfo.palletType}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mt-12">
          <div className="card-glass">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Description</h2>
            <div className="prose prose-invert max-w-full">
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        {product.dimensions && (
          <div className="mt-8">
            <div className="card-glass">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Dimensions</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Length</p>
                  <p className="text-lg font-bold text-gray-900">{product.dimensions.length} cm</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Width</p>
                  <p className="text-lg font-bold text-gray-900">{product.dimensions.width} cm</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Height</p>
                  <p className="text-lg font-bold text-gray-900">{product.dimensions.height} cm</p>
                </div>
                {product.weight && (
                  <div>
                    <p className="text-gray-400 text-sm">Weight</p>
                    <p className="text-lg font-bold text-gray-900">{product.weight} kg</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Specifications */}
        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div className="mt-8">
            <div className="card-glass">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Specifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex border-b border-gray-200 pb-3">
                    <span className="text-gray-400 w-1/2">{key}</span>
                    <span className="text-gray-900 w-1/2">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Frequently Bought Together */}
        <FrequentlyBoughtTogether productId={product.id} currentProduct={product} />

        {/* Product Q&A Section */}
        <div className="mt-12">
          <div className="card-glass">
            <ProductQA productId={product.id} sellerId={product.sellerId} />
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="card-glass">
            <ProductReviews 
              productId={product.id} 
              averageRating={product.rating}
              totalReviews={product.reviewCount}
            />
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts currentProduct={product} maxProducts={6} />
      </div>
    </div>
  );
}
