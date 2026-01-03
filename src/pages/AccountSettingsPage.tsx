import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { User, Mail, Phone, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Initialize form with current user data
    setFormData({
      email: user.email || '',
      phone: user.phone || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      if (!user) return;

      // Check if email has changed
      const emailChanged = formData.email !== user.email;

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: formData.email,
          phone: formData.phone,
          firstName: formData.firstName,
          lastName: formData.lastName,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // If email changed, update auth email (this requires reauthentication in production)
      if (emailChanged) {
        // In development/mock mode, this won't do anything
        // In production with real Supabase, this will send verification email
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email,
        });

        if (authError) {
          // If auth update fails, show warning but don't fail entirely
          console.warn('Auth email update failed:', authError);
          setMessage({
            type: 'success',
            text: 'Profile updated! Email change requires verification - check your inbox.',
          });
        } else {
          setMessage({
            type: 'success',
            text: 'Profile updated successfully! If you changed your email, please verify it.',
          });
        }
      } else {
        setMessage({
          type: 'success',
          text: 'Profile updated successfully!',
        });
      }

      // Update local user state
      const updatedUser = {
        ...user,
        email: formData.email,
        phone: formData.phone,
        firstName: formData.firstName,
        lastName: formData.lastName,
      };
      setUser(updatedUser);

    } catch (err) {
      console.error('Error updating profile:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account information and login credentials</p>
      </div>

      <div className="card">
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className="input-field"
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className="input-field"
                  placeholder="Enter last name"
                />
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Login Credentials
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Changing your email will require verification
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="input-field"
                  placeholder="+44 7700 900000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Used for account recovery and notifications
                </p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Account Type:</span>
                <span className="ml-2 font-medium text-gray-900 capitalize">{user.role}</span>
              </div>
              <div>
                <span className="text-gray-600">User ID:</span>
                <span className="ml-2 font-mono text-xs text-gray-900">{user.id}</span>
              </div>
              <div>
                <span className="text-gray-600">Email Verified:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {user.isEmailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Member Since:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Security Notice */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Security Notice</h3>
        <p className="text-sm text-blue-800">
          For password changes, please contact support or use the password reset option on the login page.
          Email changes require verification to maintain account security.
        </p>
      </div>
    </div>
  );
}
