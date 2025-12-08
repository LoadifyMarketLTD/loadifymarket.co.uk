import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store';

// Layout
import Layout from './components/Layout';

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
const SellerReturnsPage = lazy(() => import('./pages/SellerReturnsPage'));
const SellerShipmentsPage = lazy(() => import('./pages/SellerShipmentsPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const CategoryManagementPage = lazy(() => import('./pages/CategoryManagementPage'));
const SellerApprovalsPage = lazy(() => import('./pages/SellerApprovalsPage'));
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
const TermsPage = lazy(() => import('./pages/legal/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/legal/PrivacyPage'));
const CookiePage = lazy(() => import('./pages/legal/CookiePage'));
const ReturnsPolicy = lazy(() => import('./pages/legal/ReturnsPolicyPage'));
const ShippingPolicy = lazy(() => import('./pages/legal/ShippingPolicyPage'));

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
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          
          {/* Lazy loaded routes with Suspense */}
          <Route path="cart" element={
            <Suspense fallback={<PageLoader />}>
              <CartPage />
            </Suspense>
          } />
          <Route path="checkout" element={
            <Suspense fallback={<PageLoader />}>
              <CheckoutPage />
            </Suspense>
          } />
          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}>
              <DashboardPage />
            </Suspense>
          } />
          <Route path="seller" element={
            <Suspense fallback={<PageLoader />}>
              <SellerDashboardPage />
            </Suspense>
          } />
          <Route path="seller/profile" element={
            <Suspense fallback={<PageLoader />}>
              <SellerProfilePage />
            </Suspense>
          } />
          <Route path="seller/returns" element={
            <Suspense fallback={<PageLoader />}>
              <SellerReturnsPage />
            </Suspense>
          } />
          <Route path="seller/shipments" element={
            <Suspense fallback={<PageLoader />}>
              <SellerShipmentsPage />
            </Suspense>
          } />
          <Route path="seller/products/new" element={
            <Suspense fallback={<PageLoader />}>
              <ProductFormPage />
            </Suspense>
          } />
          <Route path="seller/products/:id/edit" element={
            <Suspense fallback={<PageLoader />}>
              <ProductFormPage />
            </Suspense>
          } />
          <Route path="admin" element={
            <Suspense fallback={<PageLoader />}>
              <AdminDashboardPage />
            </Suspense>
          } />
          <Route path="admin/categories" element={
            <Suspense fallback={<PageLoader />}>
              <CategoryManagementPage />
            </Suspense>
          } />
          <Route path="admin/sellers" element={
            <Suspense fallback={<PageLoader />}>
              <SellerApprovalsPage />
            </Suspense>
          } />
          <Route path="admin/shipments" element={
            <Suspense fallback={<PageLoader />}>
              <AdminShipmentsPage />
            </Suspense>
          } />
          <Route path="orders" element={
            <Suspense fallback={<PageLoader />}>
              <OrdersPage />
            </Suspense>
          } />
          <Route path="orders/:id" element={
            <Suspense fallback={<PageLoader />}>
              <OrderDetailPage />
            </Suspense>
          } />
          <Route path="tracking/:orderNumber" element={
            <Suspense fallback={<PageLoader />}>
              <TrackingPage />
            </Suspense>
          } />
          <Route path="track-order" element={
            <Suspense fallback={<PageLoader />}>
              <TrackOrderPage />
            </Suspense>
          } />
          <Route path="returns" element={
            <Suspense fallback={<PageLoader />}>
              <ReturnsPage />
            </Suspense>
          } />
          <Route path="disputes" element={
            <Suspense fallback={<PageLoader />}>
              <DisputesPage />
            </Suspense>
          } />
          <Route path="wishlist" element={
            <Suspense fallback={<PageLoader />}>
              <WishlistPage />
            </Suspense>
          } />
          <Route path="messages" element={
            <Suspense fallback={<PageLoader />}>
              <MessagesPage />
            </Suspense>
          } />
          <Route path="notifications" element={
            <Suspense fallback={<PageLoader />}>
              <NotificationSettingsPage />
            </Suspense>
          } />
          <Route path="help" element={
            <Suspense fallback={<PageLoader />}>
              <HelpPage />
            </Suspense>
          } />
          <Route path="contact" element={
            <Suspense fallback={<PageLoader />}>
              <ContactPage />
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
    </Router>
  );
}

export default App;
