/**
 * MobileSecurityPage — /profile/security
 * Personal-account security for the native marketplace app.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react';
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
    if (!nextEmail || nextEmail.toLowerCase() === currentEmail.toLowerCase()) return;
    setStatus('saving');
    setErrorMsg('');
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
      return;
    }
    setStatus('done');
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
          <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-[#0A234F]">Email address</span>
          <span className="mt-0.5 block truncate text-[11px] font-medium text-[#7A8493]">{currentEmail}</span>
        </span>
        <ChevronRight
          className="h-[18px] w-[18px] shrink-0 text-[#A0A8B4] transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="border-t border-[#0A234F]/[0.07] bg-[#F9FBFD] px-4 py-4">
          {status === 'done' ? (
            <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-700">
              Confirmation sent to your new email address. Check your inbox to complete the change.
            </div>
          ) : (
            <>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.1em] text-[#667085]">New email address</label>
              <input
                type="email"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="name@example.com"
                className="h-11 w-full rounded-[12px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-medium text-[#0A234F] outline-none focus:border-[#1D57D8]"
              />
              {status === 'error' ? (
                <p className="mb-0 mt-2 text-[11px] font-semibold text-red-600">{errorMsg}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={status === 'saving' || !value.trim()}
                className="mt-3 h-11 w-full rounded-[12px] border-0 bg-[#0A234F] text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                {status === 'saving' ? 'Updating…' : 'Update email'}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PasswordSection({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async () => {
    if (!current) { setErrorMsg('Enter your current password.'); setStatus('error'); return; }
    if (next.length < 8) { setErrorMsg('New password must be at least 8 characters.'); setStatus('error'); return; }
    if (next !== confirm) { setErrorMsg('New passwords do not match.'); setStatus('error'); return; }
    setStatus('saving');
    setErrorMsg('');

    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (reauthError) {
      setErrorMsg('Current password is incorrect.');
      setStatus('error');
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
      return;
    }

    setCurrent('');
    setNext('');
    setConfirm('');
    setStatus('done');
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
          <KeyRound className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold text-[#0A234F]">Password</span>
          <span className="mt-0.5 block text-[11px] font-medium text-[#7A8493]">Change your sign-in password securely</span>
        </span>
        <ChevronRight
          className="h-[18px] w-[18px] shrink-0 text-[#A0A8B4] transition-transform"
          style={{ transform: open ? 'rotate(90deg)' : undefined }}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div className="border-t border-[#0A234F]/[0.07] bg-[#F9FBFD] px-4 py-4">
          {status === 'done' ? (
            <div className="rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-700">
              Password updated successfully.
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  placeholder="Current password"
                  className="h-11 w-full rounded-[12px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-medium text-[#0A234F] outline-none focus:border-[#1D57D8]"
                />
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="New password"
                  className="h-11 w-full rounded-[12px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-medium text-[#0A234F] outline-none focus:border-[#1D57D8]"
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-11 w-full rounded-[12px] border border-[#CBD5E1] bg-white px-3 text-[13px] font-medium text-[#0A234F] outline-none focus:border-[#1D57D8]"
                />
              </div>
              {status === 'error' ? (
                <p className="mb-0 mt-2 text-[11px] font-semibold text-red-600">{errorMsg}</p>
              ) : null}
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={status === 'saving'}
                className="mt-3 h-11 w-full rounded-[12px] border-0 bg-[#0A234F] text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                {status === 'saving' ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function MobileSecurityPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const email = user?.email ?? '';
  const roleLabel = user?.role === 'admin'
    ? 'Administrator account'
    : user?.role === 'seller'
      ? 'Seller account'
      : 'Buyer account';

  return (
    <div
      className="md:hidden min-h-screen bg-[#EEF3F8] text-[#0A234F]"
      style={{ paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))' }}
    >
      <header
        className="sticky top-0 z-40 bg-[#0A234F] text-white shadow-[0_5px_22px_rgba(10,35,79,0.18)]"
        style={{ paddingTop: 'calc(0.65rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-3 px-[var(--mob-side,16px)] pb-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Back to profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Loadify Market</p>
            <h1 className="m-0 mt-0.5 text-[23px] font-black tracking-[-0.03em] text-white">Security</h1>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">Protect your account and sign-in details</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0A234F]">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4">
        <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_8px_24px_rgba(10,35,79,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A234F] text-white ring-2 ring-[#F5A300]/60 ring-offset-2 ring-offset-white">
              <Lock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-black text-[#0A234F]">{roleLabel}</p>
              <p className="m-0 mt-1 truncate text-[11px] font-medium text-[#7A8493]">{email}</p>
            </div>
            {user?.isEmailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified
              </span>
            ) : null}
          </div>
          <p className="mb-0 mt-3 text-[11px] leading-relaxed text-[#667085]">
            These settings belong to your personal Loadify account. Administrative tools remain separate from marketplace account security.
          </p>
        </section>

        <p className="mb-2 mt-5 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">Sign-in details</p>
        <div className="space-y-3">
          <EmailSection currentEmail={email} />
          <PasswordSection email={email} />
        </div>

        <section className="mt-4 rounded-[18px] border border-[#0A234F]/[0.08] bg-white px-4 py-4 shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-[13px] font-extrabold text-[#0A234F]">Account protection</p>
              <p className="m-0 mt-1 text-[11px] leading-relaxed text-[#667085]">
                Password changes require your current password. Email changes are completed only after confirmation through your inbox.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
}
