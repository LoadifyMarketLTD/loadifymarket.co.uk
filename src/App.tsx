import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAuthStore } from './store';
import { hasAdminAccess } from './lib/roleUtils';
import { CartProvider } from './contexts/CartContext';
import CookieConsent from './components/CookieConsent';
import Header from './components/Header';
import AmbientLayer from './components/AmbientLayer';
import { isCapacitorNative } from './lib/capacitorUtils';

import RequireAdmin from './components/auth/RequireAdmin';
import RequireSeller from './components/auth/RequireSeller';
import RequireSellerAny from './components/auth/RequireSellerAny';
import RequireBuyer from './components/auth/RequireBuyer';
import RequireEmailVerified from './components/auth/RequireEmailVerified';
import RequireAuth from './components/auth/RequireAuth';

// ─── Auth callback — OAuth redirect landing page ──────────────────────────────
const AuthCallbackPage    = lazy(() => import('./pages/AuthCallbackPage'));

// ─── Mobile standalone pages ──────────────────────────────────────────────────
const MobileInboxPage     = lazy(() => import('./pages/MobileInboxPage'));
const MobileChatPage      = lazy(() => import('./pages/MobileChatPage'));
const MobileOrdersPage    = lazy(() => import('./pages/MobileOrdersPage'));
const MobileCategoriesPage = lazy(() => import('./pages/MobileCategoriesPage'));

// ─── Homepage ─────────────────────────────────────────────────────────────────
const Home                 = lazy(() => import('./pages/Home'));

// ─── Pixel-perfect pages — standalone (include own Header + Footer) ───────────

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
const PPWholesaleInfo      = lazy(() => import('./pages/pixel-perfect/WholesaleInfo'));
const PPCheckoutError      = lazy(() => import('./pages/pixel-perfect/CheckoutError'));
const PPNotFound           = lazy(() => import('./pages/pixel-perfect/NotFound'));

// ─── Pixel-perfect auth pages — standalone (full-page designs) ───────────────
const PPLogin              = lazy(() => import('./pages/pixel-perfect/Login'));
const PPSignup             = lazy(() => import('./pages/pixel-perfect/Signup'));
const PPTradeAccount       = lazy(() => import('./pages/pixel-perfect/TradeAccount'));
const PPForgotPassword     = lazy(() => import('./pages/pixel-perfect/ForgotPassword'));
const PPResetPassword      = lazy(() => import('./pages/pixel-perfect/ResetPassword'));

// ─── Layout wrappers (shadcn sidebar) — used for /seller, /admin, /dashboard ─
// (layouts kept for potential future use; legacy routes now redirect to /pp/* equivalents)

// ─── Functional pages — no pixel-perfect equivalent yet ──────────────────────
// OrderSuccessPage: required for Stripe payment redirect
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
// ProductFormPage: seller product create/edit — linked from pixel-perfect seller pages
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
// SellerPublicProfilePage: public-facing seller store — no pixel-perfect equivalent yet
const SellerPublicProfilePage = lazy(() => import('./pages/SellerPublicProfilePage'));
// AdminSellerDetailPage: admin seller detail view — no pixel-perfect equivalent yet
const AdminSellerDetailPage = lazy(() => import('./pages/AdminSellerDetailPage'));
// TrackOrderPage: public-facing order tracking
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
// Legal pages without pixel-perfect equivalents
const AcceptableUsePolicyPage = lazy(() => import('./pages/legal/AcceptableUsePolicyPage'));
const SellerGuidelinesPage = lazy(() => import('./pages/SellerGuidelinesPage'));
// Onboarding pages
const RoleSelection     = lazy(() => import('./pages/onboarding/RoleSelection'));
const SellerOnboarding  = lazy(() => import('./pages/onboarding/SellerOnboarding'));
const SellerSetupPage   = lazy(() => import('./pages/pixel-perfect/seller/SellerSetupPage'));

// ─── Pixel-perfect dashboard shells ──────────────────────────────────────────
const PPSellerShell         = lazy(() => import('./pages/pixel-perfect/seller/SellerShell'));
const PPSellerDashboard     = lazy(() => import('./pages/pixel-perfect/seller/SellerDashboard'));
const PPSellerProducts      = lazy(() => import('./pages/pixel-perfect/seller/SellerProducts'));
const PPSellerOrders        = lazy(() => import('./pages/pixel-perfect/seller/SellerOrders'));
const PPSellerShipments     = lazy(() => import('./pages/pixel-perfect/seller/SellerShipments'));
const PPSellerReturns       = lazy(() => import('./pages/pixel-perfect/seller/SellerReturns'));
const PPSellerRFQ           = lazy(() => import('./pages/pixel-perfect/seller/SellerRFQ'));
const PPSellerProfile       = lazy(() => import('./pages/pixel-perfect/seller/SellerProfile'));
const PPSellerSettings      = lazy(() => import('./pages/pixel-perfect/seller/SellerSettings'));
const PPSellerReviews       = lazy(() => import('./pages/pixel-perfect/seller/SellerReviewsPage'));
const PPSellerNotifications = lazy(() => import('./pages/pixel-perfect/seller/SellerNotifications'));

const PPBuyerShell     = lazy(() => import('./pages/pixel-perfect/buyer/BuyerShell'));
const PPBuyerDashboard     = lazy(() => import('./pages/pixel-perfect/buyer/BuyerDashboard'));
const PPBuyerOrders        = lazy(() => import('./pages/pixel-perfect/buyer/BuyerOrders'));
const PPBuyerAddresses     = lazy(() => import('./pages/pixel-perfect/buyer/BuyerAddresses'));
const PPBuyerPayments      = lazy(() => import('./pages/pixel-perfect/buyer/BuyerPayments'));
const PPBuyerReviews       = lazy(() => import('./pages/pixel-perfect/buyer/BuyerReviews'));
const PPBuyerProfile       = lazy(() => import('./pages/pixel-perfect/buyer/BuyerProfile'));
const PPBuyerSettings      = lazy(() => import('./pages/pixel-perfect/buyer/BuyerSettings'));
const PPBuyerWishlist      = lazy(() => import('./pages/pixel-perfect/buyer/BuyerWishlist'));
const PPBuyerNotifications = lazy(() => import('./pages/pixel-perfect/buyer/BuyerNotifications'));
const PPBuyerMessages      = lazy(() => import('./pages/pixel-perfect/buyer/BuyerMessages'));
const PPBuyerRFQ           = lazy(() => import('./pages/pixel-perfect/buyer/BuyerRFQ'));
const PPBuyerDisputes      = lazy(() => import('./pages/pixel-perfect/buyer/BuyerDisputes'));

const PPAdminShell          = lazy(() => import('./pages/pixel-perfect/admin/AdminShell'));
const PPAdminDashboard      = lazy(() => import('./pages/pixel-perfect/admin/AdminDashboard'));
const PPAdminUsers          = lazy(() => import('./pages/pixel-perfect/admin/AdminUsers'));
const PPAdminBuyers         = lazy(() => import('./pages/pixel-perfect/admin/AdminBuyers'));
const PPAdminApprovals      = lazy(() => import('./pages/pixel-perfect/admin/AdminApprovals'));
const PPAdminProducts       = lazy(() => import('./pages/pixel-perfect/admin/AdminProducts'));
const PPAdminOrders         = lazy(() => import('./pages/pixel-perfect/admin/AdminOrders'));
const PPAdminFlagged        = lazy(() => import('./pages/pixel-perfect/admin/AdminFlagged'));
const PPAdminReports        = lazy(() => import('./pages/pixel-perfect/admin/AdminReports'));
const PPAdminSupport        = lazy(() => import('./pages/pixel-perfect/admin/AdminSupport'));
const PPAdminSettings       = lazy(() => import('./pages/pixel-perfect/admin/AdminSettings'));
const PPAdminNotifications  = lazy(() => import('./pages/pixel-perfect/admin/AdminNotifications'));
const PPAdminPayouts        = lazy(() => import('./pages/pixel-perfect/admin/AdminPayouts'));
const PPAdminStripeEvents   = lazy(() => import('./pages/pixel-perfect/admin/AdminStripeEvents'));
const PPAdminDisputes       = lazy(() => import('./pages/pixel-perfect/admin/AdminDisputes'));

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#C99A3E]"></div>
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}


/**
 * Role-aware /dashboard redirect.
 * admins  → /admin
 * sellers → /seller
 * buyers  → /buyer
 * While auth is still loading, wait before redirecting to avoid a flash to the
 * wrong dashboard. Unauthenticated users are sent to /login.
 */
function DashboardRedirect() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  // Sellers with incomplete onboarding go to the wizard first.
  // `onboardingCompleted` is loaded from the DB in App.tsx auth listener.
  if (user.role === 'seller') {
    if (user.onboardingCompleted === false) return <Navigate to="/onboarding" replace />;
    return <Navigate to="/seller" replace />;
  }
  return <Navigate to="/buyer" replace />;
}

/** Redirects legacy /tracking/:orderNumber to /track-order?orderNumber=:orderNumber */
function TrackingRedirect() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return <Navigate to={`/track-order${orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : ''}`} replace />;
}

function CategoryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/category/${slug ?? ''}`} replace />;
}


/**
 * Renders a maintenance-mode page for non-admin visitors.
 * Reads `platform_settings.maintenance_mode` once on mount.
 * Admins always bypass so they can access the admin hub.
 */
function MaintenanceModeGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);

  useEffect(() => {
    import('./lib/supabase').then(({ supabase }) => {
      supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle()
        .then(({ data }) => {
          const val = data?.value;
          setMaintenanceMode(val === true || val === 'true');
        }, () => setMaintenanceMode(false));
    });
  }, []);

  // While loading auth or the maintenance flag, render normally (avoids flash)
  if (isLoading || maintenanceMode === null) return <>{children}</>;
  // Admins always bypass maintenance mode
  if (maintenanceMode && user && hasAdminAccess(user)) return <>{children}</>;
  // If maintenance is on and user is not admin, show maintenance screen
  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-6">🔧</div>
          <h1 className="text-3xl font-bold text-white mb-3">We're under maintenance</h1>
          <p className="text-slate-400 text-base mb-6">
            Loadify Market is currently undergoing scheduled maintenance. We'll be back shortly.
            Thank you for your patience.
          </p>
          <p className="text-slate-500 text-sm">
            If you are an admin, please{' '}
            <a href="/login" className="text-blue-600 underline">sign in</a> to access the platform.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function App() {
  const { setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();

  // ── Deep-link handler (Capacitor APK only) ─────────────────────────────────
  // @capacitor/app fires 'appUrlOpen' when the APK is resumed via a URL —
  // this covers OAuth callbacks from Chrome Custom Tabs and any future
  // Android App Link that opens loadifymarket.co.uk URLs in the APK.
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let removeListener: (() => void) | undefined;

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url);

          // OAuth callback — exchange the code/token with Supabase and
          // let onAuthStateChange update the store automatically.
          if (parsed.pathname.startsWith('/auth/callback')) {
            const { supabase } = await import('./lib/supabase');
            await supabase.auth.getSession();
            navigate('/auth/callback' + parsed.search + parsed.hash, { replace: true });
            return;
          }

          // For all other deep links (e.g. /order-success, /seller/setup)
          // navigate to the in-app path so the React Router renders the right page.
          const inAppPath = parsed.pathname + parsed.search + parsed.hash;
          navigate(inAppPath, { replace: true });
        } catch {
          // Malformed URL — ignore
        }
      }).then((handle) => {
        removeListener = () => handle.remove();
      });
    }).catch(() => { /* @capacitor/app not available — no-op */ });

    return () => removeListener?.();
  }, [navigate]);

  useEffect(() => {
    // Build a minimal User object from Supabase auth session metadata when the
    // public.users table query fails or returns no row (e.g. the live database
    // hasn't had the 20_fix_users_table.sql migration applied yet).
    function userFromSession(authUser: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
      email_confirmed_at?: string | null;
    }): import('./types').User {
      const userMeta = authUser.user_metadata || {};
      const appMeta = authUser.app_metadata || {};
      const strVal = (obj: Record<string, unknown>, key: string) =>
        typeof obj[key] === 'string' ? (obj[key] as string) : undefined;
      const candidateRole = strVal(appMeta, 'role') || strVal(userMeta, 'role');
      const role: import('./types').UserRole =
        candidateRole === 'admin' || candidateRole === 'seller' || candidateRole === 'buyer'
          ? candidateRole
          : 'buyer';
      return {
        id: authUser.id,
        email: authUser.email ?? '',
        role,
        firstName: strVal(userMeta, 'first_name'),
        lastName: strVal(userMeta, 'last_name'),
        // Derive from Supabase Auth state — email_confirmed_at is set when the
        // email address has been confirmed, regardless of the custom users table.
        isEmailVerified: authUser.email_confirmed_at != null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Lift the joined seller_profiles row (if any) into a flat sellerStatus field
    // on the user object, and remove the raw join array.  This is called after
    // every users query so RequireSeller can use the cached value immediately
    // without an extra DB round-trip on every seller-page navigation.
    function normalizeSellerStatus(data: Record<string, unknown>): void {
      const sp = data['seller_profiles'];
      if (Array.isArray(sp) && sp.length > 0) {
        const status = (sp[0] as Record<string, unknown>)['sellerStatus'];
        if (typeof status === 'string') {
          data['sellerStatus'] = status;
        }
      }
      // Always remove the raw join array — it is a Supabase query artefact and
      // must not appear on the User object regardless of whether a row was found
      // (e.g. buyers/admins have no seller_profiles row so the array is empty).
      delete data['seller_profiles'];
    }

    // Defer supabase import so vendor-supabase.js is not in the critical-path
    // bundle — it loads after the initial render, shaving ~37 KiB from the
    // bytes parsed before first paint.
    let cleanup: (() => void) | undefined;

    import('./lib/supabase').then(({ supabase }) => {
      // Supabase JS v2 fires onAuthStateChange with an INITIAL_SESSION event
      // synchronously when the subscription is created — this covers the
      // page-load / existing-session path without needing a separate
      // getSession() call.  Running both in parallel caused a last-write-wins
      // race condition: if getSession()'s DB query returned null/error AFTER
      // onAuthStateChange already wrote the correct role, it overwrote it with
      // the userFromSession fallback (defaulting to role='buyer'), which is how
      // an admin could end up seeing Buyer Hub on a page reload.
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          // Signal loading before the async round-trip so route guards always
          // see isLoading=true while the DB query is in flight.  Without this
          // a guard can briefly observe isLoading=false + user=null during the
          // SIGNED_IN event (e.g. right after login) and redirect to /login.
          setLoading(true);
          void Promise.resolve(
            supabase
              .from('users')
              .select('*, seller_profiles(sellerStatus)')
              .eq('id', session.user.id)
              .maybeSingle()
          ).then(({ data, error }) => {
              if (data) {
                // Blocked users must not be rehydrated — sign them out immediately.
                if (data.isActive === false) {
                  supabase.auth.signOut();
                  setUser(null);
                  return;
                }
                normalizeSellerStatus(data as unknown as Record<string, unknown>);
                // Always derive isEmailVerified from Supabase Auth (source of truth).
                (data as Record<string, unknown>).isEmailVerified =
                  session.user.email_confirmed_at != null;
                // Derive isAdmin from role so components can use user.isAdmin
                // independently of the role field (which may later become roles[]).
                (data as Record<string, unknown>).isAdmin =
                  (data as Record<string, unknown>).role === 'admin';
                setUser(data);
              } else {
                if (error) {
                  console.warn('users table query failed, falling back to auth session:', error.message);
                  setUser(userFromSession(session.user));
                } else {
                  // Row not yet found — e.g. the DB insert trigger hasn't fired
                  // yet on a fresh sign-up, or a transient query failure.  Fall
                  // back to auth-session metadata so the user is not incorrectly
                  // kicked back to the login page.
                  setUser(userFromSession(session.user));
                }
              }
            })
            .catch((err: unknown) => {
              // Network error during profile fetch — unblock loading so the
              // app does not hang on a spinner indefinitely.
              console.error('[Auth] Profile fetch threw unexpectedly:', err);
              setLoading(false);
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
      <AmbientLayer />
      <Header />
      <MaintenanceModeGate>
        <Routes>
          {/* ── Pixel-perfect standalone pages (own Header + Footer) ─────────────── */}
          <Route path="/" element={<Suspense fallback={<PageLoader />}><Home /></Suspense>} />
        <Route path="catalog" element={<Suspense fallback={<PageLoader />}><PPCatalog /></Suspense>} />
        <Route path="category/:slug" element={<Suspense fallback={<PageLoader />}><PPCategoryPage /></Suspense>} />
        {/* /categories/:slug → 301-style redirect to canonical /category/:slug */}
        <Route path="categories/:slug" element={<CategoryRedirect />} />
        <Route path="product/:id" element={<Suspense fallback={<PageLoader />}><PPProductDetail /></Suspense>} />
        <Route path="cart" element={<Suspense fallback={<PageLoader />}><PPCart /></Suspense>} />
        <Route path="checkout" element={<RequireEmailVerified><Suspense fallback={<PageLoader />}><PPCheckout /></Suspense></RequireEmailVerified>} />
        <Route path="about" element={<Suspense fallback={<PageLoader />}><PPAboutUs /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<PageLoader />}><PPContactUs /></Suspense>} />
        <Route path="deals" element={<Suspense fallback={<PageLoader />}><PPDeals /></Suspense>} />
        {/* /clearance — legacy redirect to /deals */}
        <Route path="clearance" element={<Navigate to="/deals" replace />} />
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
        {/* /help — redirect to FAQ (header nav link target) */}
        <Route path="help" element={<Navigate to="/faq" replace />} />
        <Route path="wholesale-info" element={<Suspense fallback={<PageLoader />}><PPWholesaleInfo /></Suspense>} />

        {/* ── Pixel-perfect auth pages (standalone full-page designs) ──────────── */}
        <Route path="login" element={<Suspense fallback={<PageLoader />}><PPLogin /></Suspense>} />
        <Route path="register" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="signup" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="trade-account" element={<Suspense fallback={<PageLoader />}><PPTradeAccount /></Suspense>} />
        <Route path="forgot-password" element={<Suspense fallback={<PageLoader />}><PPForgotPassword /></Suspense>} />
        <Route path="reset-password" element={<Suspense fallback={<PageLoader />}><PPResetPassword /></Suspense>} />

        {/* OAuth callback — Supabase redirects here after Google / social login */}
        <Route path="auth/callback" element={<Suspense fallback={<PageLoader />}><AuthCallbackPage /></Suspense>} />

        {/* /pp — pixel-perfect homepage (preview/alternate root) */}
        <Route path="pp" element={<Navigate to="/" replace />} />

        {/* ── Onboarding flow ─────────────────────────────────────────────────── */}
        {/* Role selection — public (uid passed as query param after signup) */}
        <Route path="onboarding/role-selection" element={
          <Suspense fallback={<PageLoader />}><RoleSelection /></Suspense>
        } />
        {/* Seller onboarding wizard — accessible by any authenticated seller */}
        <Route path="onboarding" element={
          <RequireSellerAny>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><SellerOnboarding /></Suspense>
            </RequireEmailVerified>
          </RequireSellerAny>
        } />

        {/* ── Seller onboarding standalones — defined BEFORE seller shell so they
            take priority when the same sub-path is reached from the browser ──── */}
        {/* Seller: Product Create/Edit — linked from pixel-perfect seller pages */}
        <Route path="seller/products/new" element={
          <RequireSeller>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>
            </RequireEmailVerified>
          </RequireSeller>
        } />
        <Route path="seller/products/:id/edit" element={
          <RequireSeller>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>
            </RequireEmailVerified>
          </RequireSeller>
        } />

        {/* Seller: Setup page — Stripe Connect return URL lands here with ?connect=success|refresh */}
        <Route path="seller/setup" element={
          <RequireSellerAny>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><SellerSetupPage /></Suspense>
            </RequireEmailVerified>
          </RequireSellerAny>
        } />
        {/* Seller: Analytics — redirected to seller dashboard (analytics shown there) */}
        <Route path="seller/analytics" element={<Navigate to="/seller" replace />} />
        {/* Seller: Payouts — redirected to seller settings (payout config shown there) */}
        <Route path="seller/payouts" element={<Navigate to="/seller/settings" replace />} />

        {/* Seller: Profile edit — accessible by any seller (any status) and admins */}
        <Route path="seller/profile" element={
          <RequireSellerAny>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><PPSellerProfile /></Suspense>
            </RequireEmailVerified>
          </RequireSellerAny>
        } />

        {/* ── Dashboard shells ────────────────────────────────────────────────── */}
        {/* /seller – RequireSeller */}
        <Route path="seller" element={
          <RequireSeller>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><PPSellerShell /></Suspense>
            </RequireEmailVerified>
          </RequireSeller>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPSellerDashboard /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><PPSellerProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPSellerOrders /></Suspense>} />
          <Route path="shipments" element={<Suspense fallback={<PageLoader />}><PPSellerShipments /></Suspense>} />
          <Route path="returns" element={<Suspense fallback={<PageLoader />}><PPSellerReturns /></Suspense>} />
          <Route path="rfq" element={<Suspense fallback={<PageLoader />}><PPSellerRFQ /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><PPSellerReviews /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPSellerSettings /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><PPSellerNotifications /></Suspense>} />
        </Route>

        {/* /buyer – RequireBuyer (buyer role only; sellers→/seller, admins→/admin) */}
        <Route path="buyer" element={
          <RequireBuyer>
            <RequireEmailVerified>
              <Suspense fallback={<PageLoader />}><PPBuyerShell /></Suspense>
            </RequireEmailVerified>
          </RequireBuyer>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPBuyerDashboard /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPBuyerOrders /></Suspense>} />
          <Route path="wishlist" element={<Suspense fallback={<PageLoader />}><PPBuyerWishlist /></Suspense>} />
          <Route path="addresses" element={<Suspense fallback={<PageLoader />}><PPBuyerAddresses /></Suspense>} />
          <Route path="payments" element={<Suspense fallback={<PageLoader />}><PPBuyerPayments /></Suspense>} />
          <Route path="reviews" element={<Suspense fallback={<PageLoader />}><PPBuyerReviews /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={<PageLoader />}><PPBuyerProfile /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPBuyerSettings /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><PPBuyerNotifications /></Suspense>} />
          <Route path="messages" element={<Suspense fallback={<PageLoader />}><PPBuyerMessages /></Suspense>} />
          <Route path="rfq" element={<Suspense fallback={<PageLoader />}><PPBuyerRFQ /></Suspense>} />
          <Route path="disputes" element={<Suspense fallback={<PageLoader />}><PPBuyerDisputes /></Suspense>} />
        </Route>

        {/* /admin – RequireAdmin */}
        <Route path="admin" element={
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}><PPAdminShell /></Suspense>
          </RequireAdmin>
        }>
          <Route index element={<Suspense fallback={<PageLoader />}><PPAdminDashboard /></Suspense>} />
          <Route path="users" element={<Suspense fallback={<PageLoader />}><PPAdminUsers /></Suspense>} />
          <Route path="buyers" element={<Suspense fallback={<PageLoader />}><PPAdminBuyers /></Suspense>} />
          <Route path="approvals" element={<Suspense fallback={<PageLoader />}><PPAdminApprovals /></Suspense>} />
          <Route path="products" element={<Suspense fallback={<PageLoader />}><PPAdminProducts /></Suspense>} />
          <Route path="orders" element={<Suspense fallback={<PageLoader />}><PPAdminOrders /></Suspense>} />
          <Route path="flagged" element={<Suspense fallback={<PageLoader />}><PPAdminFlagged /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><PPAdminReports /></Suspense>} />
          <Route path="support" element={<Suspense fallback={<PageLoader />}><PPAdminSupport /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPAdminSettings /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><PPAdminNotifications /></Suspense>} />
          <Route path="payouts" element={<Suspense fallback={<PageLoader />}><PPAdminPayouts /></Suspense>} />
          <Route path="stripe-events" element={<Suspense fallback={<PageLoader />}><PPAdminStripeEvents /></Suspense>} />
          <Route path="disputes" element={<Suspense fallback={<PageLoader />}><PPAdminDisputes /></Suspense>} />
        </Route>

        {/* ── Mobile inbox + chat ─────────────────────────────────────────────── */}
        <Route path="inbox" element={<RequireAuth><Suspense fallback={<PageLoader />}><MobileInboxPage /></Suspense></RequireAuth>} />
        <Route path="inbox/:conversationId" element={<RequireAuth><Suspense fallback={<PageLoader />}><MobileChatPage /></Suspense></RequireAuth>} />

        {/* ── Mobile orders (buyer) — also handles push notification deep-links ── */}
        <Route path="orders" element={<RequireAuth><Suspense fallback={<PageLoader />}><MobileOrdersPage /></Suspense></RequireAuth>} />

        {/* ── Mobile categories list — public browsing, no auth required ──────── */}
        <Route path="categories" element={<Suspense fallback={<PageLoader />}><MobileCategoriesPage /></Suspense>} />

        {/* ── Standalone functional pages ──────────────────────────────────────── */}

        {/* Order Success — Stripe redirects here after payment */}
        {/* NOTE: create-checkout.ts uses /order-success — keep this route matching that */}
        <Route path="order-success" element={<Suspense fallback={<PageLoader />}><OrderSuccessPage /></Suspense>} />
        {/* Alias for any old links using /orders/success */}
        <Route path="orders/success" element={<Navigate to="/order-success" replace />} />

        {/* Checkout Error — Stripe redirects here on payment failure */}
        <Route path="checkout/error" element={<Suspense fallback={<PageLoader />}><PPCheckoutError /></Suspense>} />

        {/* Public: Seller Public Profile — no pixel-perfect equivalent yet */}
        <Route path="seller/:slug" element={<Suspense fallback={<PageLoader />}><SellerPublicProfilePage /></Suspense>} />

        {/* Admin: Seller Detail — no pixel-perfect equivalent yet */}
        <Route path="admin/sellers/:id" element={
          <RequireAdmin>
            <Suspense fallback={<PageLoader />}><AdminSellerDetailPage /></Suspense>
          </RequireAdmin>
        } />

        {/* Public: Order Tracking — no pixel-perfect equivalent yet */}
        <Route path="tracking/:orderNumber" element={<TrackingRedirect />} />
        <Route path="track-order" element={<Suspense fallback={<PageLoader />}><TrackOrderPage /></Suspense>} />
        <Route path="track" element={<Navigate to="/track-order" replace />} />

        {/* Legal pages without pixel-perfect equivalents */}
        <Route path="acceptable-use-policy" element={<Suspense fallback={<PageLoader />}><AcceptableUsePolicyPage /></Suspense>} />
        <Route path="seller-guidelines" element={<Suspense fallback={<PageLoader />}><SellerGuidelinesPage /></Suspense>} />

        {/* ── Aliases: /pp/* → clean routes (backward compat for bookmarks / old links) */}
        <Route path="pp/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="pp/seller/*" element={<Navigate to="/seller" replace />} />
        <Route path="pp/buyer/*" element={<Navigate to="/buyer" replace />} />

        {/* ── Other legacy aliases ─────────────────────────────────────────────── */}
        <Route path="dashboard" element={<DashboardRedirect />} />
        <Route path="shop" element={<Navigate to="/catalog" replace />} />
        <Route path="products" element={<Navigate to="/catalog" replace />} />
        <Route path="seller-register" element={<Navigate to="/register?type=seller" replace />} />
        <Route path="seller-dashboard" element={<Navigate to="/seller" replace />} />
        <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />

        {/* ── Wildcard — pixel-perfect 404 ─────────────────────────────────────── */}
        <Route path="*" element={<Suspense fallback={<PageLoader />}><PPNotFound /></Suspense>} />
        </Routes>
      </MaintenanceModeGate>
      {/* Cookie consent banner — self-manages visibility via localStorage
          (key: loadify_cookie_consent). */}
      <CookieConsent />
    </CartProvider>
  );
}

export default App;
