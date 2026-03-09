import { Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store';

// Layout
import Layout from './components/Layout';
import RequireAuth from './components/auth/RequireAuth';

// Critical pages loaded immediately
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy load heavy/secondary pages
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SellerDashboardPage = lazy(() => import('./pages/SellerDashboardPage'));
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage'));
const SellerPublicProfilePage = lazy(() => import('./pages/SellerPublicProfilePage'));
const SellerReturnsPage = lazy(() => import('./pages/SellerReturnsPage'));
const SellerShipmentsPage = lazy(() => import('./pages/SellerShipmentsPage'));
const SellerReviewsPage = lazy(() => import('./pages/SellerReviewsPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const CategoryManagementPage = lazy(() => import('./pages/CategoryManagementPage'));
const SellerApprovalsPage = lazy(() => import('./pages/SellerApprovalsPage'));
const ReportedListingsPage = lazy(() => import('./pages/ReportedListingsPage'));
const AdminShipmentsPage = lazy(() => import('./pages/AdminShipmentsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'));
const DisputesPage = lazy(() => import('./pages/DisputesPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const HelpPage = lazy(() => import('./pages/HelpPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const BuyerProtectionPage = lazy(() => import('./pages/BuyerProtectionPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiePage = lazy(() => import('./pages/legal/CookiePage'));
const ReturnsPolicy = lazy(() => import('./pages/legal/ReturnsPolicyPage'));
const ShippingPolicy = lazy(() => import('./pages/legal/ShippingPolicyPage'));
const LogisticsLoadsPage = lazy(() => import('./pages/LogisticsLoadsPage'));
const TransportQuotePage = lazy(() => import('./pages/TransportQuotePage'));
const RFQPage = lazy(() => import('./pages/RFQPage'));

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile with role
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser(data);
            } else {
              setLoading(false);
            }
          });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUser(data);
            }
          });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          {/* Marketplace routes: /shop = B2C products, /bulk = B2B wholesale/pallets */}
          <Route path="shop" element={<CatalogPage />} />
          <Route path="bulk" element={<CatalogPage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          
          {/* Lazy loaded routes with Suspense */}
          {/* Protected: Cart */}
          <Route path="cart" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <CartPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Checkout */}
          <Route path="checkout" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <CheckoutPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Dashboard */}
          <Route path="dashboard" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Seller Dashboard */}
          <Route path="seller" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <SellerDashboardPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Seller Profile */}
          <Route path="seller/profile" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <SellerProfilePage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Public: Seller Public Profile */}
          <Route path="seller/:slug" element={
            <Suspense fallback={<PageLoader />}>
              <SellerPublicProfilePage />
            </Suspense>
          } />
          {/* Protected: Seller Returns */}
          <Route path="seller/returns" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <SellerReturnsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Seller Shipments */}
          <Route path="seller/shipments" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <SellerShipmentsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Create Product */}
          <Route path="seller/products/new" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <ProductFormPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Edit Product */}
          <Route path="seller/products/:id/edit" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <ProductFormPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Admin Dashboard */}
          <Route path="admin" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <AdminDashboardPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Admin Categories */}
          <Route path="admin/categories" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <CategoryManagementPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Admin Sellers */}
          <Route path="admin/sellers" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <SellerApprovalsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Admin Reported Listings */}
          <Route path="admin/reported-listings" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <ReportedListingsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Admin Shipments */}
          <Route path="admin/shipments" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <AdminShipmentsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Orders */}
          <Route path="orders" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <OrdersPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Order Detail */}
          <Route path="orders/:id" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <OrderDetailPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Public: Tracking */}
          <Route path="tracking/:orderNumber" element={
            <Suspense fallback={<PageLoader />}>
              <TrackingPage />
            </Suspense>
          } />
          {/* Public: Track Order */}
          <Route path="track-order" element={
            <Suspense fallback={<PageLoader />}>
              <TrackOrderPage />
            </Suspense>
          } />
          {/* Protected: Returns */}
          <Route path="returns" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <ReturnsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Disputes */}
          <Route path="disputes" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <DisputesPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Wishlist */}
          <Route path="wishlist" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <WishlistPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Messages */}
          <Route path="messages" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <MessagesPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Protected: Notifications */}
          <Route path="notifications" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <NotificationSettingsPage />
              </Suspense>
            </RequireAuth>
          } />
          {/* Public: Help */}
          <Route path="help" element={
            <Suspense fallback={<PageLoader />}>
              <HelpPage />
            </Suspense>
          } />
          {/* Public: Contact - Allow potential customers to reach out */}
          <Route path="contact" element={
            <Suspense fallback={<PageLoader />}>
              <ContactPage />
            </Suspense>
          } />
          
          {/* Info Pages */}
          <Route path="pricing" element={
            <Suspense fallback={<PageLoader />}>
              <PricingPage />
            </Suspense>
          } />
          <Route path="how-it-works" element={
            <Suspense fallback={<PageLoader />}>
              <HowItWorksPage />
            </Suspense>
          } />
          <Route path="about" element={
            <Suspense fallback={<PageLoader />}>
              <AboutPage />
            </Suspense>
          } />

          {/* Public: Search */}
          <Route path="search" element={
            <Suspense fallback={<PageLoader />}>
              <SearchPage />
            </Suspense>
          } />

          {/* Public: Buyer Protection */}
          <Route path="buyer-protection" element={
            <Suspense fallback={<PageLoader />}>
              <BuyerProtectionPage />
            </Suspense>
          } />

          {/* Protected: Seller Reviews */}
          <Route path="seller/reviews" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <SellerReviewsPage />
              </Suspense>
            </RequireAuth>
          } />

          {/* Protected: Admin Reviews Moderation */}
          <Route path="admin/reviews" element={
            <RequireAuth>
              <Suspense fallback={<PageLoader />}>
                <AdminReviewsPage />
              </Suspense>
            </RequireAuth>
          } />

          {/* SEO: Logistics Loads UK */}
          <Route path="logistics-loads" element={
            <Suspense fallback={<PageLoader />}>
              <LogisticsLoadsPage />
            </Suspense>
          } />

          {/* Public: Transport Quote — XDrive Logistics integration */}
          <Route path="transport-quote" element={
            <Suspense fallback={<PageLoader />}>
              <TransportQuotePage />
            </Suspense>
          } />

          {/* Public: RFQ — B2B wholesale quote requests */}
          <Route path="rfq" element={
            <Suspense fallback={<PageLoader />}>
              <RFQPage />
            </Suspense>
          } />
          
          {/* Legal Pages */}
          <Route path="terms" element={
            <Suspense fallback={<PageLoader />}>
              <TermsPage />
            </Suspense>
          } />
          <Route path="privacy" element={
            <Suspense fallback={<PageLoader />}>
              <PrivacyPage />
            </Suspense>
          } />
          <Route path="cookies" element={
            <Suspense fallback={<PageLoader />}>
              <CookiePage />
            </Suspense>
          } />
          <Route path="returns-policy" element={
            <Suspense fallback={<PageLoader />}>
              <ReturnsPolicy />
            </Suspense>
          } />
          <Route path="shipping-policy" element={
            <Suspense fallback={<PageLoader />}>
              <ShippingPolicy />
            </Suspense>
          } />
          
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
  );
}

export default App;
