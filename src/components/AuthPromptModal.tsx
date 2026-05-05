/**
 * AuthPromptModal — shown when a guest tries a gated action.
 *
 * "Create an account to continue"
 *   [Create account]  [Log in]  [Continue browsing]
 *
 * Triggered via useAuthPromptStore().open(context?) from any component.
 * Does NOT force login on browse — only actions (message/buy/sell/save/offer).
 */

import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuthPromptStore } from '@/store/authPromptStore';
import type { AuthPromptContext } from '@/store/authPromptStore';

const CONTEXT_MESSAGES: Record<NonNullable<AuthPromptContext>, string> = {
  sell: 'Create an account to start selling.',
  message: 'Create an account to message the seller.',
  buy: 'Create an account to checkout safely.',
  offer: 'Create an account to make an offer.',
  save: 'Create an account to save items.',
};

const DEFAULT_MESSAGE = 'Sign up in seconds to buy, sell, or message safely.';

export default function AuthPromptModal() {
  const { isOpen, context, close } = useAuthPromptStore();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const bodyText = (context && CONTEXT_MESSAGES[context]) ?? DEFAULT_MESSAGE;

  const handleRegister = () => {
    close();
    navigate('/register');
  };

  const handleLogin = () => {
    close();
    navigate('/login');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 99990,
        }}
      />

      {/* Sheet / modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-prompt-title"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99991,
          background: '#10111A',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: '28px 20px',
          paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.60)',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.60)' }} aria-hidden="true" />
        </button>

        <h2
          id="auth-prompt-title"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#FFFFFF',
            margin: '0 0 8px 0',
            textAlign: 'center',
          }}
        >
          Create an account to continue
        </h2>

        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.50)',
            margin: '0 0 28px 0',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          {bodyText}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleRegister}
            style={{
              height: 50,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #F5C842 0%, #C8860A 100%)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 700,
              color: '#0B0B0F',
              width: '100%',
            }}
          >
            Create account
          </button>

          <button
            onClick={handleLogin}
            style={{
              height: 50,
              borderRadius: 9999,
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.18)',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.80)',
              width: '100%',
            }}
          >
            Log in
          </button>

          <button
            onClick={close}
            style={{
              height: 44,
              borderRadius: 9999,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.40)',
              width: '100%',
            }}
          >
            Continue browsing
          </button>
        </div>
      </div>
    </>
  );
}
