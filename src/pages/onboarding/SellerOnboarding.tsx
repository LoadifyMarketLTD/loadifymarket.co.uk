import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Circle,
  CreditCard,
  ExternalLink,
  Loader2,
  Package,
  RefreshCw,
  Store,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store';
import { hasAdminAccess, hasSellerAccess } from '@/lib/roleUtils';
import { toast } from '@/hooks/use-toast';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { openExternalUrl } from '@/lib/capacitorUtils';

type SellerType = 'individual' | 'sole_trader' | 'company';

interface OnboardingReadiness {
  sellerTypeReady: boolean;
  profileReady: boolean;
  storeReady: boolean;
  catalogueReady: boolean;
  setupComplete: boolean;
  stripeReady: boolean;
  adminReviewPending: boolean;
  sellerActive: boolean;
  nextStep: 1 | 2 | 3 | 4 | 5;
}

interface OnboardingStatus {
  sellerType: SellerType | null;
  sellerStatus: 'draft' | 'submitted' | 'active' | 'suspended' | string;
  requiresAdminApproval: boolean;
  isApproved: boolean;
  profileComplete: boolean;
  store: {
    storeName: string;
    storeSlug: string;
    storeDescription: string;
  };
  productCount: number;
  stripe: {
    connected: boolean;
    status: string | null;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
  onboardingCompleted: boolean;
  onboardingStep: number;
  readiness: OnboardingReadiness;
}

const STEPS = [
  { id: 1, label: 'Seller type', icon: User },
  { id: 2, label: 'Profile details', icon: Building2 },
  { id: 3, label: 'Store identity', icon: Store },
  { id: 4, label: 'Catalogue', icon: Package },
  { id: 5, label: 'Activation', icon: CreditCard },
] as const;

function StepDot({
  step,
  current,
  done,
}: {
  step: number;
  current: number;
  done: boolean;
}) {
  const Icon = STEPS[step - 1].icon;
  const active = step === current;
  return (
    <div className={`flex flex-col items-center gap-1 ${step > current && !done ? 'opacity-45' : ''}`}>
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
          done
            ? 'border-success bg-success text-white'
            : active
              ? 'border-success bg-white text-success'
              : 'border-gray-200 bg-white text-gray-400'
        }`}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
      </div>
      <span className={`hidden text-[10px] font-medium sm:block ${active ? 'text-success' : 'text-gray-400'}`}>
        {STEPS[step - 1].label}
      </span>
    </div>
  );
}

function StatusRow({ label, done, detail }: { label: string; done: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-200 p-4">
      {done ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-gray-300" />
      )}
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {detail ? <p className="mt-0.5 text-xs text-gray-500">{detail}</p> : null}
      </div>
    </div>
  );
}

const SellerOnboarding = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const connectReturn = searchParams.get('connect');
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingType, setSavingType] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');

  const refreshStatus = useCallback(async (quiet = false) => {
    if (!user) return;
    if (!quiet) setRefreshing(true);
    try {
      const response = await authorizedFetch('/.netlify/functions/seller-onboarding-status', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({})) as OnboardingStatus & { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to load Seller setup');

      setStatus(payload);
      setLoadError(null);
      setStep(payload.readiness.nextStep);
      setStoreName(payload.store.storeName ?? '');
      setStoreDescription(payload.store.storeDescription ?? '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      setLoadError(message);
      toast({
        title: 'Unable to load Seller setup',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    if (hasAdminAccess(user)) {
      navigate('/admin', { replace: true });
      return;
    }

    if (!hasSellerAccess(user)) {
      navigate('/buyer', { replace: true });
      return;
    }

    let cancelled = false;

    const loadCanonicalStatus = async () => {
      if (
        connectReturn === 'success' ||
        connectReturn === 'refresh'
      ) {
        try {
          const response = await authorizedFetch(
            '/.netlify/functions/connect-status',
            { method: 'POST' },
          );

          if (!response.ok) {
            console.warn(
              'SellerOnboarding: Stripe return status refresh was not successful',
              response.status,
            );
          }
        } catch (error) {
          console.warn(
            'SellerOnboarding: Stripe return status refresh failed',
            error,
          );
        }
      }

      if (cancelled) return;

      await refreshStatus(true);

      if (
        !cancelled &&
        (
          connectReturn === 'success' ||
          connectReturn === 'refresh'
        )
      ) {
        navigate('/onboarding', { replace: true });
      }
    };

    void loadCanonicalStatus();

    return () => {
      cancelled = true;
    };
  }, [user, navigate, refreshStatus, connectReturn]);

  const completedSteps = useMemo(() => {
    if (!status) return [false, false, false, false, false];
    return [
      status.readiness.sellerTypeReady,
      status.readiness.profileReady,
      status.readiness.storeReady,
      status.readiness.catalogueReady,
      status.readiness.sellerActive,
    ];
  }, [status]);

  const saveSellerType = async (sellerType: SellerType) => {
    setSavingType(true);
    try {
      const response = await authorizedFetch('/.netlify/functions/set-seller-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seller_type', sellerType }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to save Seller type');
      await refreshStatus(true);
    } catch (error) {
      toast({
        title: 'Seller type not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingType(false);
    }
  };

  const saveStoreIdentity = async () => {
    setSavingStore(true);
    try {
      const response = await authorizedFetch('/.netlify/functions/set-seller-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'store_identity',
          storeName,
          storeDescription,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to save store identity');
      await refreshStatus(true);
    } catch (error) {
      toast({
        title: 'Store identity not saved',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingStore(false);
    }
  };

  const connectStripe = async () => {
    setConnecting(true);
    try {
      const response = await authorizedFetch('/.netlify/functions/connect-onboard', {
        method: 'POST',
      });
      const payload = await response.json().catch(() => ({})) as { url?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to start Stripe setup');
      if (!payload.url) throw new Error('Stripe onboarding URL was not returned');
      await openExternalUrl(payload.url);
    } catch (error) {
      toast({
        title: 'Stripe setup failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setConnecting(false);
    }
  };

  if (user && (hasAdminAccess(user) || !hasSellerAccess(user))) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-success" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Seller setup unavailable</h1>
          <p className="mt-2 text-sm text-gray-500">
            {loadError || 'Seller setup could not be loaded. Please try again.'}
          </p>
          <Button
            className="mt-6 bg-success text-white hover:bg-success/90"
            onClick={() => void refreshStatus()}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Retry Seller setup
          </Button>
        </div>
      </div>
    );
  }

  if (status.sellerStatus === 'suspended') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Seller account suspended</h1>
          <p className="mt-2 text-sm text-gray-500">
            Seller onboarding and commercial activation are unavailable while this account is suspended.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/contact">Contact support</Link>
          </Button>
        </div>
      </div>
    );
  }

  const individualProfile = status.sellerType === 'individual';
  const profileLabel = individualProfile ? 'Individual seller profile' : 'Business / trader profile';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-success">Marketplace Seller</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Seller setup & activation</h1>
            <p className="mt-1 max-w-xl text-sm text-gray-500">
              Complete your marketplace setup from persisted account facts. Payments and account activation are shown separately so no step is marked verified simply because it was visited.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshStatus()}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh status
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-2">
            {STEPS.map((item) => (
              <StepDot
                key={item.id}
                step={item.id}
                current={step}
                done={completedSteps[item.id - 1]}
              />
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${(completedSteps.filter(Boolean).length / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Choose your legal seller type</h2>
                <p className="mt-1 text-sm text-gray-500">
                  This describes who is selling on Loadify. It is separate from your public store name.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ['individual', 'Individual', 'Selling in your own name'],
                  ['sole_trader', 'Sole trader', 'Trading as a self-employed business'],
                  ['company', 'Company', 'Registered company or organisation'],
                ] as const).map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={savingType}
                    onClick={() => void saveSellerType(value)}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      status.sellerType === value
                        ? 'border-success bg-success/10'
                        : 'border-gray-200 hover:border-success/40'
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{label}</p>
                    <p className="mt-1 text-xs text-gray-500">{description}</p>
                  </button>
                ))}
              </div>
              {savingType ? (
                <p className="flex items-center text-sm text-gray-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</p>
              ) : null}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {individualProfile ? 'Complete your personal seller details' : 'Complete your legal & business details'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {individualProfile
                    ? 'Add your personal identity, contact and address information. Business name, Company Number and VAT Number are not required unless they genuinely apply.'
                    : 'Add the factual identity, contact and address information required for your seller type. Company and VAT details are required only when applicable.'}
                </p>
              </div>
              <StatusRow
                label={profileLabel}
                done={status.profileComplete}
                detail={status.profileComplete ? 'Required persisted profile fields are present.' : 'Your seller profile still has required information missing.'}
              />
              <Button asChild className="w-full bg-success text-white hover:bg-success/90">
                <Link to="/seller/profile">{status.profileComplete ? 'Review Seller Profile' : 'Complete Seller Profile'}</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={() => void refreshStatus()} disabled={refreshing}>
                Re-check saved details
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create your public store identity</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Your store name is customer-facing and remains separate from your legal/business identity.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="store-name">Store name</Label>
                  <Input
                    id="store-name"
                    className="mt-1"
                    value={storeName}
                    maxLength={80}
                    onChange={(event) => setStoreName(event.target.value)}
                    placeholder="Your public store name"
                  />
                </div>
                <div>
                  <Label htmlFor="store-description">Store description <span className="text-gray-400">(optional)</span></Label>
                  <Textarea
                    id="store-description"
                    className="mt-1 min-h-28"
                    value={storeDescription}
                    maxLength={1000}
                    onChange={(event) => setStoreDescription(event.target.value)}
                    placeholder="Tell buyers what your store specialises in."
                  />
                </div>
              </div>
              <Button
                className="w-full bg-success text-white hover:bg-success/90"
                onClick={() => void saveStoreIdentity()}
                disabled={savingStore || storeName.trim().length < 2}
              >
                {savingStore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Store className="mr-2 h-4 w-4" />}
                Save store identity
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Prepare your first product listing</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add at least one marketplace product. During onboarding you may save it as a draft; public publishing remains locked until your commercial readiness checks pass.
                </p>
              </div>
              <StatusRow
                label="Catalogue draft"
                done={status.readiness.catalogueReady}
                detail={status.productCount > 0 ? `${status.productCount} product listing${status.productCount === 1 ? '' : 's'} saved.` : 'No product listing has been saved yet.'}
              />
              <Button asChild className="w-full bg-success text-white hover:bg-success/90">
                <Link to="/seller/products/new">Add a product draft</Link>
              </Button>
              <Button variant="outline" className="w-full" onClick={() => void refreshStatus()} disabled={refreshing}>
                Re-check catalogue
              </Button>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payments & seller activation</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Marketplace setup and commercial activation are separate. Stripe provides payment-account readiness signals; Loadify does not treat a Stripe step as a substitute for every platform verification obligation.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <StatusRow label="Seller type" done={status.readiness.sellerTypeReady} />
                <StatusRow label={profileLabel} done={status.readiness.profileReady} />
                <StatusRow label="Store identity" done={status.readiness.storeReady} />
                <StatusRow label="Catalogue draft" done={status.readiness.catalogueReady} />
                <StatusRow
                  label="Stripe charges & payouts"
                  done={status.readiness.stripeReady}
                  detail={status.stripe.status ? `Stripe status: ${status.stripe.status}` : 'Stripe account not connected yet.'}
                />
                <StatusRow
                  label="Seller account active"
                  done={status.readiness.sellerActive}
                  detail={`Current seller status: ${status.sellerStatus}`}
                />
              </div>

              {status.readiness.setupComplete && !status.readiness.sellerActive ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  Your marketplace setup is saved. Your Seller Workspace remains locked until the separate activation requirements below are satisfied.
                </div>
              ) : null}

              {!status.readiness.stripeReady ? (
                <Button
                  onClick={() => void connectStripe()}
                  disabled={connecting}
                  className="w-full bg-success text-white hover:bg-success/90"
                >
                  {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                  {status.stripe.connected ? 'Continue Stripe setup' : 'Connect Stripe for payments'}
                </Button>
              ) : null}

              {status.readiness.adminReviewPending ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Your seller type requires Loadify review under the current platform policy. Stripe readiness does not bypass that review.
                </div>
              ) : null}

              {status.readiness.sellerActive ? (
                <Button className="w-full bg-success text-white hover:bg-success/90" onClick={() => navigate('/seller', { replace: true })}>
                  Go to Seller Workspace
                </Button>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => void refreshStatus()} disabled={refreshing}>
                  {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Check activation status
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Progress is saved from persisted account, store, catalogue and payment facts. There is no skip-to-active shortcut.
        </p>
      </div>
    </div>
  );
};

export default SellerOnboarding;
