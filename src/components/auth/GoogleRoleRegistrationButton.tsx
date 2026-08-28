import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isCapacitorContext } from '@/lib/capacitorUtils';

type RequestedRole = 'buyer' | 'seller';
type SellerType = '' | 'individual' | 'sole_trader' | 'company';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityApi = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        nonce: string;
        use_fedcm_for_prompt?: boolean;
        auto_select?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          text?: 'signup_with' | 'signin_with' | 'continue_with' | 'signin';
          shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          width?: number;
        },
      ) => void;
    };
  };
};

type GoogleWindow = Window & { google?: GoogleIdentityApi };

interface Props {
  role: RequestedRole;
  sellerType: SellerType;
  disabled: boolean;
  onError: (message: string) => void;
}

const GOOGLE_SCRIPT_ID = 'loadify-google-gsi';
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

function getGoogleApi(): GoogleIdentityApi | undefined {
  return (window as GoogleWindow).google;
}

function loadGoogleIdentityServices(): Promise<GoogleIdentityApi> {
  const existingApi = getGoogleApi();
  if (existingApi) return Promise.resolve(existingApi);

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;

    const resolveWhenReady = () => {
      const api = getGoogleApi();
      if (api) resolve(api);
      else reject(new Error('Google Identity Services did not initialize.'));
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolveWhenReady();
        return;
      }
      existingScript.addEventListener('load', resolveWhenReady, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = GOOGLE_SCRIPT_ID;
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolveWhenReady();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Identity Services could not be loaded.')), { once: true });
    document.head.appendChild(script);
  });
}

function createRawNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Web-only role-bound Google registration.
 *
 * Capacitor/native intentionally returns null so the downloadable app keeps its
 * existing registration UI and OAuth flow unchanged. On web, the provider token
 * is verified server-side before Supabase Auth is allowed to create the account.
 */
export default function GoogleRoleRegistrationButton({ role, sellerType, disabled, onError }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  const nativeContext = isCapacitorContext();

  useEffect(() => {
    if (nativeContext || !clientId || disabled || !containerRef.current) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const container = containerRef.current;

    const setBusyState = (value: boolean) => {
      busyRef.current = value;
      setBusy(value);
    };

    const initialize = async () => {
      try {
        const google = await loadGoogleIdentityServices();
        if (cancelled) return;

        const rawNonce = createRawNonce();
        const hashedNonce = await sha256Hex(rawNonce);
        if (cancelled) return;

        container.replaceChildren();
        google.accounts.id.initialize({
          client_id: clientId,
          nonce: hashedNonce,
          auto_select: false,
          use_fedcm_for_prompt: true,
          callback: (response) => {
            void (async () => {
              if (!response.credential || busyRef.current) return;
              setBusyState(true);
              onError('');

              try {
                const intentResponse = await fetch('/.netlify/functions/register-social-intent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    provider: 'google',
                    credential: response.credential,
                    nonce: rawNonce,
                    requestedRole: role,
                    ...(role === 'seller' ? { sellerType } : {}),
                  }),
                });

                const intentPayload = await intentResponse.json().catch(() => ({})) as { error?: string };
                if (!intentResponse.ok) {
                  throw new Error(intentPayload.error || 'Google registration could not be initialized.');
                }

                const { error: authError } = await supabase.auth.signInWithIdToken({
                  provider: 'google',
                  token: response.credential,
                  nonce: rawNonce,
                });

                if (authError) throw authError;
                navigate('/dashboard', { replace: true });
              } catch (error) {
                onError(error instanceof Error ? error.message : 'Google registration failed. Please try again.');
                setBusyState(false);
                if (!cancelled) void initialize();
              }
            })();
          },
        });

        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'rectangular',
          width: Math.min(container.clientWidth || 360, 400),
        });
        setReady(true);
      } catch (error) {
        if (cancelled) return;
        setReady(false);
        onError(error instanceof Error ? error.message : 'Google registration is unavailable.');
      }
    };

    void initialize();
    return () => { cancelled = true; };
  }, [clientId, disabled, nativeContext, navigate, onError, role, sellerType]);

  if (nativeContext || !clientId) return null;

  if (disabled) {
    return (
      <div className="mt-5">
        <button
          type="button"
          disabled
          className="min-h-11 w-full rounded-xl border border-[#0A234F]/15 bg-[#F8FAFC] text-sm font-bold text-[#94A3B8] opacity-80"
        >
          Sign up with Google
        </button>
        <p className="mt-2 text-center text-[11px] font-medium text-[#64748B]">
          Complete the required declarations above to use Google registration.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 border-t border-[#0A234F]/10 pt-5">
      <div className="mb-3 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">
        <span className="h-px flex-1 bg-[#0A234F]/10" />
        <span>or</span>
        <span className="h-px flex-1 bg-[#0A234F]/10" />
      </div>
      <div
        ref={containerRef}
        aria-busy={busy || !ready}
        className="flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl"
      >
        {!ready && <span className="text-xs font-semibold text-[#64748B]">Loading Google registration…</span>}
      </div>
      {busy && <p className="mt-2 text-center text-xs font-semibold text-[#0E3FA9]">Verifying your Google account…</p>}
    </div>
  );
}
