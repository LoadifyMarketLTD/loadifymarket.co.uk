import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { Bell, Mail, Check } from 'lucide-react';

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    orderConfirmation: true,
    shippingUpdates: true,
    deliveryConfirmation: true,
    promotionalEmails: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/dashboard/notifications');
      return;
    }

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          orderConfirmation: data.orderConfirmation,
          shippingUpdates: data.shippingUpdates,
          deliveryConfirmation: data.deliveryConfirmation,
          promotionalEmails: data.promotionalEmails,
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          userId: user.id,
          ...settings,
        });

      if (error) throw error;

      alert('Notification settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-8 w-8 text-navy-800" />
          <h1 className="text-3xl font-bold">Notification Settings</h1>
        </div>

        {loading ? (
          <div className="card">
            <p className="text-center py-8 text-gray-600">Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-4">
                <Mail className="h-6 w-6 text-navy-800" />
                <h2 className="text-xl font-bold">Email Notifications</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Choose which email notifications you'd like to receive from Loadify Market.
              </p>

              <div className="space-y-4">
                {/* Order Confirmation */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Order Confirmation</h3>
                    <p className="text-sm text-gray-600">
                      Receive a confirmation email when you place an order.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('orderConfirmation')}
                    className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.orderConfirmation ? 'bg-navy-800' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.orderConfirmation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Shipping Updates */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Shipping Updates</h3>
                    <p className="text-sm text-gray-600">
                      Get notified when your order is shipped and when tracking information is available.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('shippingUpdates')}
                    className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.shippingUpdates ? 'bg-navy-800' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.shippingUpdates ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Delivery Confirmation */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Delivery Confirmation</h3>
                    <p className="text-sm text-gray-600">
                      Receive an email when your order has been delivered.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('deliveryConfirmation')}
                    className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.deliveryConfirmation ? 'bg-navy-800' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.deliveryConfirmation ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Promotional Emails */}
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Promotional Emails</h3>
                    <p className="text-sm text-gray-600">
                      Receive emails about special offers, new products, and marketplace news.
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle('promotionalEmails')}
                    className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.promotionalEmails ? 'bg-navy-800' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.promotionalEmails ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Important Notice */}
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Important</h3>
                  <p className="text-sm text-blue-800">
                    Some transactional emails (such as password resets and security alerts) cannot
                    be disabled as they are required for account security.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => navigate(-1)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
