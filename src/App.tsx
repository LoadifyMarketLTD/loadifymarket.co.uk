import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAuthStore } from './store';
import { hasAdminAccess } from './lib/roleUtils';
import { CartProvider } from './contexts/CartContext';
import CookieConsent from './components/CookieConsent';
import { isCapacitorNative } from './lib/capacitor';

import RequireAdmin from './components/auth/RequireAdmin';
import RequireSeller from './components/auth/RequireSeller';
import RequireSellerAny from './components/auth/RequireSellerAny';
import RequireBuyer from './components/auth/RequireBuyer';

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
// SellerSetupPage: shown to sellers who have not yet activated their account
const SellerSetupPage = lazy(() => import('./pages/pixel-perfect/seller/SellerSetupPage'));

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
  if (user.role === 'seller') return <Navigate to="/seller" replace />;
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
      <div className="min-h-screen bg-[#0A1930] flex items-center justify-center px-6">
        <div className="text-center max-w-lg">
          <div className="text-6xl mb-6">🔧</div>
          <h1 className="text-3xl font-bold text-white mb-3">We're under maintenance</h1>
          <p className="text-white/60 text-base mb-6">
            Loadify Market is currently undergoing scheduled maintenance. We'll be back shortly.
            Thank you for your patience.
          </p>
          <p className="text-white/40 text-sm">
            If you are an admin, please{' '}
            <a href="/login" className="text-blue-400 underline">sign in</a> to access the platform.
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

  // ── Android App Links deep link handler ─────────────────────────────────────
  // When the user completes a Stripe payment, Stripe redirects to
  // https://loadifymarket.co.uk/order-success. On Android, this URL is
  // intercepted by the OS (via the intent filter + assetlinks.json verification)
  // and the app is brought to the foreground with the URL as the payload.
  // This listener extracts the path and routes it inside the React WebView so
  // the order-success page opens in-app rather than in Chrome.
  //
  // It also handles Supabase email-auth deep links (password reset, email
  // confirmation) which carry a token_hash / access_token in the URL fragment
  // or query params.  When detected, we exchange the tokens with Supabase so
  // the session is established before React Router navigates to the path.
  useEffect(() => {
    if (!isCapacitorNative) return;

    let removeUrlListener: (() => void) | undefined;
    let removeStateListener: (() => void) | undefined;

    import('@capacitor/app').then(({ App: CapApp }) => {
      // Handle deep links — route them inside the WebView.
      CapApp.addListener('appUrlOpen', async (event: { url: string }) => {
        try {
          const url = new URL(event.url);
          // Only handle loadifymarket.co.uk URLs — ignore all others.
          if (url.hostname !== 'loadifymarket.co.uk') return;

          // Check for Supabase auth tokens in the URL (password-reset,
          // email-confirmation, magic-link flows).  Supabase sends these as
          // either fragment params (#access_token=…&refresh_token=…) or query
          // params (?token_hash=…&type=…).  Exchange them so the session is set
          // before the React route renders.
          const hash = new URLSearchParams(url.hash.slice(1));
          const query = url.searchParams;
          const accessToken  = hash.get('access_token')  ?? query.get('access_token');
          const refreshToken = hash.get('refresh_token') ?? query.get('refresh_token');
          const tokenHash    = query.get('token_hash');
          const type         = hash.get('type') ?? query.get('type');

          if (accessToken && refreshToken) {
            // OAuth / magic-link: tokens are directly in the URL.
            const { supabase } = await import('./lib/supabase');
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } else if (tokenHash && type) {
            // Email OTP (password reset, email confirmation) — exchange hash.
            // token_hash deep links always use an EmailOtpType ('recovery',
            // 'signup', 'magiclink', etc.) — cast is safe here.
            const { supabase } = await import('./lib/supabase');
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: type as import('@supabase/supabase-js').EmailOtpType,
            });
          }

          const path = url.pathname + url.search + url.hash;
          navigate(path, { replace: true });
        } catch {
          // Malformed URL or auth exchange failure — ignore silently.
        }
      }).then((handle) => {
        removeUrlListener = () => void handle.remove();
      });

      // Refresh the Supabase session whenever the app comes back to the
      // foreground.  The access token may have expired while the app was
      // backgrounded; autoRefreshToken only runs while the WebView is active,
      // so an explicit refresh-on-resume prevents a stale-token window.
      CapApp.addListener('appStateChange', async ({ isActive }: { isActive: boolean }) => {
        if (!isActive) return;
        try {
          const { supabase } = await import('./lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            await supabase.auth.refreshSession();
          }
        } catch {
          // Network error while app is coming to foreground — ignore.
        }
      }).then((handle) => {
        removeStateListener = () => void handle.remove();
      });
    }).catch(() => {
      // @capacitor/app not available in web build — ignore.
    });

    return () => {
      removeUrlListener?.();
      removeStateListener?.();
    };
  }, [navigate]);

  useEffect(() => {
    // Build a minimal User object from Supabase auth session metadata when the
    // public.users table query fails or returns no row (e.g. the live database
    // hasn't had the 20_fix_users_table.sql migration applied yet).
    function userFromSession(authUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown>; email_confirmed_at?: string | null }): import('./types').User {
      const meta = authUser.user_metadata || {};
      // app_metadata is set server-side (e.g. by the Supabase Auth trigger) and
      // is not modifiable by the client, making it more authoritative than
      // user_metadata for the role field.
      const appMeta = authUser.app_metadata || {};
      const strVal = (key: string) => (typeof meta[key] === 'string' ? (meta[key] as string) : undefined);
      const strValApp = (key: string) => (typeof appMeta[key] === 'string' ? (appMeta[key] as string) : undefined);
      // Prefer app_metadata.role over user_metadata.role; only fall back to
      // 'buyer' as an absolute last resort — this prevents admins from being
      // misidentified when the users table is temporarily unreachable.
      const resolvedRole = ((strValApp('role') || strVal('role')) as import('./types').UserRole) || 'buyer';
      console.warn(
        `[Auth] userFromSession fallback for ${authUser.email ?? authUser.id}: ` +
        `resolved role="${resolvedRole}" from auth metadata ` +
        `(app_metadata.role="${String(appMeta['role'] ?? 'unset')}", user_metadata.role="${String(meta['role'] ?? 'unset')}"). ` +
        `If the role is wrong, verify that public.users is reachable and the row exists.`
      );
      return {
        id: authUser.id,
        email: authUser.email ?? '',
        role: resolvedRole,
        firstName: strVal('first_name'),
        lastName: strVal('last_name'),
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
          // Signal to all route guards that profile loading is in progress.
          // Without this, guards rendered immediately after login see
          // isLoading=false + user=null and redirect to /login before the
          // profile fetch below completes.
          setLoading(true);
          (async () => {
            const { data, error } = await supabase
              .from('users')
              .select('*, seller_profiles(sellerStatus)')
              .eq('id', session.user.id)
              .maybeSingle();
            if (data) {
              // Blocked users must not be rehydrated — sign them out immediately.
              if (data.isActive === false) {
                await supabase.auth.signOut();
                setUser(null);
                return;
              }
              normalizeSellerStatus(data as unknown as Record<string, unknown>);
              // Always derive isEmailVerified from Supabase Auth (source of truth).
              (data as Record<string, unknown>).isEmailVerified =
                session.user.email_confirmed_at != null;
              setUser(data);
            } else {
              if (error) {
                console.warn('users table query failed, falling back to auth session:', error.message);
                setUser(userFromSession(session.user));
              } else {
                // Row not found — treat as signed-out.
                setUser(null);
              }
            }
          })().catch((err: unknown) => {
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
        <Route path="checkout" element={<Suspense fallback={<PageLoader />}><PPCheckout /></Suspense>} />
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
        <Route path="wholesale-info" element={<Suspense fallback={<PageLoader />}><PPWholesaleInfo /></Suspense>} />

        {/* ── Pixel-perfect auth pages (standalone full-page designs) ──────────── */}
        <Route path="login" element={<Suspense fallback={<PageLoader />}><PPLogin /></Suspense>} />
        <Route path="register" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="signup" element={<Suspense fallback={<PageLoader />}><PPSignup /></Suspense>} />
        <Route path="trade-account" element={<Suspense fallback={<PageLoader />}><PPTradeAccount /></Suspense>} />
        <Route path="forgot-password" element={<Suspense fallback={<PageLoader />}><PPForgotPassword /></Suspense>} />
        <Route path="reset-password" element={<Suspense fallback={<PageLoader />}><PPResetPassword /></Suspense>} />

        {/* /pp — pixel-perfect homepage (preview/alternate root) */}
        <Route path="pp" element={<Navigate to="/" replace />} />

        {/* ── Seller onboarding standalones — defined BEFORE seller shell so they
            take priority when the same sub-path is reached from the browser ──── */}
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

        {/* Seller: Setup page — accessible by any seller (any status) and admins */}
        <Route path="seller/setup" element={
          <RequireSellerAny>
            <Suspense fallback={<PageLoader />}><SellerSetupPage /></Suspense>
          </RequireSellerAny>
        } />

        {/* Seller: Profile edit — accessible by any seller (any status) and admins */}
        <Route path="seller/profile" element={
          <RequireSellerAny>
            <Suspense fallback={<PageLoader />}><PPSellerProfile /></Suspense>
          </RequireSellerAny>
        } />

        {/* ── Dashboard shells ────────────────────────────────────────────────── */}
        {/* /seller – RequireSeller */}
        <Route path="seller" element={
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
          <Route path="settings" element={<Suspense fallback={<PageLoader />}><PPSellerSettings /></Suspense>} />
          <Route path="notifications" element={<Suspense fallback={<PageLoader />}><PPSellerNotifications /></Suspense>} />
        </Route>

        {/* /buyer – RequireBuyer (buyer role only; sellers→/seller, admins→/admin) */}
        <Route path="buyer" element={
          <RequireBuyer>
            <Suspense fallback={<PageLoader />}><PPBuyerShell /></Suspense>
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
        </Route>

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
        <Route path="seller-register" element={<Navigate to="/register?type=seller" replace />} />
        <Route path="seller-dashboard" element={<Navigate to="/seller" replace />} />
        <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />

        {/* ── Wildcard — pixel-perfect 404 ─────────────────────────────────────── */}
        <Route path="*" element={<Suspense fallback={<PageLoader />}><PPNotFound /></Suspense>} />
        </Routes>
      </MaintenanceModeGate>
      {/* Cookie consent banner — rendered once globally, outside the router tree
          so it persists across route changes. Self-manages visibility via
          localStorage (key: loadify_cookie_consent). */}
      <CookieConsent />
    </CartProvider>
  );
}

export default App;