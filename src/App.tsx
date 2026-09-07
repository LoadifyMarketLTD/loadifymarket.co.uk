import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense, useState } from 'react';
import { useAuthStore } from './store';
import { hasAdminAccess } from './lib/roleUtils';
import { CartProvider } from './contexts/CartContext';
import CookieConsent from './components/CookieConsent';
import Header from './components/Header';
import AmbientLayer from './components/AmbientLayer';
import { isCapacitorNative } from './lib/capacitorUtils';
import { usePushTokenRegistration } from './hooks/usePushTokenRegistration';

import AuthPromptModal from './components/AuthPromptModal';

const Home = lazy(() => import('./pages/Home'));
const AppRoutes = lazy(() => import('./AppRoutes'));

function AppShellLoader() {
  return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" /></div>;
}

function isTrustedNativeDeepLink(parsed: URL): boolean {
  if (parsed.protocol === 'loadifymarket:') return parsed.hostname === 'app' && parsed.pathname.startsWith('/auth/callback');
  return parsed.protocol === 'https:' && parsed.hostname === 'loadifymarket.co.uk';
}

function MaintenanceModeGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    const baseUrl = String(import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
    const anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '');
    if (!baseUrl || !anonKey) {
      queueMicrotask(() => setMaintenanceMode(false));
      return;
    }
    const url = `${baseUrl}/rest/v1/platform_settings?key=eq.maintenance_mode&select=value&limit=1`;
    void fetch(url, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`maintenance HTTP ${response.status}`);
      const rows = await response.json() as Array<{ value?: unknown }>;
      if (cancelled) return;
      const val = rows[0]?.value;
      setMaintenanceMode(val === true || val === 'true');
    }).catch(() => {
      if (!cancelled) setMaintenanceMode(false);
    });
    return () => { cancelled = true; };
  }, []);
  if (isLoading || maintenanceMode === null) return <>{children}</>;
  if (maintenanceMode && user && hasAdminAccess(user)) return <>{children}</>;
  if (maintenanceMode) return <div className="min-h-screen bg-background flex items-center justify-center px-6"><div className="text-center max-w-lg"><div className="text-6xl mb-6">🔧</div><h1 className="text-3xl font-bold text-white mb-3">We're under maintenance</h1><p className="text-slate-400 text-base mb-6">Loadify Market is currently undergoing scheduled maintenance. We'll be back shortly. Thank you for your patience.</p><p className="text-slate-500 text-sm">If you are an admin, please <a href="/login" className="text-blue-600 underline">sign in</a> to access the platform.</p></div></div>;
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
          if (!isTrustedNativeDeepLink(parsed)) { console.warn('[DeepLink] Ignored untrusted URL origin'); return; }
          if (parsed.pathname.startsWith('/auth/callback')) { const { supabase } = await import('./lib/supabase'); await supabase.auth.getSession(); navigate('/auth/callback' + parsed.search + parsed.hash, { replace: true }); return; }
          navigate(parsed.pathname + parsed.search + parsed.hash, { replace: true });
        } catch { /* malformed URL — ignore */ }
      }).then((handle) => { removeListener = () => handle.remove(); });
    }).catch(() => {});
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
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    let timer: number | undefined;
    const startAuth = () => {
      if (disposed) return;
      void import('./lib/supabase').then(({ supabase }) => {
        if (disposed) return;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(true);
        void Promise.all([
          Promise.resolve(supabase.from('users').select('*, seller_profiles(sellerStatus)').eq('id', session.user.id).maybeSingle()),
          Promise.resolve(
            supabase
              .from('account_capabilities')
              .select('capability')
              .eq('user_id', session.user.id)
              .is('revoked_at', null),
          ),
        ]).then(([profileResult, capabilityResult]) => {
          const { data, error } = profileResult;
          if (data) {
            if (data.isActive === false) { supabase.auth.signOut(); setUser(null); return; }
            normalizeSellerStatus(data as unknown as Record<string, unknown>);
            if (!capabilityResult.error) {
              const capabilities = (capabilityResult.data ?? [])
                .map((row) => (row as { capability?: unknown }).capability)
                .filter((capability): capability is 'buyer' | 'seller' => capability === 'buyer' || capability === 'seller');
              (data as Record<string, unknown>).capabilities = [...new Set(capabilities)];
            } else {
              (data as Record<string, unknown>).capabilities = [];
              console.warn('[Auth] Capability projection lookup failed; protected capability access stays fail-closed:', capabilityResult.error.message);
            }
            (data as Record<string, unknown>).isEmailVerified = session.user.email_confirmed_at != null;
            (data as Record<string, unknown>).isAdmin = (data as Record<string, unknown>).role === 'admin';
            setUser(data);
          } else {
            if (error) console.warn('[Auth] Authoritative user profile lookup failed; denying protected access:', error.message);
            else console.warn('[Auth] Authoritative user profile is missing; denying protected access');
            void supabase.auth.signOut({ scope: 'local' }).catch((signOutError) => console.warn('[Auth] Local fail-closed sign-out failed', signOutError));
            setUser(null);
          }
        }).catch((err: unknown) => {
          console.error('[Auth] Profile fetch threw unexpectedly:', err);
          void supabase.auth.signOut({ scope: 'local' }).catch((signOutError) => console.warn('[Auth] Local fail-closed sign-out failed', signOutError));
          setUser(null);
        });
      } else setUser(null);
      });
        unsubscribe = () => subscription.unsubscribe();
      }).catch((err: unknown) => {
        if (disposed) return;
        console.error('[Auth] Failed to load authentication client:', err);
        setUser(null);
      });
    };
    if (location.pathname === '/') timer = window.setTimeout(startAuth, 5000);
    else startAuth();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      unsubscribe?.();
    };
  }, [location.pathname, setUser, setLoading]);


  if (location.pathname === '/') {
    return (
      <>
        <AmbientLayer />
        <MaintenanceModeGate>
          <Suspense fallback={<AppShellLoader />}><Home /></Suspense>
        </MaintenanceModeGate>
        <CookieConsent />
      </>
    );
  }

  return (
    <CartProvider>
      <AmbientLayer />
      <Header />
      <AuthPromptModal />
      <MaintenanceModeGate>
        <Suspense fallback={<AppShellLoader />}><AppRoutes /></Suspense>
      </MaintenanceModeGate>
      <CookieConsent />
    </CartProvider>
  );
}

export default App;