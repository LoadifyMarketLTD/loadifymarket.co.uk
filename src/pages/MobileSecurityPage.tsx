/**
 * MobileSecurityPage — /profile/security
 *
 * Mobile account-security controls aligned with the canonical web settings.
 * Password changes require the current password to be re-authenticated before
 * Supabase Auth accepts the new password.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mail, Lock } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import MobileBottomNav from '@/components/MobileBottomNav';

function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    const nextEmail = value.trim();
    if (!nextEmail || nextEmail === currentEmail) return;

    setStatus('saving');
    setErrorMsg('');
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('done');
      setValue('');
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 14,
          paddingBottom: 14,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <Mail className="text-muted-foreground" style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="text-[15px] font-medium text-foreground/90 m-0">Email</p>
          <p className="text-xs text-muted-foreground m-0">{currentEmail}</p>
        </div>
        <ChevronRight className="text-foreground/30" style={{ width: 18, height: 18, flexShrink: 0, transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} aria-hidden="true" />
      </button>

      {open && (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingBottom: 16 }}>
          {status === 'done' ? (
            <p className="text-[13px] text-success m-0">
              Confirmation sent to your new address. Check your inbox.
            </p>
          ) : (
            <>
              <input
                type="email"
                value={value}
                onChange={(event) => value !== event.target.value && setValue(event.target.value)}
                placeholder="New email address"
                autoComplete="email"
                className="text-foreground text-sm bg-white/[0.05]"
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 10,
                  border: '1.5px solid rgba(255,255,255,0.14)',
                  paddingInline: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                }}
              />
              {status === 'error' && (
                <p className="text-xs text-danger" style={{ margin: '0 0 8px' }}>{errorMsg}</p>
              )}
              <button
                onClick={() => { void handleSave(); }}
                disabled={status === 'saving'}
                className="text-sm font-bold"
                style={{
                  height: 40,
                  paddingInline: 20,
                  borderRadius: 9999,
                  border: 'none',
                  cursor: status === 'saving' ? 'wait' : 'pointer',
                  opacity: status === 'saving' ? 0.6 : 1,
                }}
              >
                {status === 'saving' ? 'Saving…' : 'Update email'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PasswordSection({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    setErrorMsg('');

    if (!currentEmail) {
      setErrorMsg('Your account email is unavailable. Please refresh and try again.');
      setStatus('error');
      return;
    }
    if (!currentPassword) {
      setErrorMsg('Enter your current password to confirm this change.');
      setStatus('error');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      setStatus('error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      setStatus('error');
      return;
    }

    setStatus('saving');

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password: currentPassword,
    });

    if (signInError) {
      setErrorMsg('Current password is incorrect. Please try again.');
      setStatus('error');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setErrorMsg(updateError.message);
      setStatus('error');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setStatus('done');
  };

  return (
    <div>
      <button
        onClick={() => setOpen((value) => !value)}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 14,
          paddingBottom: 14,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          gap: 12,
          textAlign: 'left',
        }}
      >
        <Lock className="text-muted-foreground" style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden="true" />
        <p className="text-[15px] font-medium text-foreground/90 m-0" style={{ flex: 1 }}>Password</p>
        <ChevronRight className="text-foreground/30" style={{ width: 18, height: 18, flexShrink: 0, transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} aria-hidden="true" />
      </button>

      {open && (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingBottom: 16 }}>
          {status === 'done' ? (
            <p className="text-[13px] text-success m-0">Password updated successfully.</p>
          ) : (
            <>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                autoComplete="current-password"
                className="text-foreground text-sm bg-white/[0.05]"
                style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.14)', paddingInline: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="text-foreground text-sm bg-white/[0.05]"
                style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.14)', paddingInline: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="text-foreground text-sm bg-white/[0.05]"
                style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.14)', paddingInline: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              />
              {status === 'error' && (
                <p className="text-xs text-danger" style={{ margin: '0 0 8px' }}>{errorMsg}</p>
              )}
              <button
                onClick={() => { void handleSave(); }}
                disabled={status === 'saving'}
                className="text-sm font-bold"
                style={{ height: 40, paddingInline: 20, borderRadius: 9999, border: 'none', cursor: status === 'saving' ? 'wait' : 'pointer', opacity: status === 'saving' ? 0.6 : 1 }}
              >
                {status === 'saving' ? 'Saving…' : 'Update password'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function MobileSecurityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const email = user?.email ?? '';

  const dividerStyle: React.CSSProperties = {
    height: 1,
    marginInlineStart: 'var(--mob-side, 16px)',
  };

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingInline: 'var(--mob-side, 16px)', paddingTop: 16, paddingBottom: 12 }}>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft className="text-foreground/70" style={{ width: 22, height: 22 }} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground m-0">Security</h1>
      </div>

      <div
        className="bg-white/[0.04]"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <EmailSection currentEmail={email} />
        <div aria-hidden="true" className="bg-white/[0.05]" style={dividerStyle} />
        <PasswordSection currentEmail={email} />
      </div>

      <MobileBottomNav />
    </div>
  );
}
