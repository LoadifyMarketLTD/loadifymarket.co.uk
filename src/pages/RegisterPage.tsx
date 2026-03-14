import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, Building2, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const isSeller = searchParams.get('type') === 'seller';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: isSeller ? 'seller' : 'buyer',
          },
        },
      });

      if (signUpError) throw signUpError;

      // Insert user profile into public.users
      // The DB trigger trg_new_user_profile automatically creates the matching
      // seller_profiles + seller_stores (or buyer_profiles) row — do NOT insert
      // those manually here, or the trigger's insert will cause a PK conflict.
      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          email,
          firstName,
          lastName,
          role: isSeller ? 'seller' : 'buyer',
          isEmailVerified: false,
        });

        if (profileError) throw profileError;

        // For sellers, populate the additional fields in the auto-created records.
        // Use upsert so this is idempotent whether the trigger ran first or not.
        // These are best-effort: failure does NOT abort signup (seller can fill
        // in profile details from their dashboard after email confirmation).
        if (isSeller) {
          const effectiveStoreName = storeName || `${firstName}'s Store`;
          const { error: spErr } = await supabase.from('seller_profiles').upsert(
            {
              userId: data.user.id,
              fullName: `${firstName} ${lastName}`,
              storeName: effectiveStoreName,
            },
            { onConflict: 'userId' }
          );
          if (spErr) console.warn('seller_profiles upsert failed (non-fatal):', spErr.message);

          const { error: ssErr } = await supabase.from('seller_stores').upsert(
            {
              userId: data.user.id,
              storeName: effectiveStoreName,
            },
            { onConflict: 'userId' }
          );
          if (ssErr) console.warn('seller_stores upsert failed (non-fatal):', ssErr.message);
        }
      }

      setSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-jet flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="card-glass p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Account Created!</h2>
            <p className="text-white/60 mb-6">
              {isSeller
                ? 'Your seller account is pending admin approval. You will be notified once approved.'
                : 'Please check your email to verify your account before signing in.'}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full h-12 text-base font-semibold"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-jet flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card-glass p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              {isSeller ? 'Seller Registration' : 'Create Account'}
            </h2>
            <p className="text-white/60 text-sm">
              {isSeller
                ? 'Start selling on Loadify Market Ltd'
                : 'Join Loadify Market Ltd today'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-premium-sm mb-6">
              {error}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-white/80 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-white/40" />
                  </div>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="input-field pl-9"
                    placeholder="John"
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-white/80 mb-2">
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-white/40" />
                  </div>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="input-field pl-9"
                    placeholder="Smith"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            {isSeller && (
              <div>
                <label htmlFor="storeName" className="block text-sm font-medium text-white/80 mb-2">
                  Store Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    id="storeName"
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="input-field pl-10"
                    placeholder="My Wholesale Store"
                    autoComplete="organization"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field pl-10"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Creating account...' : isSeller ? 'Register as Seller' : 'Create Account'}
            </button>
          </form>

          {/* Toggle between buyer/seller */}
          <div className="mt-6 text-center space-y-3">
            {isSeller ? (
              <p className="text-sm text-white/60">
                Want to buy instead?{' '}
                <Link to="/register" className="text-gold hover:text-gold/80 transition-colors font-medium">
                  Register as Buyer
                </Link>
              </p>
            ) : (
              <p className="text-sm text-white/60">
                Want to sell?{' '}
                <Link to="/register?type=seller" className="text-gold hover:text-gold/80 transition-colors font-medium">
                  Register as Seller
                </Link>
              </p>
            )}
            <p className="text-sm text-white/60">
              Already have an account?{' '}
              <Link to="/login" className="text-gold hover:text-gold/80 transition-colors font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

