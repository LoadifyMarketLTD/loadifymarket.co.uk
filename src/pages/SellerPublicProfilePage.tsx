import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Product, SellerProfile, SellerStore } from '../types';
import { Store, Package, MapPin, Mail, Phone, ArrowLeft, MessageCircle, ArrowRight, Calendar } from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';
import RoleBadge from '../components/RoleBadge';
import PaymentBehaviourBadge from '../components/PaymentBehaviourBadge';
import ProductCard from '../components/ProductCard';
import { formatDistanceToNow } from 'date-fns';

interface SellerData extends SellerProfile {
  user?: {
    email: string;
    createdAt?: string;
  };
  store?: SellerStore;
}

export default function SellerPublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerProfile = async () => {
      if (!slug) return;

      try {
        setLoading(true);

        // First, get the store to find the userId
        const { data: storeData, error: storeError } = await supabase
          .from('seller_stores')
          .select('*')
          .eq('storeSlug', slug)
          .eq('isActive', true)
          .single();

        if (storeError || !storeData) {
          console.error('Store not found:', storeError);
          setLoading(false);
          return;
        }

        // Fetch seller profile
        const { data: profileData, error: profileError } = await supabase
          .from('seller_profiles')
          .select(`
            *,
            user:users!inner(email, createdAt)
          `)
          .eq('userId', storeData.userId)
          .single();

        if (profileError) throw profileError;

        // Combine store and profile data
        const combinedData: SellerData = {
          ...profileData,
          store: storeData,
        };

        setSeller(combinedData);

        // Fetch active products from this seller
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            seller:seller_profiles(
              businessName,
              isApproved,
              rating,
              marketplaceRole,
              paymentBehaviour,
              userId
            ),
            store:seller_stores(
              storeSlug
            )
          `)
          .eq('sellerId', storeData.userId)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('createdAt', { ascending: false })
          .limit(12);

        if (productsError) throw productsError;

        // Transform data to include store slug in seller object
        const transformedProducts = productsData?.map((product) => ({
          ...product,
          seller: product.seller ? {
            ...product.seller,
            storeSlug: (product.store as { storeSlug?: string } | null)?.storeSlug,
          } : undefined,
        })) || [];

        setProducts(transformedProducts);
      } catch (error) {
        console.error('Error fetching seller profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerProfile();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-jet min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading seller profile...</p>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="bg-jet min-h-screen pt-24">
        <div className="container-cinematic py-12">
          <div className="card-glass text-center py-16">
            <Store className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Seller not found</h2>
            <p className="text-white/60 mb-6">The seller profile you're looking for doesn't exist.</p>
            <Link to="/catalog" className="btn-primary">
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jet min-h-screen pt-24">
      {/* Back Button */}
      <div className="container-cinematic py-6">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-white/60 hover:text-gold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </Link>
      </div>

      {/* Store Banner */}
      {seller.store?.storeBanner && (
        <div className="w-full h-48 md:h-64 overflow-hidden">
          <img
            src={seller.store.storeBanner}
            alt={seller.store.storeName || 'Store banner'}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Seller Profile Header */}
      <div className="container-cinematic py-8">
        <div className="card-glass">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo */}
            <div className="flex-shrink-0">
              {seller.store?.storeLogo ? (
                <img
                  src={seller.store.storeLogo}
                  alt={seller.businessName || 'Store logo'}
                  className="w-24 h-24 rounded-premium-sm object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-premium-sm bg-graphite flex items-center justify-center">
                  <Store className="w-12 h-12 text-white/40" />
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-white">
                  {seller.businessName || seller.store?.storeName || 'Seller'}
                </h1>
                <VerificationBadge isVerified={seller.isApproved} size="md" />
                {seller.marketplaceRole && <RoleBadge role={seller.marketplaceRole} size="md" />}
              </div>

              {seller.store?.storeDescription && (
                <p className="text-white/70 mb-4 max-w-2xl">{seller.store.storeDescription}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-white/60 mb-4">
                {seller.businessAddress && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {seller.businessAddress.city}, {seller.businessAddress.country}
                    </span>
                  </div>
                )}
                {seller.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span>{seller.contactPhone}</span>
                  </div>
                )}
                {seller.user?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{seller.user.email}</span>
                  </div>
                )}
              </div>

              {/* Payment Behaviour */}
              {seller.paymentBehaviour && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-white/60 mb-2">Payment Reliability</h3>
                  <PaymentBehaviourBadge behaviour={seller.paymentBehaviour} size="md" />
                  <p className="text-xs text-white/40 mt-2">
                    Information only. Not a payment guarantee.
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 pt-4 border-t border-white/10 mb-5">
                <div>
                  <p className="text-2xl font-bold text-gold">{(seller.rating || 0).toFixed(1)}</p>
                  <p className="text-xs text-white/60">Seller Rating</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{seller.totalSales || 0}</p>
                  <p className="text-xs text-white/60">Total Sales</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{products.length}</p>
                  <p className="text-xs text-white/60">Active Listings</p>
                </div>
                {seller.user?.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-white/80 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gold" />
                      Member since {formatDistanceToNow(new Date(seller.user.createdAt), { addSuffix: false })}
                    </p>
                    <p className="text-xs text-white/60">Joined</p>
                  </div>
                )}
              </div>

              {/* Seller CTAs */}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/messages"
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Contact Seller
                </Link>
                <Link
                  to={`/catalog?seller=${seller.userId}`}
                  className="btn-glass inline-flex items-center gap-2 text-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  Browse All Listings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Listings */}
      <div className="container-cinematic pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-6 h-6 text-gold" />
          <h2 className="text-2xl font-bold text-white">Active Listings</h2>
        </div>

        {products.length === 0 ? (
          <div className="card-glass text-center py-12">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">This seller has no active listings at the moment.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
