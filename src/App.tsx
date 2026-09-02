import { Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAuthStore } from './store';
import { hasAdminAccess, hasBuyerAccess, hasSellerAccess } from './lib/roleUtils';
import { CartProvider } from './contexts/CartContext';
import CookieConsent from './components/CookieConsent';
import Header from './components/Header';
import AmbientLayer from './components/AmbientLayer';
import { isCapacitorNative } from './lib/capacitorUtils';
import { usePushTokenRegistration } from './hooks/usePushTokenRegistration';
import { supabase } from './lib/supabase';

import RequireAdmin from './components/auth/RequireAdmin';
import RequireAuth from './components/auth/RequireAuth';
import RequireSeller from './components/auth/RequireSeller';
import RequireSellerAny from './components/auth/RequireSellerAny';
import RequireBuyer from './components/auth/RequireBuyer';
import RequireEmailVerified from './components/auth/RequireEmailVerified';
import AuthPromptModal from './components/AuthPromptModal';
import MobileSellGate from './components/MobileSellGate';

// ─── Auth callback — OAuth redirect landing page ──────────────────────────────
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));

// ─── Mobile standalone pages ──────────────────────────────────────────────────
const MobileInboxPage = lazy(() => import('./pages/MobileInboxPage'));
const MobileChatPage = lazy(() => import('./pages/MobileChatPage'));
const MobileOrdersPage = lazy(() => import('./pages/MobileOrdersPage'));
const MobileCategoriesPage = lazy(() => import('./pages/MobileCategoriesPage'));
const MobileProfilePage = lazy(() => import('./pages/MobileProfilePage'));
const MobileNotificationsPage = lazy(() => import('./pages/MobileNotificationsPage'));
const MobileSecurityPage = lazy(() => import('./pages/MobileSecurityPage'));
const MobileBalancePage = lazy(() => import('./pages/MobileBalancePage'));
const MobileFavouritesPage = lazy(() => import('./pages/MobileFavouritesPage'));
const MobileSettingsPage = lazy(() => import('./pages/MobileSettingsPage'));
const MobileSellerPaymentsPage = lazy(() => import('./pages/MobileSellerPaymentsPage'));

// ─── Homepage ─────────────────────────────────────────────────────────────────
const Home = lazy(() => import('./pages/Home'));

// ─── Public platform presentation pages ───────────────────────────────────────
const PlatformPage = lazy(() => import('./pages/public/PlatformPage'));
const BuyersPage = lazy(() => import('./pages/public/BuyersPage'));
const SellersPage = lazy(() => import('./pages/public/SellersPage'));
const TradePage = lazy(() => import('./pages/public/TradePage'));
const SuppliersPage = lazy(() => import('./pages/public/SuppliersPage'));
const IntegrationsPage = lazy(() => import('./pages/public/IntegrationsPage'));
const PartnersPage = lazy(() => import('./pages/public/PartnersPage'));
const DevelopersPage = lazy(() => import('./pages/public/DevelopersPage'));
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage'));
const TrustPage = lazy(() => import('./pages/public/TrustPage'));

// ─── Pixel-perfect pages — standalone (include own Header + Footer) ───────────
const PPCatalog = lazy(() => import('./pages/pixel-perfect/Catalog'));
const PPCategoryPage = lazy(() => import('./pages/pixel-perfect/CategoryPage'));
const PPProductDetail = lazy(() => import('./pages/pixel-perfect/ProductDetail'));
const PPCart = lazy(() => import('./pages/pixel-perfect/Cart'));
const PPCheckout = lazy(() => import('./pages/pixel-perfect/Checkout'));
const PPAboutUs = lazy(() => import('./pages/pixel-perfect/AboutUs'));
const PPContactUs = lazy(() => import('./pages/pixel-perfect/ContactUs'));
const PPDeals = lazy(() => import('./pages/pixel-perfect/Deals'));
const PPTerms = lazy(() => import('./pages/pixel-perfect/TermsAndConditions'));
const PPPrivacy = lazy(() => import('./pages/pixel-perfect/PrivacyPolicy'));
const PPCookies = lazy(() => import('./pages/pixel-perfect/CookiePolicy'));
const PPReturnsPolicy = lazy(() => import('./pages/pixel-perfect/ReturnsPolicy'));
const PPShippingPolicy = lazy(() => import('./pages/pixel-perfect/ShippingPolicy'));
const PPBuyerTerms = lazy(() => import('./pages/pixel-perfect/BuyerTerms'));
const PPSellerTerms = lazy(() => import('./pages/pixel-perfect/SellerTerms'));
const PPDisclaimer = lazy(() => import('./pages/pixel-perfect/Disclaimer'));
const PPFAQ = lazy(() => import('./pages/pixel-perfect/FAQ'));
const PPWholesaleInfo = lazy(() => import('./pages/pixel-perfect/WholesaleInfo'));
const PPCheckoutError = lazy(() => import('./pages/pixel-perfect/CheckoutError'));
const PPNotFound = lazy(() => import('./pages/pixel-perfect/NotFound'));

// ─── Pixel-perfect auth pages — standalone (full-page designs) ───────────────
const PPLogin = lazy(() => import('./pages/pixel-perfect/Login'));
const PPSignup = lazy(() => import('./pages/pixel-perfect/Signup'));
const PPTradeAccount = lazy(() => import('./pages/pixel-perfect/TradeAccount'));
const PPForgotPassword = lazy(() => import('./pages/pixel-perfect/ForgotPassword'));
const PPResetPassword = lazy(() => import('./pages/pixel-perfect/ResetPassword'));

// ─── Functional pages — no pixel-perfect equivalent yet ──────────────────────
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const ProductFormPage = lazy(() => import('./pages/ProductFormPage'));
const MobileSellWizard = lazy(() => import('./pages/MobileSellWizard'));
const SellerPublicProfilePage = lazy(() => import('./pages/SellerPublicProfilePage'));
const AdminSellerDetailPage = lazy(() => import('./pages/AdminSellerDetailPage'));
const TrackOrderPage = lazy(() => import('./pages/TrackOrderPage'));
const AcceptableUsePolicyPage = lazy(() => import('./pages/legal/AcceptableUsePolicyPage'));
const ProhibitedItemsPolicyPage = lazy(() => import('./pages/legal/ProhibitedItemsPolicyPage'));
const SellerVerificationPolicyPage = lazy(() => import('./pages/legal/SellerVerificationPolicyPage'));
const IntellectualPropertyComplaintsPage = lazy(() => import('./pages/legal/IntellectualPropertyComplaintsPage'));
const SellerGuidelinesPage = lazy(() => import('./pages/SellerGuidelinesPage'));
const RoleSelection = lazy(() => import('./pages/onboarding/RoleSelection'));
const SellerOnboarding = lazy(() => import('./pages/onboarding/SellerOnboarding'));
const SellerSetupPage = lazy(() => import('./pages/pixel-perfect/seller/SellerSetupPage'));
const AppOnboarding = lazy(() => import('./pages/AppOnboarding'));

// ─── Pixel-perfect dashboard shells ──────────────────────────────────────────
const PPSellerShell = lazy(() => import('./pages/pixel-perfect/seller/SellerShell'));
const PPSellerDashboard = lazy(() => import('./pages/pixel-perfect/seller/SellerDashboard'));
const PPSellerProducts = lazy(() => import('./pages/pixel-perfect/seller/SellerProducts'));
const PPSellerOrders = lazy(() => import('./pages/pixel-perfect/seller/SellerOrders'));
const PPSellerShipments = lazy(() => import('./pages/pixel-perfect/seller/SellerShipments'));
const PPSellerReturns = lazy(() => import('./pages/pixel-perfect/seller/SellerReturns'));
const PPSellerProfile = lazy(() => import('./pages/pixel-perfect/seller/SellerProfile'));
const PPSellerSettings = lazy(() => import('./pages/pixel-perfect/seller/SellerSettings'));
const PPSellerReviews = lazy(() => import('./pages/pixel-perfect/seller/SellerReviewsPage'));
const PPSellerNotifications = lazy(() => import('./pages/pixel-perfect/seller/SellerNotifications'));
const PPSellerMessages = lazy(() => import('./pages/pixel-perfect/seller/SellerMessages'));

const PPBuyerShell = lazy(() => import('./pages/pixel-perfect/buyer/BuyerShell'));
const PPBuyerDashboard = lazy(() => import('./pages/pixel-perfect/buyer/BuyerDashboard'));
const PPBuyerOrders = lazy(() => import('./pages/pixel-perfect/buyer/BuyerOrders'));
const PPBuyerAddresses = lazy(() => import('./pages/pixel-perfect/buyer/BuyerAddresses'));
const PPBuyerPayments = lazy(() => import('./pages/pixel-perfect/buyer/BuyerPayments'));
const PPBuyerReviews = lazy(() => import('./pages/pixel-perfect/buyer/BuyerReviews'));
const PPBuyerProfile = lazy(() => import('./pages/pixel-perfect/buyer/BuyerProfile'));
const PPBuyerSettings = lazy(() => import('./pages/pixel-perfect/buyer/BuyerSettings'));
const PPBuyerWishlist = lazy(() => import('./pages/pixel-perfect/buyer/BuyerWishlist'));
const PPBuyerNotifications = lazy(() => import('./pages/pixel-perfect/buyer/BuyerNotifications'));
const PPBuyerMessages = lazy(() => import('./pages/pixel-perfect/buyer/BuyerMessages'));
const PPBuyerDisputes = lazy(() => import('./pages/pixel-perfect/buyer/BuyerDisputes'));

const PPAdminShell = lazy(() => import('./pages/pixel-perfect/admin/AdminShell'));
const PPAdminDashboard = lazy(() => import('./pages/pixel-perfect/admin/AdminDashboard'));
const PPAdminUsers = lazy(() => import('./pages/pixel-perfect/admin/AdminUsers'));
const PPAdminBuyers = lazy(() => import('./pages/pixel-perfect/admin/AdminBuyers'));
const PPAdminApprovals = lazy(() => import('./pages/pixel-perfect/admin/AdminApprovals'));
const PPAdminProducts = lazy(() => import('./pages/pixel-perfect/admin/AdminProducts'));
const PPAdminOrders = lazy(() => import('./pages/pixel-perfect/admin/AdminOrders'));
const PPAdminFlagged = lazy(() => import('./pages/pixel-perfect/admin/AdminFlagged'));
const PPAdminReports = lazy(() => import('./pages/pixel-perfect/admin/AdminReports'));
const PPAdminSupport = lazy(() => import('./pages/pixel-perfect/admin/AdminSupport'));
const PPAdminSettings = lazy(() => import('./pages/pixel-perfect/admin/AdminSettings'));
const PPAdminNotifications = lazy(() => import('./pages/pixel-perfect/admin/AdminNotifications'));
const PPAdminPayouts = lazy(() => import('./pages/pixel-perfect/admin/AdminPayouts'));
const PPAdminStripeEvents = lazy(() => import('./pages/pixel-perfect/admin/AdminStripeEvents'));
const PPAdminDisputes = lazy(() => import('./pages/pixel-perfect/admin/AdminDisputes'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

function DashboardRedirect() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.isActive !== true) return <Navigate to="/login?error=account_inactive" replace />;
  if (hasAdminAccess(user)) return <Navigate to="/admin" replace />;
  if (hasSellerAccess(user)) return <Navigate to="/seller" replace />;
  if (hasBuyerAccess(user)) return <Navigate to="/buyer" replace />;
  return <Navigate to="/login" replace />;
}

function TrackingRedirect() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  return <Navigate to={`/track-order${orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : ''}`} replace />;
}

function CategoryRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/category/${slug ?? ''}`} replace />;
}

function isTrustedNativeDeepLink(parsed: URL): boolean {
  if (parsed.protocol === 'loadifymarket:') {
    return parsed.hostname === 'app' && parsed.pathname.startsWith('/auth/callback');
  }
  return parsed.protocol === 'https:' && parsed.hostname === 'loadifymarket.co.uk';
}

function MaintenanceModeGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
      .then(({ data }) => {
        const val = data?.value;
        setMaintenanceMode(val === true || val === 'true');
      }, () => setMaintenanceMode(false));
  }, []);

  if (isLoading || maintenanceMode === null) return <>{children}</>;
  if (maintenanceMode && user && hasAdminAccess(user)) return <>{children}</>;
  if (maintenanceMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
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
  const { user, setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  usePushTokenRegistration(user?.id);

  useEffect(() => {
    document.documentElement.classList.add('market-light-root');
    return () => document.documentElement.classList.remove('market-light-root');
  }, []);

  useEffect(() => {
    const el = document.getElementById('main-content');
    if (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: false });
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!isCapacitorNative()) return;

    let removeListener: (() => void) | undefined;

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url);
          if (!isTrustedNativeDeepLink(parsed)) {
            console.warn('[DeepLink] Ignored untrusted URL origin');
            return;
          }
          if (parsed.pathname.startsWith('/auth/callback')) {
            await supabase.auth.getSession();
            navigate('/auth/callback' + parsed.search + parsed.hash, { replace: true });
            return;
          }
          const inAppPath = parsed.pathname + parsed.search + parsed.hash;
          navigate(inAppPath, { replace: true });
        } catch {
          // Malformed URL — ignore.
        }
      }).then((handle) => {
        removeListener = () => handle.remove();
      });
    }).catch(() => { /* @capacitor/app not available — no-op */ });

    return () => removeListener?.();
  }, [navigate]);

  useEffect(() => {
    function normalizeSellerStatus(data: Record<string, unknown>): void {
      const sp = data['seller_profiles'];
      if (Array.isArray(sp) && sp.length > 0) {
        const status = (sp[0] as Record<string, unknown>)['sellerStatus'];
        if (typeof status === 'string') data['sellerStatus'] = status;
      }
      delete data['seller_profiles'];
    }

    let cleanup: (() => void) | undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(true);
        void Promise.resolve(
          supabase
            .from('users')
            .select('*, seller_profiles(sellerStatus)')
            .eq('id', session.user.id)
            .maybeSingle()
        ).then(({ data, error }) => {
          if (data) {
            if (data.isActive === false) {
              supabase.auth.signOut();
              setUser(null);
              return;
            }
            normalizeSellerStatus(data as unknown as Record<string, unknown>);
            (data as Record<string, unknown>).isEmailVerified = session.user.email_confirmed_at != null;
            (data as Record<string, unknown>).isAdmin = (data as Record<string, unknown>).role === 'admin';
            setUser(data);
          } else {
            if (error) {
              console.warn('[Auth] Authoritative user profile lookup failed; denying protected access:', error.message);
            } else {
              console.warn('[Auth] Authoritative user profile is missing; denying protected access');
            }
            void supabase.auth.signOut({ scope: 'local' }).catch((signOutError) => {
              console.warn('[Auth] Local fail-closed sign-out failed', signOutError);
            });
            setUser(null);
          }
        }).catch((err: unknown) => {
          console.error('[Auth] Profile fetch threw unexpectedly:', err);
          void supabase.auth.signOut({ scope: 'local' }).catch((signOutError) => {
            console.warn('[Auth] Local fail-closed sign-out failed', signOutError);
          });
          setUser(null);
        });
      } else {
        setUser(null);
      }
    });

    cleanup = () => subscription.unsubscribe();
    return () => cleanup?.();
  }, [setUser, setLoading]);

  const publicPage = (page: React.ReactNode) => <Suspense fallback={<PageLoader />}>{page}</Suspense>;

  return (
    <CartProvider>
      <AmbientLayer />
      <Header />
      <AuthPromptModal />
      <MaintenanceModeGate>
        <Routes>
          <Route path="/" element={publicPage(<Home />)} />
          <Route path="platform" element={publicPage(<PlatformPage />)} />
          <Route path="buyers" element={publicPage(<BuyersPage />)} />
          <Route path="sellers" element={publicPage(<SellersPage />)} />
          <Route path="trade" element={publicPage(<TradePage />)} />
          <Route path="suppliers" element={publicPage(<SuppliersPage />)} />
          <Route path="integrations" element={publicPage(<IntegrationsPage />)} />
          <Route path="partners" element={publicPage(<PartnersPage />)} />
          <Route path="developers" element={publicPage(<DevelopersPage />)} />
          <Route path="how-it-works" element={publicPage(<HowItWorksPage />)} />
          <Route path="trust" element={publicPage(<TrustPage />)} />

          <Route path="catalog" element={publicPage(<PPCatalog />)} />
          <Route path="category/:slug" element={publicPage(<PPCategoryPage />)} />
          <Route path="categories/:slug" element={<CategoryRedirect />} />
          <Route path="product/:id" element={publicPage(<PPProductDetail />)} />
          <Route path="cart" element={publicPage(<PPCart />)} />
          <Route path="checkout" element={<RequireEmailVerified>{publicPage(<PPCheckout />)}</RequireEmailVerified>} />
          <Route path="about" element={publicPage(<PPAboutUs />)} />
          <Route path="contact" element={publicPage(<PPContactUs />)} />
          <Route path="deals" element={publicPage(<PPDeals />)} />
          <Route path="clearance" element={<Navigate to="/deals" replace />} />
          <Route path="terms" element={publicPage(<PPTerms />)} />
          <Route path="privacy" element={publicPage(<PPPrivacy />)} />
          <Route path="cookies" element={publicPage(<PPCookies />)} />
          <Route path="returns-policy" element={publicPage(<PPReturnsPolicy />)} />
          <Route path="returns" element={publicPage(<PPReturnsPolicy />)} />
          <Route path="shipping-policy" element={publicPage(<PPShippingPolicy />)} />
          <Route path="shipping" element={publicPage(<PPShippingPolicy />)} />
          <Route path="buyer-terms" element={publicPage(<PPBuyerTerms />)} />
          <Route path="seller-terms" element={publicPage(<PPSellerTerms />)} />
          <Route path="disclaimer" element={publicPage(<PPDisclaimer />)} />
          <Route path="faq" element={publicPage(<PPFAQ />)} />
          <Route path="help" element={<Navigate to="/faq" replace />} />
          <Route path="wholesale-info" element={publicPage(<PPWholesaleInfo />)} />

          <Route path="login" element={publicPage(<PPLogin />)} />
          <Route path="register" element={publicPage(<PPSignup />)} />
          <Route path="signup" element={publicPage(<PPSignup />)} />
          <Route path="trade-account" element={publicPage(<PPTradeAccount />)} />
          <Route path="forgot-password" element={publicPage(<PPForgotPassword />)} />
          <Route path="reset-password" element={publicPage(<PPResetPassword />)} />
          <Route path="auth/callback" element={publicPage(<AuthCallbackPage />)} />
          <Route path="pp" element={<Navigate to="/" replace />} />
          <Route path="welcome" element={publicPage(<AppOnboarding />)} />
          <Route path="onboarding/role-selection" element={publicPage(<RoleSelection />)} />
          <Route path="onboarding" element={<RequireSellerAny><RequireEmailVerified>{publicPage(<SellerOnboarding />)}</RequireEmailVerified></RequireSellerAny>} />

          <Route path="seller/products/new" element={<RequireSeller><RequireEmailVerified>{publicPage(<ProductFormPage />)}</RequireEmailVerified></RequireSeller>} />
          <Route path="seller/products/:id/edit" element={<RequireSeller><RequireEmailVerified>{publicPage(<ProductFormPage />)}</RequireEmailVerified></RequireSeller>} />
          <Route path="seller/setup" element={<RequireSellerAny><RequireEmailVerified>{publicPage(<SellerSetupPage />)}</RequireEmailVerified></RequireSellerAny>} />
          <Route path="seller/analytics" element={<Navigate to="/seller" replace />} />
          <Route path="seller/payouts" element={<Navigate to="/seller/settings" replace />} />
          <Route path="seller/profile" element={<RequireSellerAny><RequireEmailVerified>{publicPage(<PPSellerProfile />)}</RequireEmailVerified></RequireSellerAny>} />

          <Route path="seller" element={<RequireSeller><RequireEmailVerified>{publicPage(<PPSellerShell />)}</RequireEmailVerified></RequireSeller>}>
            <Route index element={publicPage(<PPSellerDashboard />)} />
            <Route path="products" element={publicPage(<PPSellerProducts />)} />
            <Route path="orders" element={publicPage(<PPSellerOrders />)} />
            <Route path="shipments" element={publicPage(<PPSellerShipments />)} />
            <Route path="returns" element={publicPage(<PPSellerReturns />)} />
            <Route path="rfq" element={<Navigate to="/seller" replace />} />
            <Route path="reviews" element={publicPage(<PPSellerReviews />)} />
            <Route path="settings" element={publicPage(<PPSellerSettings />)} />
            <Route path="notifications" element={publicPage(<PPSellerNotifications />)} />
            <Route path="messages" element={publicPage(<PPSellerMessages />)} />
          </Route>

          <Route path="buyer" element={<RequireBuyer><RequireEmailVerified>{publicPage(<PPBuyerShell />)}</RequireEmailVerified></RequireBuyer>}>
            <Route index element={publicPage(<PPBuyerDashboard />)} />
            <Route path="orders" element={publicPage(<PPBuyerOrders />)} />
            <Route path="wishlist" element={publicPage(<PPBuyerWishlist />)} />
            <Route path="addresses" element={publicPage(<PPBuyerAddresses />)} />
            <Route path="payments" element={publicPage(<PPBuyerPayments />)} />
            <Route path="reviews" element={publicPage(<PPBuyerReviews />)} />
            <Route path="profile" element={publicPage(<PPBuyerProfile />)} />
            <Route path="settings" element={publicPage(<PPBuyerSettings />)} />
            <Route path="notifications" element={publicPage(<PPBuyerNotifications />)} />
            <Route path="messages" element={publicPage(<PPBuyerMessages />)} />
            <Route path="rfq" element={<Navigate to="/buyer" replace />} />
            <Route path="disputes" element={publicPage(<PPBuyerDisputes />)} />
          </Route>

          <Route path="admin" element={<RequireAdmin>{publicPage(<PPAdminShell />)}</RequireAdmin>}>
            <Route index element={publicPage(<PPAdminDashboard />)} />
            <Route path="users" element={publicPage(<PPAdminUsers />)} />
            <Route path="buyers" element={publicPage(<PPAdminBuyers />)} />
            <Route path="approvals" element={publicPage(<PPAdminApprovals />)} />
            <Route path="products" element={publicPage(<PPAdminProducts />)} />
            <Route path="orders" element={publicPage(<PPAdminOrders />)} />
            <Route path="flagged" element={publicPage(<PPAdminFlagged />)} />
            <Route path="reports" element={publicPage(<PPAdminReports />)} />
            <Route path="support" element={publicPage(<PPAdminSupport />)} />
            <Route path="settings" element={publicPage(<PPAdminSettings />)} />
            <Route path="notifications" element={publicPage(<PPAdminNotifications />)} />
            <Route path="payouts" element={publicPage(<PPAdminPayouts />)} />
            <Route path="stripe-events" element={publicPage(<PPAdminStripeEvents />)} />
            <Route path="disputes" element={publicPage(<PPAdminDisputes />)} />
          </Route>

          <Route path="inbox" element={<RequireAuth>{publicPage(<MobileInboxPage />)}</RequireAuth>} />
          <Route path="inbox/:conversationId" element={<RequireAuth>{publicPage(<MobileChatPage />)}</RequireAuth>} />
          <Route path="orders" element={<RequireAuth>{publicPage(<MobileOrdersPage />)}</RequireAuth>} />
          <Route path="categories" element={publicPage(<MobileCategoriesPage />)} />
          <Route path="profile" element={publicPage(<MobileProfilePage />)} />
          <Route path="profile/notifications" element={<RequireAuth>{publicPage(<MobileNotificationsPage />)}</RequireAuth>} />
          <Route path="profile/security" element={<RequireAuth>{publicPage(<MobileSecurityPage />)}</RequireAuth>} />
          <Route path="profile/balance" element={<RequireAuth>{publicPage(<MobileBalancePage />)}</RequireAuth>} />
          <Route path="profile/favourites" element={<RequireAuth>{publicPage(<MobileFavouritesPage />)}</RequireAuth>} />
          <Route path="profile/settings" element={<RequireAuth>{publicPage(<MobileSettingsPage />)}</RequireAuth>} />
          <Route path="seller/promote" element={<Navigate to="/seller" replace />} />
          <Route path="seller/mobile-payments" element={<RequireSellerAny>{publicPage(<MobileSellerPaymentsPage />)}</RequireSellerAny>} />
          <Route path="sell" element={<MobileSellGate>{publicPage(<MobileSellWizard />)}</MobileSellGate>} />

          <Route path="order-success" element={publicPage(<OrderSuccessPage />)} />
          <Route path="orders/success" element={<Navigate to="/order-success" replace />} />
          <Route path="checkout/error" element={publicPage(<PPCheckoutError />)} />
          <Route path="seller/:slug" element={publicPage(<SellerPublicProfilePage />)} />
          <Route path="admin/sellers/:id" element={<RequireAdmin>{publicPage(<AdminSellerDetailPage />)}</RequireAdmin>} />
          <Route path="tracking/:orderNumber" element={<TrackingRedirect />} />
          <Route path="track-order" element={publicPage(<TrackOrderPage />)} />
          <Route path="track" element={<Navigate to="/track-order" replace />} />

          <Route path="acceptable-use-policy" element={publicPage(<AcceptableUsePolicyPage />)} />
          <Route path="prohibited-items-policy" element={publicPage(<ProhibitedItemsPolicyPage />)} />
          <Route path="seller-verification-policy" element={publicPage(<SellerVerificationPolicyPage />)} />
          <Route path="ip-trademark-complaints" element={publicPage(<IntellectualPropertyComplaintsPage />)} />
          <Route path="intellectual-property-complaints" element={<Navigate to="/ip-trademark-complaints" replace />} />
          <Route path="seller-guidelines" element={publicPage(<SellerGuidelinesPage />)} />

          <Route path="pp/admin/*" element={<Navigate to="/admin" replace />} />
          <Route path="pp/seller/*" element={<Navigate to="/seller" replace />} />
          <Route path="pp/buyer/*" element={<Navigate to="/buyer" replace />} />
          <Route path="dashboard" element={<DashboardRedirect />} />
          <Route path="shop" element={<Navigate to="/catalog" replace />} />
          <Route path="products" element={<Navigate to="/catalog" replace />} />
          <Route path="blog" element={<Navigate to="/deals" replace />} />
          <Route path="pricing" element={<Navigate to="/seller-terms" replace />} />
          <Route path="seller-register" element={<Navigate to="/register?type=seller" replace />} />
          <Route path="seller-dashboard" element={<Navigate to="/seller" replace />} />
          <Route path="admin-dashboard" element={<Navigate to="/admin" replace />} />

          <Route path="*" element={publicPage(<PPNotFound />)} />
        </Routes>
      </MaintenanceModeGate>
      <CookieConsent />
    </CartProvider>
  );
}

export default App;
