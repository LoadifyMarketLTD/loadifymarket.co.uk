/**
 * MobileSecurityPage — /profile/security
 *
 * Simple security hub: Email · Password · 2FA (placeholder) · Login activity.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Mail, Lock, Shield, Activity } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import MobileBottomNav from '@/components/MobileBottomNav';

// ── Change-email inline form ───────────────────────────────────────────────────
function EmailSection({ currentEmail }: { currentEmail: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!value || value === currentEmail) return;
    setStatus('saving');
    const { error } = await supabase.auth.updateUser({ email: value });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('done');
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
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
        <Mail style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Email</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{currentEmail}</p>
        </div>
        <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0, transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} aria-hidden="true" />
      </button>

      {open && (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingBottom: 16 }}>
          {status === 'done' ? (
            <p style={{ fontSize: 13, color: 'rgba(74,222,128,1)', margin: 0 }}>
              Confirmation sent to your new address. Check your inbox.
            </p>
          ) : (
            <>
              <input
                type="email"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="New email address"
                style={{
                  width: '100%',
                  height: 44,
                  borderRadius: 10,
                  border: '1.5px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,1)',
                  fontSize: 14,
                  paddingInline: 14,
                  outline: 'none',
                  boxSizing: 'border-box',
                  marginBottom: 10,
                }}
              />
              {status === 'error' && (
                <p style={{ fontSize: 12, color: 'rgba(239,68,68,1)', margin: '0 0 8px' }}>{errorMsg}</p>
              )}
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                style={{
                  height: 40,
                  paddingInline: 20,
                  borderRadius: 9999,
                  
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  
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

// ── Change-password inline form ────────────────────────────────────────────────
function PasswordSection() {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (pw.length < 8) { setErrorMsg('Password must be at least 8 characters.'); setStatus('error'); return; }
    if (pw !== confirm) { setErrorMsg('Passwords do not match.'); setStatus('error'); return; }
    setStatus('saving');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('done');
      setPw('');
      setConfirm('');
    }
  };

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
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
        <Lock style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
        <p style={{ flex: 1, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Password</p>
        <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0, transform: open ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }} aria-hidden="true" />
      </button>

      {open && (
        <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingBottom: 16 }}>
          {status === 'done' ? (
            <p style={{ fontSize: 13, color: 'rgba(74,222,128,1)', margin: 0 }}>Password updated successfully.</p>
          ) : (
            <>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
                style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,1)', fontSize: 14, paddingInline: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
              />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                style={{ width: '100%', height: 44, borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,1)', fontSize: 14, paddingInline: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
              />
              {status === 'error' && (
                <p style={{ fontSize: 12, color: 'rgba(239,68,68,1)', margin: '0 0 8px' }}>{errorMsg}</p>
              )}
              <button
                onClick={handleSave}
                disabled={status === 'saving'}
                style={{ height: 40, paddingInline: 20, borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: status === 'saving' ? 0.6 : 1 }}
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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MobileSecurityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const email = user?.email ?? '';

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    paddingInline: 'var(--mob-side, 16px)',
    paddingTop: 14,
    paddingBottom: 14,
    gap: 12,
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    background: 'rgba(255,255,255,0.05)',
    marginInlineStart: 'var(--mob-side, 16px)',
  };

  return (
    <div
      className="md:hidden min-h-screen"
      style={{
        background: 'rgba(10,14,26,1)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingInline: 'var(--mob-side, 16px)', paddingTop: 16, paddingBottom: 12 }}>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.70)' }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,1)', margin: 0 }}>Security</h1>
      </div>

      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Email */}
        <EmailSection currentEmail={email} />

        <div aria-hidden="true" style={dividerStyle} />

        {/* Password */}
        <PasswordSection />

        <div aria-hidden="true" style={dividerStyle} />

        {/* 2FA — placeholder */}
        <div style={rowStyle}>
          <Shield style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Two-factor authentication</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Coming soon</p>
          </div>
        </div>

        <div aria-hidden="true" style={dividerStyle} />

        {/* Login activity — placeholder */}
        <div style={rowStyle}>
          <Activity style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)', margin: 0 }}>Login activity</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Coming soon</p>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
