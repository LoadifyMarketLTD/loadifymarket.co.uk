import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Address } from '../types';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SellerProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    businessName: '',
    vatNumber: '',
    companyRegistrationNumber: '',
    contactPhone: '',
    businessAddress: {
      line1: '',
      line2: '',
      city: '',
      postcode: '',
      country: 'GB',
    } as Address,
    payoutDetails: {
      accountHolderName: '',
      sortCode: '',
      accountNumber: '',
      bankName: '',
    },
    // Store information
    storeName: '',
    storeDescription: '',
    storeLogo: '',
    storeBanner: '',
  });

  const fetchProfile = async () => {
    if (!user) return;

    try {
      // Fetch seller profile
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (error) throw error;

      // Fetch store information
      const { data: storeData } = await supabase
        .from('seller_stores')
        .select('*')
        .eq('userId', user.id)
        .single();

      if (data) {
        setFormData({
          businessName: data.businessName || '',
          vatNumber: data.vatNumber || '',
          companyRegistrationNumber: data.companyRegistrationNumber || '',
          contactPhone: data.contactPhone || '',
          businessAddress: data.businessAddress || {
            line1: '',
            line2: '',
            city: '',
            postcode: '',
            country: 'GB',
          },
          payoutDetails: data.payoutDetails || {
            accountHolderName: '',
            sortCode: '',
            accountNumber: '',
            bankName: '',
          },
          storeName: storeData?.storeName || '',
          storeDescription: storeData?.storeDescription || '',
          storeLogo: storeData?.storeLogo || '',
          storeBanner: storeData?.storeBanner || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'seller') {
      fetchProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const calculateCompleteness = () => {
    let completed = 0;
    const total = 10; // Increased to include store fields

    if (formData.businessName) completed++;
    if (formData.vatNumber) completed++;
    if (formData.contactPhone) completed++;
    if (formData.businessAddress.line1) completed++;
    if (formData.businessAddress.city) completed++;
    if (formData.businessAddress.postcode) completed++;
    if (formData.payoutDetails.accountHolderName) completed++;
    if (formData.payoutDetails.accountNumber) completed++;
    if (formData.storeName) completed++;
    if (formData.storeDescription) completed++;

    return Math.round((completed / total) * 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setSaving(true);

    try {
      const completeness = calculateCompleteness();

      // Update seller profile
      const { error } = await supabase
        .from('seller_profiles')
        .upsert({
          userId: user.id,
          businessName: formData.businessName,
          vatNumber: formData.vatNumber,
          companyRegistrationNumber: formData.companyRegistrationNumber,
          contactPhone: formData.contactPhone,
          businessAddress: formData.businessAddress,
          payoutDetails: formData.payoutDetails,
          profileCompleteness: completeness,
        });

      if (error) throw error;

      // Update or create store information
      const storeSlug = formData.storeName
        ? formData.storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : null;

      const { error: storeError } = await supabase
        .from('seller_stores')
        .upsert({
          userId: user.id,
          storeName: formData.storeName || null,
          storeSlug: storeSlug,
          storeDescription: formData.storeDescription || null,
          storeLogo: formData.storeLogo || null,
          storeBanner: formData.storeBanner || null,
          isActive: true,
        });

      if (storeError) throw storeError;

      if (error) throw error;

      alert('Profile updated successfully!');
      navigate('/seller');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'seller') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Seller Access Required</h2>
          <p className="text-gray-600">You need to be a seller to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const completeness = calculateCompleteness();
  const isProfileComplete = completeness >= 75;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Seller Profile</h1>

        {/* Completeness Indicator */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold">Profile Completeness</h2>
            <span className="text-2xl font-bold text-navy-800">{completeness}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
            <div
              className={`h-3 rounded-full transition-all ${
                completeness >= 75 ? 'bg-green-500' : completeness >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          {isProfileComplete ? (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">Your profile is complete! You can publish products.</span>
            </div>
          ) : (
            <div className="flex items-center text-yellow-600">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">
                Complete at least 75% of your profile to publish products.
              </span>
            </div>
          )}
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit}>
          {/* Business Information */}
          <div className="card mb-6">
            <div className="flex items-center mb-4">
              <Building2 className="h-6 w-6 text-navy-800 mr-2" />
              <h2 className="text-xl font-bold">Business Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="input-field"
                  placeholder="Your Company Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">VAT Number</label>
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => setFormData({ ...formData, vatNumber: e.target.value })}
                  className="input-field"
                  placeholder="GB123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Company Registration Number
                </label>
                <input
                  type="text"
                  value={formData.companyRegistrationNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, companyRegistrationNumber: e.target.value })
                  }
                  className="input-field"
                  placeholder="12345678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="input-field"
                  placeholder="+44 20 1234 5678"
                />
              </div>
            </div>
          </div>

          {/* Business Address */}
          <div className="card mb-6">
            <h3 className="text-lg font-bold mb-4">Business Address</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.businessAddress.line1}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessAddress: { ...formData.businessAddress, line1: e.target.value },
                    })
                  }
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.businessAddress.line2 || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessAddress: { ...formData.businessAddress, line2: e.target.value },
                    })
                  }
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessAddress.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, city: e.target.value },
                      })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Postcode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessAddress.postcode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        businessAddress: { ...formData.businessAddress, postcode: e.target.value },
                      })
                    }
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <select
                  value={formData.businessAddress.country}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessAddress: { ...formData.businessAddress, country: e.target.value },
                    })
                  }
                  className="input-field"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="IE">Ireland</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payout Details */}
          <div className="card mb-6">
            <h3 className="text-lg font-bold mb-4">Payout Details</h3>
            <p className="text-sm text-gray-600 mb-4">
              Note: This is for record keeping only. Real payouts are handled through Stripe Connect
              (not yet integrated).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.payoutDetails.accountHolderName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payoutDetails: {
                        ...formData.payoutDetails,
                        accountHolderName: e.target.value,
                      },
                    })
                  }
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sort Code</label>
                  <input
                    type="text"
                    value={formData.payoutDetails.sortCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payoutDetails: { ...formData.payoutDetails, sortCode: e.target.value },
                      })
                    }
                    className="input-field"
                    placeholder="00-00-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.payoutDetails.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payoutDetails: { ...formData.payoutDetails, accountNumber: e.target.value },
                      })
                    }
                    className="input-field"
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.payoutDetails.bankName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      payoutDetails: { ...formData.payoutDetails, bankName: e.target.value },
                    })
                  }
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Store Information */}
          <div className="card mb-6">
            <h3 className="text-lg font-bold mb-4">Store Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              Customize your store front that buyers will see
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.storeName}
                  onChange={(e) =>
                    setFormData({ ...formData, storeName: e.target.value })
                  }
                  className="input-field"
                  placeholder="e.g., Premium Wholesale Supplies"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Store Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.storeDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, storeDescription: e.target.value })
                  }
                  rows={4}
                  className="input-field"
                  placeholder="Describe your store, products, and what makes you unique..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Store Logo URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.storeLogo}
                  onChange={(e) =>
                    setFormData({ ...formData, storeLogo: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a URL to your logo image
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Store Banner URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.storeBanner}
                  onChange={(e) =>
                    setFormData({ ...formData, storeBanner: e.target.value })
                  }
                  className="input-field"
                  placeholder="https://example.com/banner.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a URL to your banner image (recommended: 1200x300px)
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/seller')}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
