import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const nextUrl = searchParams.get('next');
      if (nextUrl) {
        navigate(nextUrl, { replace: true });
      } else if (user.role === 'seller') {
        navigate('/seller', { replace: true });
      } else if (user.role === 'admin' || user.role === 'owner') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, searchParams, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If a specific return URL was requested, honour it
      const nextUrl = searchParams.get('next');
      if (nextUrl) {
        navigate(nextUrl, { replace: true });
        return;
      }

      // Fetch user profile to determine role-based redirect destination
      let redirectTo = '/dashboard';
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          // Table missing or row absent — fall back to auth metadata role
          const metaRole = data.user.user_metadata?.role as string | undefined;
          if (metaRole === 'seller') {
            redirectTo = '/seller';
          } else if (metaRole === 'admin' || metaRole === 'owner') {
            redirectTo = '/admin';
          }
          console.warn('Could not fetch user role, using auth metadata fallback:', profileError.message);
        } else if (profile?.role === 'seller') {
          redirectTo = '/seller';
        } else if (profile?.role === 'admin' || profile?.role === 'owner') {
          redirectTo = '/admin';
        }
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-jet flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="card-glass p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-white/60 text-sm">Welcome back to Loadify Market Ltd</p>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-premium-sm mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-white/80">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-gold hover:text-gold/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
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
                  className="input-field pl-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-graphite text-white/60">New to Loadify Market Ltd?</span>
              </div>
            </div>
          </div>

          {/* Create Account Link */}
          <div className="text-center">
            <Link
              to="/register"
              className="btn-secondary w-full h-12 flex items-center justify-center"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
