import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store';
import { CartProvider } from './contexts/CartContext';

// Layout
import Layout from './components/Layout';
import RequireAuth from './components/auth/RequireAuth';
import RequireAdmin from './components/auth/RequireAdmin';
import RequireSeller from './components/auth/RequireSeller';

// ─── Pixel-perfect pages — standalone (include own Navbar + Footer) ───────────
const PixelPerfectIndex    = lazy(() => import('./pages/pixel-perfect/Index'));
const PPCatalog            = lazy(() => import('./pages/pixel-perfect/Catalog'));
const PPProductDetail      = lazy(() => import('./pages/pixel-perfect/ProductDetail'));
const PPCart               = lazy(() => import('./pages/pixel-perfect/Cart'));
const PPCheckout           = lazy(() => import('./pages/pixel-perfect/Checkout'));
const PPAboutUs            = lazy(() => import('./pages/pixel-perfect/AboutUs'));
const PPContactUs          = lazy(() => import('./pages/pixel-perfect/ContactUs'));
const PPDeals              = lazy(() => import('./pages/pixel-perfect/Deals'));
const PPTerms              = lazy(() => import('./pages/pixel-perfect/TermsAndConditions'));
const PPPrivacy            = lazy(() => import('./pages/pixel-perfect/PrivacyPolicy'));
const PPCookies            = lazy(() => import('./pages/pixel-perfect/CookiePolicy'));
const PPReturnsPolicy      = lazy(() => import('./pages/pixel-perfect/ReturnsPolicy'));
const PPShippingPolicy     = lazy(() => import('./pages/pixel-perfect/ShippingPolicy'));
const PPBuyerTerms         = lazy(() => import('./pages/pixel-perfect/BuyerTerms'));
const PPSellerTerms        = lazy(() => import('./pages/pixel-perfect/SellerTerms'));
const PPDisclaimer         = lazy(() => import('./pages/pixel-perfect/Disclaimer'));

// ─── Pixel-perfect auth pages — standalone (full-page designs, no Layout) ────
const PPLogin              = lazy(() => import('./pages/pixel-perfect/Login'));
const PPSignup             = lazy(() => import('./pages/pixel-perfect/Signup'));
const PPForgotPassword     = lazy(() => import('./pages/pixel-perfect/ForgotPassword'));
const PPResetPassword      = lazy(() => import('./pages/pixel-perfect/ResetPassword'));

// Public pages — lazy-loaded to keep the initial JS bundle small
const HomePage = lazy(() => import('./pages/HomePage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const SellPage = lazy(() => import('./pages/SellPage'));

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
const SellerRFQPage = lazy(() => import('./pages/SellerRFQPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const CategoryManagementPage = lazy(() => import('./pages/CategoryManagementPage'));
const SellerApprovalsPage = lazy(() => import('./pages/SellerApprovalsPage'));
const AdminSellerDetailPage = lazy(() => import('./pages/AdminSellerDetailPage'));
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
const AcceptableUsePolicyPage = lazy(() => import('./pages/legal/AcceptableUsePolicyPage'));
const DisclaimerPage = lazy(() => import('./pages/legal/DisclaimerPage'));
const BuyerTermsPage = lazy(() => import('./pages/legal/BuyerTermsPage'));
const SellerTermsPage = lazy(() => import('./pages/legal/SellerTermsPage'));
const SellerGuidelinesPage = lazy(() => import('./pages/SellerGuidelinesPage'));
const VerifiedSellersPage = lazy(() => import('./pages/VerifiedSellersPage'));
const LogisticsLoadsPage = lazy(() => import('./pages/LogisticsLoadsPage'));
const TransportQuotePage = lazy(() => import('./pages/TransportQuotePage'));
const RFQPage = lazy(() => import('./pages/RFQPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'));
const DealsPage = lazy(() => import('./pages/DealsPage'));

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

/** Redirects /categories/:slug → /shop?category=:slug */
function CategoryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/shop?category=${slug ?? ''}`} replace />;
}

function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Build a minimal User object from Supabase auth session metadata when the
    // public.users table query fails or returns no row (e.g. the live database
    // hasn't had the 20_fix_users_table.sql migration applied yet).
    function userFromSession(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): import('./types').User {
      const meta = authUser.user_metadata || {};
      const strVal = (key: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : undefined);
      return {
        id: authUser.id,
        email: authUser.email ?? '',
        role: (strVal('role') as import('./types').UserRole) || 'buyer',
        firstName: strVal('first_name'),
        lastName: strVal('last_name'),
        isEmailVerified: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Fetch user profile with role
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (data) {
              setUser(data);
            } else {
              if (error) {
                // Table missing or row not found — still treat as logged in
                // using auth session metadata so the user isn't stuck logged-out.
                console.warn('users table query failed, falling back to auth session:', error.message);
                setUser(userFromSession(session.user));
              } else {
                setLoading(false);
              }
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
          .then(({ data, error }) => {
            if (data) {
              setUser(data);
            } else {
              if (error) {
                console.warn('users table query failed, falling back to auth session:', error.message);
                setUser(userFromSession(session.user));
              } else {
                setUser(null);
              }
            }
          });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <CartProvider>
      <Routes>
        {/* ── Pixel-perfect standalone pages (own Navbar + Footer) ─────────────── */}
        <Route path="/" element={<Suspense fallback={<PageLoader />}><PixelPerfectIndex /></Suspense>} />
        <Route path="catalog" element={<Suspense fallback={<PageLoader />}><PPCatalog /></Suspense>} />
        <Route path="product/:id" element={<Suspense fallback={<PageLoader />}><PPProductDetail /></Suspense>} />
        <Route path="cart" element={<Suspense fallback={<PageLoader />}><PPCart /></Suspense>} />
        <Route path="checkout" element={<Suspense fallback={<PageLoader />}><PPCheckout /></Suspense>} />
        <Route path="about" element={<Suspense fallback={<PageLoader />}><PPAboutUs /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<PageLoader />}><PPContactUs /></Suspense>} />
        <Route path="deals" element={<Suspense fallback={<PageLoader />}><PPDeals /></Suspense>} />
        <Route path="terms" element={<Suspense fallback={<PageLoader />}><PPTerms /></Suspense>} />
        <Route path="privacy" element={<Suspense fallback={<PageLoader />}><PPPrivacy /></Suspense>} />
        <Route path="cookies" element={<Suspense fallback={<PageLoader />}><PPCookies /></Suspense>} />
        <Route path="returns-policy" element={<Suspense fallback={<PageLoader />}><PPReturnsPolicy /></Suspense>} />
        <Route path="shipping-policy" element={<Suspense fallback={<PageLoader />}><PPShippingPolicy /></Suspense>} />
        <Route path="buyer-terms" element={<Suspense fallback={<PageLoader />}><PPBuyerTerms /></Suspense>} />
        <Route path="seller-terms" element={<Suspense fallback={<PageLoader />}><PPSellerTerms /></Suspense>} />
        <Route path="disclaimer" element={<Suspense fallback={<PageLoader />}><PPDisclaimer /></Suspense>} />

        {/* ── Pixel-perfect auth pages (standalone full-page designs) ──────────── */}
        <Route path="login" element={<Suspense fallback={<PageLoader />}><PPLogin /></Suspense>} />
        <Route path="register" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="signup" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="forgot-password" element={<Suspense fallback={<PageLoader />}><PPForgotPassword /></Suspense>} />
        <Route path="reset-password" element={<Suspense fallback={<PageLoader />}><PPResetPassword /></Suspense>} />

        {/* ── All other routes wrapped in shared Layout (Header + Footer) ───────── */}
        <Route element={<Layout />}> 
            <Route path="shop" element={<Suspense fallback={<PageLoader />}><ShopPage /></Suspense>} />
            <Route path="bulk" element={<Navigate to="/category/wholesale" replace />} />
            <Route path="category/:slug" element={<Suspense fallback={<PageLoader />}><CategoryPage /></Suspense>} />
            <Route path="sell" element={<Suspense fallback={<PageLoader />}><SellPage /></Suspense>} />

            {/* Order Success — Stripe redirects here after payment */}
            <Route path="orders/success" element={
              <Suspense fallback={<PageLoader />}> 
                <OrderSuccessPage />
              </Suspense>
            } />

            {/* Protected: Dashboard */}
            <Route path="dashboard" element={
              <RequireAuth>
                <Suspense fallback={<PageLoader />}> 
                  <DashboardPage />
                </Suspense>
              </RequireAuth>
            } />
            {/* Protected: Account Settings */}
            <Route path="account-settings" element={
              <RequireAuth>
                <Suspense fallback={<PageLoader />}> 
                  <AccountSettingsPage />
                </Suspense>
              </RequireAuth>
            } />
            {/* Protected: Seller Dashboard */}
            <Route path="seller" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <SellerDashboardPage />
                </Suspense>
              </RequireSeller>
            } />
            {/* Protected: Seller Profile */}
            <Route path="seller/profile" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <SellerProfilePage />
                </Suspense>
              </RequireSeller>
            } />
            {/* Public: Seller Public Profile */}
            <Route path="seller/:slug" element={
              <Suspense fallback={<PageLoader />}> 
                <SellerPublicProfilePage />
              </Suspense>
            } />
            {/* Protected: Seller Returns */}
            <Route path="seller/returns" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <SellerReturnsPage />
                </Suspense>
              </RequireSeller>
            } />
            {/* Protected: Seller Shipments */}
            <Route path="seller/shipments" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <SellerShipmentsPage />
                </Suspense>
              </RequireSeller>
            } />
            {/* Protected: Create Product */}
            <Route path="seller/products/new" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <ProductFormPage />
                </Suspense>
              </RequireSeller>
            } />
            {/* Protected: Edit Product */}
            <Route path="seller/products/:id/edit" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <ProductFormPage />
                </Suspense>
              </RequireSeller>
            } />
            {/* Protected: Admin Dashboard */}
            <Route path="admin" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <AdminDashboardPage />
                </Suspense>
              </RequireAdmin>
            } />
            {/* Protected: Admin Categories */}
            <Route path="admin/categories" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <CategoryManagementPage />
                </Suspense>
              </RequireAdmin>
            } />
            {/* Protected: Admin Sellers */}
            <Route path="admin/sellers" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <SellerApprovalsPage />
                </Suspense>
              </RequireAdmin>
            } />
            {/* Protected: Admin Seller Detail */}
            <Route path="admin/sellers/:id" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <AdminSellerDetailPage />
                </Suspense>
              </RequireAdmin>
            } />
            {/* Protected: Admin Reported Listings */}
            <Route path="admin/reported-listings" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <ReportedListingsPage />
                </Suspense>
              </RequireAdmin>
            } />
            {/* Protected: Admin Shipments */}
            <Route path="admin/shipments" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <AdminShipmentsPage />
                </Suspense>
              </RequireAdmin>
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
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <SellerReviewsPage />
                </Suspense>
              </RequireSeller>
            } />

            {/* Protected: Seller RFQ Inbox */}
            <Route path="seller/rfq" element={
              <RequireSeller>
                <Suspense fallback={<PageLoader />}> 
                  <SellerRFQPage />
                </Suspense>
              </RequireSeller>
            } />

            {/* Protected: Admin Reviews Moderation */}
            <Route path="admin/reviews" element={
              <RequireAdmin>
                <Suspense fallback={<PageLoader />}> 
                  <AdminReviewsPage />
                </Suspense>
              </RequireAdmin>
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
            
            {/* Legal Pages still in Layout (acceptable-use only — rest handled by pixel-perfect above) */}
            <Route path="acceptable-use-policy" element={
              <Suspense fallback={<PageLoader />}> 
                <AcceptableUsePolicyPage />
              </Suspense>
            } />
            <Route path="seller-guidelines" element={
              <Suspense fallback={<PageLoader />}> 
                <SellerGuidelinesPage />
              </Suspense>
            } />
            <Route path="verified-sellers" element={
              <Suspense fallback={<PageLoader />}> 
                <VerifiedSellersPage />
              </Suspense>
            } />

            {/* Route aliases for expected URLs */}
            <Route path="admin/reported" element={<Navigate to="/admin/reported-listings" replace />} />
            <Route path="seller-register" element={<Navigate to="/register?type=seller" replace />} />
            <Route path="seller-dashboard" element={<Navigate to="/seller" replace />} />
            <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />

            {/* Public: Category pages — redirect to Shop filtered by category slug */}
            <Route path="categories/:slug" element={<CategoryRedirect />} />

            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFoundPage /></Suspense>} />
          </Route>
      </Routes>
    </CartProvider>
  );
}

export default App;