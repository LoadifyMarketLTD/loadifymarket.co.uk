import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { SellerProfile, SellerStore } from '../types';
import { Store, Package, MapPin, Mail, Phone, MessageCircle, ArrowRight, Calendar, Settings } from 'lucide-react';
import VerificationBadge from '../components/VerificationBadge';
import RoleBadge from '../components/RoleBadge';
import PaymentBehaviourBadge from '../components/PaymentBehaviourBadge';
import ProductCard from '@/components/catalog/ProductCard';
import { adaptProducts } from '@/lib/productAdapter';
import type { DBProduct } from '@/lib/productAdapter';
import type { Product as CatalogProduct } from '@/components/catalog/ProductCard';
import BreadcrumbNav from '../components/BreadcrumbNav';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../store';

interface SellerData extends SellerProfile {
  createdAt?: string;
  store?: SellerStore;
}

export default function SellerPublicProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerProfile = async () => {
      if (!slug) return;

      try {
        setLoading(true);

        // Step 1: Get the store to find the userId
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

        // Step 2: Fetch seller profile from seller_profiles_public
        const { data: profileData, error: profileError } = await supabase
          .from('seller_profiles_public')
          .select('*')
          .eq('userId', storeData.userId)
          .single();

        if (profileError) throw profileError;

        // Combine store and profile data
        const combinedData: SellerData = {
          ...profileData,
          store: storeData,
        };

        setSeller(combinedData);

        // Step 3: Fetch active products with category joins
        const { data: rawProducts, error: productsError } = await supabase
          .from('products')
          .select('*, category:categories!categoryId(name, slug), subcategory:categories!subcategoryId(name, slug)')
          .eq('sellerId', storeData.userId)
          .eq('isActive', true)
          .eq('isApproved', true)
          .order('createdAt', { ascending: false })
          .limit(12);

        if (productsError) throw productsError;

        // Step 4: Merge seller info and adapt to UI shape
        const merged = (rawProducts ?? []).map((product) => ({
          ...product,
          seller: {
            businessName: profileData.businessName,
            isApproved: profileData.isApproved,
            rating: profileData.rating,
            userId: profileData.userId,
          },
        }));

        setProducts(adaptProducts(merged as unknown as DBProduct[]));
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
      <div className="bg-[#F8F9FA] min-h-screen flex flex-col">
        <Header forceOpaque />
        <div className="flex-1 pt-16 lg:pt-[104px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading seller profile...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen flex flex-col">
        <Header forceOpaque />
        <main className="flex-1 pt-16 lg:pt-[104px]">
          <div className="container-cinematic py-12">
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-16">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller not found</h2>
              <p className="text-gray-500 mb-6">The seller profile you're looking for doesn't exist.</p>
              <Link to="/catalog" className="btn-primary">
                Browse Products
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col">
      <Header forceOpaque />
      <main className="flex-1 pt-16 lg:pt-[104px]">
      {/* Breadcrumb */}
      <div className="container-cinematic py-4">
        <BreadcrumbNav
          items={[
            { label: "Home", to: "/" },
            { label: "Catalog", to: "/catalog" },
            { label: seller.businessName || seller.store?.storeName || "Seller" },
          ]}
          showBack={true}
          backLabel="Back to Catalog"
          backTo="/catalog"
        />
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
        <div className="bg-white border border-gray-200 rounded-xl p-6">
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
                <div className="w-24 h-24 rounded-premium-sm bg-white flex items-center justify-center">
                  <Store className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            {/* Business Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {seller.businessName || seller.store?.storeName || 'Seller'}
                </h1>
                <VerificationBadge isVerified={seller.isApproved} size="md" />
                {seller.marketplaceRole && <RoleBadge role={seller.marketplaceRole} size="md" />}
              </div>

              {seller.store?.storeDescription && (
                <p className="text-gray-600 mb-4 max-w-2xl">{seller.store.storeDescription}</p>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
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
                {seller.isApproved && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>Active Seller</span>
                  </div>
                )}
              </div>

              {/* Payment Behaviour */}
              {seller.paymentBehaviour && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Reliability</h3>
                  <PaymentBehaviourBadge behaviour={seller.paymentBehaviour} size="md" />
                  <p className="text-xs text-gray-400 mt-2">
                    Information only. Not a payment guarantee.
                  </p>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-200 mb-5">
                <div>
                  <p className="text-2xl font-bold text-gold">{(seller.rating || 0).toFixed(1)}</p>
                  <p className="text-xs text-gray-500">Seller Rating</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{seller.totalSales || 0}</p>
                  <p className="text-xs text-gray-500">Total Sales</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gold">{products.length}</p>
                  <p className="text-xs text-gray-500">Active Listings</p>
                </div>
                {seller.createdAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gold" />
                      Member since {formatDistanceToNow(new Date(seller.createdAt), { addSuffix: false })}
                    </p>
                    <p className="text-xs text-gray-500">Joined</p>
                  </div>
                )}
              </div>

              {/* Seller CTAs */}
              <div className="flex flex-wrap gap-3">
                {user?.id === seller.userId ? (
                  <>
                    <Link
                      to="/pp/seller/profile"
                      className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      Edit Store Profile
                    </Link>
                    <Link
                      to="/pp/seller/products"
                      className="btn-glass inline-flex items-center gap-2 text-sm"
                    >
                      <Package className="w-4 h-4" />
                      Manage Listings
                    </Link>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Listings */}
      <div className="container-cinematic pb-12">
        <div className="flex items-center gap-3 mb-6">
          <Package className="w-6 h-6 text-gold" />
          <h2 className="text-2xl font-bold text-gray-900">Active Listings</h2>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">This seller has no active listings at the moment.</p>
          </div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
}
