import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { User, SellerProfile } from '../types';
import { CheckCircle, XCircle, Ban, Eye } from 'lucide-react';

interface SellerWithProfile {
  user: User;
  profile: SellerProfile;
}

export default function SellerApprovalsPage() {
  const { user } = useAuthStore();
  const [sellers, setSellers] = useState<SellerWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchSellers();
    }
  }, [user, filter]);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      // Fetch all seller users
      const { data: sellerUsers, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'seller')
        .order('createdAt', { ascending: false });

      if (usersError) throw usersError;

      // Fetch seller profiles
      const { data: sellerProfiles, error: profilesError } = await supabase
        .from('seller_profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Combine users with their profiles
      const sellersWithProfiles = (sellerUsers || []).map((user) => {
        const profile = (sellerProfiles || []).find((p) => p.userId === user.id);
        return {
          user,
          profile: profile || {
            userId: user.id,
            isApproved: false,
            rating: 0,
            totalSales: 0,
            commission: 7.0,
          } as SellerProfile,
        };
      });

      // Apply filter
      let filteredSellers = sellersWithProfiles;
      if (filter === 'pending') {
        filteredSellers = sellersWithProfiles.filter((s) => !s.profile.isApproved);
      } else if (filter === 'approved') {
        filteredSellers = sellersWithProfiles.filter((s) => s.profile.isApproved);
      }

      setSellers(filteredSellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveSeller = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ isApproved: true })
        .eq('userId', userId);

      if (error) throw error;
      alert('Seller approved successfully!');
      fetchSellers();
    } catch (error) {
      console.error('Error approving seller:', error);
      alert('Failed to approve seller');
    }
  };

  const rejectSeller = async (userId: string) => {
    if (!confirm('Are you sure you want to reject this seller?')) return;

    try {
      const { error } = await supabase
        .from('seller_profiles')
        .update({ isApproved: false })
        .eq('userId', userId);

      if (error) throw error;
      alert('Seller rejected');
      fetchSellers();
    } catch (error) {
      console.error('Error rejecting seller:', error);
      alert('Failed to reject seller');
    }
  };

  const blockUser = async (userId: string) => {
    if (!confirm('Are you sure you want to block this user? This will prevent them from logging in.')) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive: false })
        .eq('id', userId);

      if (error) throw error;
      alert('User blocked successfully');
      fetchSellers();
    } catch (error) {
      console.error('Error blocking user:', error);
      alert('Failed to block user');
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive: true })
        .eq('id', userId);

      if (error) throw error;
      alert('User unblocked successfully');
      fetchSellers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      alert('Failed to unblock user');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <p className="text-red-600">Access Denied: Admin only</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Seller Approvals & Management</h1>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending' ? 'bg-navy-800 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Pending ({sellers.filter((s) => !s.profile.isApproved).length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'approved' ? 'bg-navy-800 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Approved ({sellers.filter((s) => s.profile.isApproved).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-navy-800 text-white' : 'bg-white text-gray-700'
            }`}
          >
            All Sellers
          </button>
        </div>

        {/* Sellers List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="text-gray-500">Loading sellers...</div>
            </div>
          ) : sellers.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No sellers found</p>
            </div>
          ) : (
            sellers.map((seller) => (
              <div key={seller.user.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">
                        {seller.user.firstName} {seller.user.lastName}
                      </h3>
                      {seller.profile.isApproved ? (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          Approved
                        </span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                          Pending
                        </span>
                      )}
                      {!seller.user.isActive && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          Blocked
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <p><strong>Email:</strong> {seller.user.email}</p>
                      {seller.profile.businessName && (
                        <p><strong>Business:</strong> {seller.profile.businessName}</p>
                      )}
                      {seller.profile.vatNumber && (
                        <p><strong>VAT:</strong> {seller.profile.vatNumber}</p>
                      )}
                      <p><strong>Total Sales:</strong> {seller.profile.totalSales}</p>
                      <p><strong>Rating:</strong> {seller.profile.rating.toFixed(1)} / 5.0</p>
                      <p><strong>Commission:</strong> {seller.profile.commission}%</p>
                      <p><strong>Joined:</strong> {new Date(seller.user.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    {!seller.profile.isApproved ? (
                      <button
                        onClick={() => approveSeller(seller.user.id)}
                        className="btn-primary flex items-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Approve</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => rejectSeller(seller.user.id)}
                        className="btn-outline flex items-center space-x-2"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Revoke</span>
                      </button>
                    )}

                    {seller.user.isActive ? (
                      <button
                        onClick={() => blockUser(seller.user.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
                      >
                        <Ban className="h-4 w-4" />
                        <span>Block</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => unblockUser(seller.user.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Unblock</span>
                      </button>
                    )}

                    <button
                      className="btn-outline flex items-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
