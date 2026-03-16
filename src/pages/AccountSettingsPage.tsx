import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  User, Lock, Mail, Bell, MapPin, CreditCard, Building2,
  CheckCircle, AlertCircle, Eye, EyeOff, Plus, Trash2,
  ChevronLeft, Save, Camera, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Address } from '../types';

type Tab =
  | 'profile'
  | 'password'
  | 'email'
  | 'notifications'
  | 'addresses'
  | 'payment'
  | 'business';

const TABS: { id: Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'profile',       label: 'Profile',        icon: User       },
  { id: 'password',      label: 'Password',        icon: Lock       },
  { id: 'email',         label: 'Email',           icon: Mail       },
  { id: 'notifications', label: 'Notifications',   icon: Bell       },
  { id: 'addresses',     label: 'Addresses',       icon: MapPin     },
  { id: 'payment',       label: 'Payment Methods', icon: CreditCard },
  { id: 'business',      label: 'Business',        icon: Building2  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-gold' : 'bg-white/20'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Avatar Upload helper ─────────────────────────────────────────────────────
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

async function uploadAvatar(file: File, userId: string): Promise<{ url: string; filePath: string }> {
  const mimeToExt: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = mimeToExt[file.type] ?? 'jpg';
  const filePath = `avatars/${userId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
  return { url: data.publicUrl, filePath };
}

// ─── Profile Tab ────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, setUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError('Please upload a JPG, PNG or WebP image.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('Image must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setAvatarUploading(true);
    setError('');
    let filePath: string | undefined;
    try {
      const result = await uploadAvatar(file, user.id);
      filePath = result.filePath;
      const { error: dbError } = await supabase
        .from('users')
        .update({ avatarUrl: result.url })
        .eq('id', user.id);
      if (dbError) {
        // Roll back the storage upload to avoid orphaned files
        await supabase.storage.from('product-images').remove([filePath]);
        throw dbError;
      }
      setUser({ ...user, avatarUrl: result.url });
    } catch {
      setError('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const { error: dbError } = await supabase
        .from('users')
        .update({ firstName: form.firstName, lastName: form.lastName, phone: form.phone })
        .eq('id', user.id);
      if (dbError) throw dbError;
      setUser({ ...user, firstName: form.firstName, lastName: form.lastName, phone: form.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map(s => s![0].toUpperCase())
    .join('') || user?.email?.[0]?.toUpperCase() || '?';

  return (
    <div>
      <SectionHeader title="Profile Information" subtitle="Update your personal details" />
      <div className="space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover border-2 border-gold/40"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold/40 flex items-center justify-center text-gold text-2xl font-bold select-none">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 bg-gold text-jet w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:bg-gold-400 transition-colors"
              aria-label="Change profile picture"
            >
              {avatarUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-white text-sm font-medium">Profile Picture</p>
            <p className="text-white/40 text-xs mt-0.5">JPG, PNG or WebP. Max 5 MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">First Name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="First name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">Last Name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="input-field w-full"
              placeholder="Last name"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Email Address</label>
          <input
            name="email"
            value={form.email}
            disabled
            className="input-field w-full opacity-50 cursor-not-allowed"
            placeholder="Email"
          />
          <p className="text-white/40 text-xs mt-1">
            Email changes require identity verification. Contact support to update.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Phone Number</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="input-field w-full"
            placeholder="+44 7xxx xxxxxx"
          />
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> Profile saved successfully.
          </div>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

// ─── Password Strength helper ─────────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { score, label: 'Weak',   color: 'bg-red-500'    };
  if (score <= 2) return { score, label: 'Fair',   color: 'bg-orange-400' };
  if (score <= 3) return { score, label: 'Good',   color: 'bg-yellow-400' };
  if (score <= 4) return { score, label: 'Strong', color: 'bg-lime-400'   };
  return { score, label: 'Very strong', color: 'bg-green-500' };
}

// ─── Password Tab ────────────────────────────────────────────────────────────
function PasswordTab() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setError('');
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password: form.newPassword });
      if (authError) throw authError;
      setSaved(true);
      setForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Change Password" subtitle="Keep your account secure with a strong password" />
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">New Password</label>
          <div className="relative">
            <input
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              value={form.newPassword}
              onChange={handleChange}
              className="input-field w-full pr-10"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Password strength indicator */}
          {form.newPassword && (() => {
            const strength = getPasswordStrength(form.newPassword);
            return (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i <= strength.score ? strength.color : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-white/50">
                  Strength: <span className="font-medium text-white/80">{strength.label}</span>
                </p>
              </div>
            );
          })()}
        </div>
        <div>
          <label className="block text-sm font-medium text-white/70 mb-1">Confirm New Password</label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={handleChange}
              className="input-field w-full pr-10"
              placeholder="Repeat new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.confirmPassword && form.newPassword !== form.confirmPassword && (
            <p className="text-red-400 text-xs mt-1">Passwords do not match.</p>
          )}
        </div>
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
        {saved && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" /> Password updated successfully.
          </div>
        )}
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {saving ? 'Updating…' : 'Update Password'}
        </button>
        <p className="text-white/40 text-xs">
          Forgot your current password?{' '}
          <Link to="/forgot-password" className="text-gold hover:text-gold/80 underline">
            Reset via email
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Email Settings Tab ──────────────────────────────────────────────────────
function EmailTab() {
  const { user } = useAuthStore();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState('');

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    setResendError('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email });
      if (error) throw error;
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err: unknown) {
      setResendError(err instanceof Error ? err.message : 'Failed to resend. Try again later.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Email Settings" subtitle="Manage your email address and preferences" />
      <div className="space-y-4">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-sm font-medium text-white/70 mb-1">Current email address</p>
          <p className="text-white font-semibold">{user?.email}</p>
          {user?.isEmailVerified ? (
            <span className="inline-flex items-center gap-1 text-green-400 text-xs mt-2">
              <CheckCircle className="w-3 h-3" /> Verified
            </span>
          ) : (
            <div className="mt-2 space-y-2">
              <span className="inline-flex items-center gap-1 text-yellow-400 text-xs">
                <AlertCircle className="w-3 h-3" /> Not verified
              </span>
              <div>
                <button
                  onClick={handleResendVerification}
                  disabled={resending || resent}
                  className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80 underline transition-colors disabled:opacity-60"
                >
                  <RefreshCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending…' : resent ? 'Verification email sent!' : 'Resend verification email'}
                </button>
                {resendError && (
                  <p className="text-red-400 text-xs mt-1">{resendError}</p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="font-medium text-white mb-1">Change Email Address</h3>
          <p className="text-white/80 text-sm">
            To change your email address, please contact our support team at{' '}
            <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-gold hover:underline">
              loadifymarket.co.uk@gmail.com
            </a>
            . Email changes require identity verification for your security.
          </p>
        </div>
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-300 mb-1">Transactional Emails</h3>
              <p className="text-white/50 text-sm">
                Order confirmations, security alerts, and password resets are always delivered
                regardless of your notification preferences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Tab ───────────────────────────────────────────────────────
function NotificationsTab() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    orderConfirmation: true,
    shippingUpdates: true,
    deliveryConfirmation: true,
    promotionalEmails: false,
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('userId', user.id)
          .single();
        if (data) {
          setSettings({
            orderConfirmation: data.orderConfirmation,
            shippingUpdates: data.shippingUpdates,
            deliveryConfirmation: data.deliveryConfirmation,
            promotionalEmails: data.promotionalEmails,
          });
        }
      } catch {
        // No settings yet — use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({ userId: user.id, ...settings });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const ITEMS: { key: keyof typeof settings; label: string; desc: string }[] = [
    { key: 'orderConfirmation',   label: 'Order Confirmation',   desc: 'Receive a confirmation email when you place an order.' },
    { key: 'shippingUpdates',     label: 'Shipping Updates',      desc: 'Get notified when your order ships and tracking is available.' },
    { key: 'deliveryConfirmation', label: 'Delivery Confirmation', desc: 'Receive an email when your order has been delivered.' },
    { key: 'promotionalEmails',   label: 'Promotional Emails',    desc: 'Special offers, new products, and marketplace news.' },
  ];

  if (loading) return <p className="text-white/50 text-sm">Loading preferences…</p>;

  return (
    <div>
      <SectionHeader title="Notification Preferences" subtitle="Choose how you'd like to be notified" />
      <div className="space-y-3">
        {ITEMS.map(item => (
          <div key={item.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex-1 pr-4">
              <p className="font-medium text-white text-sm">{item.label}</p>
              <p className="text-white/50 text-xs mt-0.5">{item.desc}</p>
            </div>
            <Toggle
              checked={settings[item.key]}
              onChange={() => setSettings(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
            />
          </div>
        ))}
      </div>
      {saved && (
        <div className="flex items-center gap-2 text-green-400 text-sm mt-4">
          <CheckCircle className="w-4 h-4" /> Preferences saved.
        </div>
      )}
      <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 mt-4">
        <Save className="w-4 h-4" />
        {saving ? 'Saving…' : 'Save Preferences'}
      </button>
    </div>
  );
}

// ─── Addresses Tab ───────────────────────────────────────────────────────────
interface SavedAddress extends Address {
  id?: string;
  label?: string;
  isDefault?: boolean;
}

const EMPTY_ADDRESS: SavedAddress = { label: '', line1: '', line2: '', city: '', postcode: '', country: 'GB' };

function AddressesTab() {
  const { user } = useAuthStore();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SavedAddress>(EMPTY_ADDRESS);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('buyer_profiles')
          .select('shippingAddress')
          .eq('userId', user.id)
          .single();
        if (data?.shippingAddress) {
          const addr = data.shippingAddress as SavedAddress;
          setAddresses([{ ...addr, id: 'default', label: 'Default', isDefault: true }]);
        }
      } catch {
        // No profile yet
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('buyer_profiles')
        .upsert({ userId: user.id, shippingAddress: { line1: form.line1, line2: form.line2, city: form.city, postcode: form.postcode, country: form.country } });
      if (error) throw error;
      setAddresses([{ ...form, id: 'default', label: form.label || 'Default', isDefault: true }]);
      setShowForm(false);
      setForm(EMPTY_ADDRESS);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    await supabase.from('buyer_profiles').update({ shippingAddress: null }).eq('userId', user.id);
    setAddresses([]);
  };

  if (loading) return <p className="text-white/50 text-sm">Loading addresses…</p>;

  return (
    <div>
      <SectionHeader title="Saved Delivery Addresses" subtitle="Manage your saved delivery locations" />
      {addresses.length === 0 && !showForm && (
        <p className="text-white/50 text-sm mb-4">No saved addresses yet.</p>
      )}
      {addresses.map(addr => (
        <div key={addr.id} className="p-4 bg-white/5 rounded-lg border border-white/10 mb-3 flex items-start justify-between gap-4">
          <div>
            {addr.label && <p className="text-gold text-xs font-semibold mb-1">{addr.label} {addr.isDefault && '· Default'}</p>}
            <p className="text-white text-sm">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
            <p className="text-white/60 text-sm">{addr.city}, {addr.postcode}, {addr.country}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setForm({ ...addr }); setShowForm(true); }} className="text-white/50 hover:text-white transition-colors">
              <Save className="w-4 h-4" />
            </button>
            <button onClick={handleDelete} className="text-red-400/60 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      {!showForm && (
        <button onClick={() => setShowForm(true)} className="btn-outline flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Address
        </button>
      )}
      {showForm && (
        <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3 mt-4">
          <h3 className="font-medium text-white">New Address</h3>
          <input
            value={form.label ?? ''}
            onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
            className="input-field w-full"
            placeholder="Label (e.g. Home, Work)"
          />
          <input
            value={form.line1}
            onChange={e => setForm(p => ({ ...p, line1: e.target.value }))}
            className="input-field w-full"
            placeholder="Address line 1 *"
          />
          <input
            value={form.line2 ?? ''}
            onChange={e => setForm(p => ({ ...p, line2: e.target.value }))}
            className="input-field w-full"
            placeholder="Address line 2"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.city}
              onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
              className="input-field"
              placeholder="City *"
            />
            <input
              value={form.postcode}
              onChange={e => setForm(p => ({ ...p, postcode: e.target.value }))}
              className="input-field"
              placeholder="Postcode *"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
              <Save className="w-4 h-4" />{saving ? 'Saving…' : 'Save Address'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Methods Tab ──────────────────────────────────────────────────────
function PaymentTab() {
  return (
    <div>
      <SectionHeader title="Payment Methods" subtitle="Manage your saved payment options" />
      <div className="p-4 bg-white/5 rounded-lg border border-white/10 mb-4">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-white mb-1">Secure Payments via Stripe</h3>
            <p className="text-white/50 text-sm">
              Loadify Market processes all payments securely through Stripe. Your card details are
              never stored on our servers — they are managed entirely by Stripe's PCI-DSS compliant
              infrastructure.
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
        <p className="text-white/60 text-sm">
          Payment methods are managed per checkout. You can save cards directly through Stripe's
          secure checkout interface when completing a purchase.
        </p>
      </div>
    </div>
  );
}

// ─── Business / Store Tab ─────────────────────────────────────────────────────
function BusinessTab() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isSeller = user?.role === 'seller' || user?.role === 'owner' || user?.role === 'admin';

  if (!isSeller) {
    return (
      <div>
        <SectionHeader title="Business / Store Information" subtitle="Available for seller accounts" />
        <div className="p-6 bg-white/5 rounded-lg border border-white/10 text-center">
          <Building2 className="w-12 h-12 text-gold/40 mx-auto mb-3" />
          <h3 className="font-semibold text-white mb-2">You are not a seller</h3>
          <p className="text-white/50 text-sm mb-4">
            Upgrade your account to start listing products and manage your store.
          </p>
          <Link to="/register?type=seller" className="btn-primary inline-flex items-center gap-2 text-sm">
            Become a Seller
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Business / Store Information" subtitle="Manage your seller profile and store details" />
      <div className="space-y-3">
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white/60 text-sm mb-3">
            Your full business and store information is managed in the Seller Profile section.
          </p>
          <button
            onClick={() => navigate('/seller/profile')}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Building2 className="w-4 h-4" /> Open Seller Profile
          </button>
        </div>
        <div className="p-4 bg-white/5 rounded-lg border border-white/10">
          <h3 className="font-medium text-white mb-1">Seller Dashboard</h3>
          <p className="text-white/50 text-sm mb-3">
            Manage your listings, orders, shipments, and earnings.
          </p>
          <button
            onClick={() => navigate('/seller')}
            className="btn-outline flex items-center gap-2 text-sm"
          >
            Go to Seller Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const VALID_TABS = new Set<Tab>(['profile', 'password', 'email', 'notifications', 'addresses', 'payment', 'business']);

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab') as Tab | null;
  const activeTab: Tab = tabParam && VALID_TABS.has(tabParam) ? tabParam : 'profile';

  const setActiveTab = (tab: Tab) => {
    setSearchParams({ tab }, { replace: true });
  };

  useEffect(() => {
    if (!user) navigate('/login?redirect=/account-settings');
  }, [user, navigate]);

  if (!user) return null;

  const isSeller = user.role === 'seller' || user.role === 'owner' || user.role === 'admin';
  const visibleTabs = TABS.filter(t => t.id !== 'business' || isSeller);

  return (
    <div className="bg-jet min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-5xl">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-white/50 hover:text-white transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Account Settings</h1>
            <p className="text-white/40 text-sm">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <nav className="lg:w-56 flex-shrink-0">
            <div className="card-glass p-2">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      activeTab === tab.id
                        ? 'bg-gold/20 text-gold border border-gold/30'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <div className="flex-1 card-glass p-6">
            {activeTab === 'profile'       && <ProfileTab />}
            {activeTab === 'password'      && <PasswordTab />}
            {activeTab === 'email'         && <EmailTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'addresses'     && <AddressesTab />}
            {activeTab === 'payment'       && <PaymentTab />}
            {activeTab === 'business'      && <BusinessTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
