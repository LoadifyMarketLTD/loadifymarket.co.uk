import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useAuthStore } from './store';
import { CartProvider } from './contexts/CartContext';

import RequireAuth from './components/auth/RequireAuth';
import RequireAdmin from './components/auth/RequireAdmin';
import RequireSeller from './components/auth/RequireSeller';

// ─── Pixel-perfect pages — standalone (include own Navbar + Footer) ───────────
const PixelPerfectIndex    = lazy(() => import('./pages/pixel-perfect/Index'));
const PPCatalog            = lazy(() => import('./pages/pixel-perfect/Catalog'));
const PPCategoryPage       = lazy(() => import('./pages/pixel-perfect/CategoryPage'));
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
const PPFAQ                = lazy(() => import('./pages/pixel-perfect/FAQ'));
const PPCheckoutError      = lazy(() => import('./pages/pixel-perfect/CheckoutError'));
const PPNotFound           = lazy(() => import('./pages/pixel-perfect/NotFound'));

// ─── Pixel-perfect auth pages — standalone (full-page designs) ───────────────
const PPLogin              = lazy(() => import('./pages/pixel-perfect/Login'));
const PPSignup             = lazy(() => import('./pages/pixel-perfect/Signup'));
const PPForgotPassword     = lazy(() => import('./pages/pixel-perfect/ForgotPassword'));
const PPResetPassword      = lazy(() => import('./pages/pixel-perfect/ResetPassword'));

// ─── Layout wrappers (shadcn sidebar) — used for /seller, /admin, /dashboard ─
const SellerLayout = lazy(() => import('./components/seller/SellerLayout'));
const AdminLayout  = lazy(() => import('./components/admin/AdminLayout'));
const BuyerLayout  = lazy(() => import('./components/buyer/BuyerLayout'));

// ─── Functional pages — no pixel-perfect equivalent yet ──────────────────────
// OrderSuccessPage: required for Stripe payment redirect
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
// ProductFormPage: seller product create/edit — linked from pixel-perfect seller pages
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
// SellerPublicProfilePage: public-facing seller store — no pixel-perfect equivalent yet
const SellerPublicProfilePage = lazy(() => import('./pages/SellerPublicProfilePage'));
// AdminSellerDetailPage: admin seller detail view — no pixel-perfect equivalent yet
const AdminSellerDetailPage = lazy(() => import('./pages/AdminSellerDetailPage'));
// TrackingPage / TrackOrderPage: order tracking — no pixel-perfect equivalent yet
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
// Legal pages without pixel-perfect equivalents
const AcceptableUsePolicyPage = lazy(() => import('./pages/legal/AcceptableUsePolicyPage'));
const SellerGuidelinesPage = lazy(() => import('./pages/SellerGuidelinesPage'));
// SellerSetupPage: shown to sellers who have not yet activated their account
const SellerSetupPage = lazy(() => import('./pages/pixel-perfect/seller/SellerSetupPage'));

// ─── Pixel-perfect dashboard shells ──────────────────────────────────────────
const PPSellerShell    = lazy(() => import('./pages/pixel-perfect/seller/SellerShell'));
const PPSellerDashboard = lazy(() => import('./pages/pixel-perfect/seller/SellerDashboard'));
const PPSellerProducts  = lazy(() => import('./pages/pixel-perfect/seller/SellerProducts'));
const PPSellerOrders    = lazy(() => import('./pages/pixel-perfect/seller/SellerOrders'));
const PPSellerShipments = lazy(() => import('./pages/pixel-perfect/seller/SellerShipments'));
const PPSellerReturns   = lazy(() => import('./pages/pixel-perfect/seller/SellerReturns'));
const PPSellerRFQ       = lazy(() => import('./pages/pixel-perfect/seller/SellerRFQ'));
const PPSellerProfile   = lazy(() => import('./pages/pixel-perfect/seller/SellerProfile'));
const PPSellerSettings  = lazy(() => import('./pages/pixel-perfect/seller/SellerSettings'));
const PPSellerReviews   = lazy(() => import('./pages/pixel-perfect/seller/SellerReviewsPage'));

const PPBuyerShell     = lazy(() => import('./pages/pixel-perfect/buyer/BuyerShell'));
const PPBuyerDashboard = lazy(() => import('./pages/pixel-perfect/buyer/BuyerDashboard'));
const PPBuyerOrders    = lazy(() => import('./pages/pixel-perfect/buyer/BuyerOrders'));
const PPBuyerAddresses = lazy(() => import('./pages/pixel-perfect/buyer/BuyerAddresses'));
const PPBuyerPayments  = lazy(() => import('./pages/pixel-perfect/buyer/BuyerPayments'));
const PPBuyerReviews   = lazy(() => import('./pages/pixel-perfect/buyer/BuyerReviews'));
const PPBuyerProfile   = lazy(() => import('./pages/pixel-perfect/buyer/BuyerProfile'));
const PPBuyerSettings  = lazy(() => import('./pages/pixel-perfect/buyer/BuyerSettings'));
const PPBuyerWishlist  = lazy(() => import('./pages/pixel-perfect/buyer/BuyerWishlist'));

const PPAdminShell      = lazy(() => import('./pages/pixel-perfect/admin/AdminShell'));
const PPAdminDashboard  = lazy(() => import('./pages/pixel-perfect/admin/AdminDashboard'));
const PPAdminUsers      = lazy(() => import('./pages/pixel-perfect/admin/AdminUsers'));
const PPAdminApprovals  = lazy(() => import('./pages/pixel-perfect/admin/AdminApprovals'));
const PPAdminProducts   = lazy(() => import('./pages/pixel-perfect/admin/AdminProducts'));
const PPAdminOrders     = lazy(() => import('./pages/pixel-perfect/admin/AdminOrders'));
const PPAdminFlagged    = lazy(() => import('./pages/pixel-perfect/admin/AdminFlagged'));
const PPAdminReports    = lazy(() => import('./pages/pixel-perfect/admin/AdminReports'));
const PPAdminSupport    = lazy(() => import('./pages/pixel-perfect/admin/AdminSupport'));
const PPAdminSettings   = lazy(() => import('./pages/pixel-perfect/admin/AdminSettings'));

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

    // Defer supabase import so vendor-supabase.js is not in the critical-path
    // bundle — it loads after the initial render, shaving ~37 KiB from the
    // bytes parsed before first paint.
    let cleanup: (() => void) | undefined;

    import('./lib/supabase').then(({ supabase }) => {
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
      }).catch((err: unknown) => {
        // Network error or Supabase unreachable — unblock loading so the app is usable
        console.error('[App] Auth initialization error:', err);
        setLoading(false);
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

      cleanup = () => subscription.unsubscribe();
    }).catch((err: unknown) => {
      console.error('[App] Failed to load supabase module:', err);
      setLoading(false);
    });

    return () => cleanup?.();
  }, [setUser, setLoading]);

  return (
    <CartProvider>
      <Routes>
        {/* ── Pixel-perfect standalone pages (own Navbar + Footer) ─────────────── */}
        <Route path="/" element={<Suspense fallback={<PageLoader />}><PixelPerfectIndex /></Suspense>} />
        <Route path="catalog" element={<Suspense fallback={<PageLoader />}><PPCatalog /></Suspense>} />
        <Route path="category/:slug" element={<Suspense fallback={<PageLoader />}><PPCategoryPage /></Suspense>} />
        {/* /categories/:slug — canonical plural alias */}
        <Route path="categories/:slug" element={<Suspense fallback={<PageLoader />}><PPCategoryPage /></Suspense>} />
        <Route path="product/:id" element={<Suspense fallback={<PageLoader />}><PPProductDetail /></Suspense>} />
        <Route path="cart" element={<Suspense fallback={<PageLoader />}><PPCart /></Suspense>} />
        <Route path="checkout" element={<Suspense fallback={<PageLoader />}><PPCheckout /></Suspense>} />
        <Route path="about" element={<Suspense fallback={<PageLoader />}><PPAboutUs /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<PageLoader />}><PPContactUs /></Suspense>} />
        <Route path="clearance" element={<Suspense fallback={<PageLoader />}><PPDeals /></Suspense>} />
        <Route path="terms" element={<Suspense fallback={<PageLoader />}><PPTerms /></Suspense>} />
        <Route path="privacy" element={<Suspense fallback={<PageLoader />}><PPPrivacy /></Suspense>} />
        <Route path="cookies" element={<Suspense fallback={<PageLoader />}><PPCookies /></Suspense>} />
        <Route path="returns-policy" element={<Suspense fallback={<PageLoader />}><PPReturnsPolicy /></Suspense>} />
        {/* /returns — alias expected by Lovable checklist */}
        <Route path="returns" element={<Suspense fallback={<PageLoader />}><PPReturnsPolicy /></Suspense>} />
        <Route path="shipping-policy" element={<Suspense fallback={<PageLoader />}><PPShippingPolicy /></Suspense>} />
        {/* /shipping — alias expected by Lovable checklist */}
        <Route path="shipping" element={<Suspense fallback={<PageLoader />}><PPShippingPolicy /></Suspense>} />
        <Route path="buyer-terms" element={<Suspense fallback={<PageLoader />}><PPBuyerTerms /></Suspense>} />
        <Route path="seller-terms" element={<Suspense fallback={<PageLoader />}><PPSellerTerms /></Suspense>} />
        <Route path="disclaimer" element={<Suspense fallback={<PageLoader />}><PPDisclaimer /></Suspense>} />
        <Route path="faq" element={<Suspense fallback={<PageLoader />}><PPFAQ /></Suspense>} />

        {/* ── Pixel-perfect auth pages (standalone full-page designs) ──────────── */}
        <Route path="login" element={<Suspense fallback={<PageLoader />}><PPLogin /></Suspense>} />
        <Route path="register" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="signup" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="forgot-password" element={<Suspense fallback={<PageLoader />}><PPForgotPassword /></Suspense>} />
        <Route path="reset-password" element={<Suspense fallback={<PageLoader />}><PPResetPassword /></Suspense>} />

        {/* ── Pixel-perfect dashboard routes (own shell with sidebar) ──────────── */}
        {/* /pp/seller – RequireSeller */}
        <Route path="pp/seller" element={
          <RequireSeller>
            <Suspense fallback={<PageLoader />}><PPSellerShell /></Suspense>
          </RequireSeller>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPSellerDashboard /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><PPSellerProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPSellerOrders /></Suspense>} />
          <Route path="shipments" element={<Suspense fallback={<PageLoader />}><PPSellerShipments /></Suspense>} />
          <Route path="returns" element={<Suspense fallback={<PageLoader />}><PPSellerReturns /></Suspense>} />
          <Route path="rfq" element={<Suspense fallback={<PageLoader />}><PPSellerRFQ /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><PPSellerReviews /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><PPSellerProfile /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPSellerSettings /></Suspense>} />
        </Route>

        {/* /pp/buyer – RequireAuth */}
        <Route path="pp/buyer" element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><PPBuyerShell /></Suspense>
          </RequireAuth>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPBuyerDashboard /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPBuyerOrders /></Suspense>} />
          <Route path="wishlist" element={<Suspense fallback={<PageLoader />}><PPBuyerWishlist /></Suspense>} />
          <Route path="addresses" element={<Suspense fallback={<PageLoader />}><PPBuyerAddresses /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<PageLoader />}><PPBuyerPayments /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><PPBuyerReviews /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><PPBuyerProfile /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPBuyerSettings /></Suspense>} />
        </Route>

        {/* /pp/admin – RequireAdmin */}
        <Route path="pp/admin" element={
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}><PPAdminShell /></Suspense>
          </RequireAdmin>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPAdminDashboard /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><PPAdminUsers /></Suspense>} />
          <Route path="approvals" element={<Suspense fallback={<PageLoader />}><PPAdminApprovals /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><PPAdminProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPAdminOrders /></Suspense>} />
          <Route path="flagged" element={<Suspense fallback={<PageLoader />}><PPAdminFlagged /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><PPAdminReports /></Suspense>} />
          <Route path="support" element={<Suspense fallback={<PageLoader />}><PPAdminSupport /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPAdminSettings /></Suspense>} />
        </Route>

        {/* ── Standalone functional pages (no pixel-perfect equivalent yet) ─────── */}

        {/* Order Success — Stripe redirects here after payment */}
        {/* NOTE: create-checkout.ts uses /order-success — keep this route matching that */}
        <Route path="order-success" element={<Suspense fallback={<PageLoader />}><OrderSuccessPage /></Suspense>} />
        {/* Alias for any old links using /orders/success */}
        <Route path="orders/success" element={<Navigate to="/order-success" replace />} />

        {/* Checkout Error — Stripe redirects here on payment failure */}
        <Route path="checkout/error" element={<Suspense fallback={<PageLoader />}><PPCheckoutError /></Suspense>} />

        {/* Seller: Product Create/Edit — linked from pixel-perfect seller pages */}
        <Route path="seller/products/new" element={
          <RequireSeller>
            <Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>
          </RequireSeller>
        } />
        <Route path="seller/products/:id/edit" element={
          <RequireSeller>
            <Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>
          </RequireSeller>
        } />

        {/* Seller: Setup page — accessible with RequireAuth only (not RequireSeller)
            so that draft/submitted sellers can complete their onboarding here. */}
        <Route path="seller/setup" element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><SellerSetupPage /></Suspense>
          </RequireAuth>
        } />

        {/* Public: Seller Public Profile — no pixel-perfect equivalent yet */}
        <Route path="seller/:slug" element={<Suspense fallback={<PageLoader />}><SellerPublicProfilePage /></Suspense>} />

        {/* Admin: Seller Detail — no pixel-perfect equivalent yet */}
        <Route path="admin/sellers/:id" element={
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}><AdminSellerDetailPage /></Suspense>
          </RequireAdmin>
        } />

        {/* Public: Order Tracking — no pixel-perfect equivalent yet */}
        <Route path="tracking/:orderNumber" element={<Suspense fallback={<PageLoader />}><TrackingPage /></Suspense>} />
        <Route path="track-order" element={<Suspense fallback={<PageLoader />}><TrackOrderPage /></Suspense>} />
        <Route path="track" element={<Navigate to="/track-order" replace />} />

        {/* Legal pages without pixel-perfect equivalents */}
        <Route path="acceptable-use-policy" element={<Suspense fallback={<PageLoader />}><AcceptableUsePolicyPage /></Suspense>} />
        <Route path="seller-guidelines" element={<Suspense fallback={<PageLoader />}><SellerGuidelinesPage /></Suspense>} />

        {/* ── Redirect aliases ──────────────────────────────────────────────────── */}
        {/* ── /seller/* — SellerLayout (shadcn sidebar, /seller/* nav links) ────── */}
        <Route path="seller" element={
          <RequireSeller>
            <Suspense fallback={<PageLoader />}><SellerLayout /></Suspense>
          </RequireSeller>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPSellerDashboard /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><PPSellerProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPSellerOrders /></Suspense>} />
          <Route path="shipments" element={<Suspense fallback={<PageLoader />}><PPSellerShipments /></Suspense>} />
          <Route path="returns" element={<Suspense fallback={<PageLoader />}><PPSellerReturns /></Suspense>} />
          <Route path="rfq" element={<Suspense fallback={<PageLoader />}><PPSellerRFQ /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><PPSellerReviews /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><PPSellerProfile /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPSellerSettings /></Suspense>} />
        </Route>

        {/* ── /admin/* — AdminLayout (shadcn sidebar, /admin/* nav links) ────────── */}
        <Route path="admin" element={
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}><AdminLayout /></Suspense>
          </RequireAdmin>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPAdminDashboard /></Suspense>} />
          <Route path="approvals" element={<Suspense fallback={<PageLoader />}><PPAdminApprovals /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><PPAdminUsers /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><PPAdminProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPAdminOrders /></Suspense>} />
          <Route path="flagged" element={<Suspense fallback={<PageLoader />}><PPAdminFlagged /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><PPAdminReports /></Suspense>} />
          <Route path="support" element={<Suspense fallback={<PageLoader />}><PPAdminSupport /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPAdminSettings /></Suspense>} />
        </Route>

        {/* ── /dashboard/* — BuyerLayout (shadcn sidebar, /dashboard/* nav links) ── */}
        <Route path="dashboard" element={
          <RequireAuth>
            <Suspense fallback={<PageLoader />}><BuyerLayout /></Suspense>
          </RequireAuth>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPBuyerDashboard /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPBuyerOrders /></Suspense>} />
          <Route path="wishlist" element={<Suspense fallback={<PageLoader />}><PPBuyerWishlist /></Suspense>} />
          <Route path="addresses" element={<Suspense fallback={<PageLoader />}><PPBuyerAddresses /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<PageLoader />}><PPBuyerPayments /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><PPBuyerReviews /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><PPBuyerProfile /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPBuyerSettings /></Suspense>} />
        </Route>
        <Route path="shop" element={<Navigate to="/catalog" replace />} />
        <Route path="seller-register" element={<Navigate to="/register?type=seller" replace />} />
        <Route path="seller-dashboard" element={<Navigate to="/seller" replace />} />
        <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />

        {/* ── Wildcard — pixel-perfect 404 ─────────────────────────────────────── */}
        <Route path="*" element={<Suspense fallback={<PageLoader />}><PPNotFound /></Suspense>} />
      </Routes>
    </CartProvider>
  );
}

export default App;