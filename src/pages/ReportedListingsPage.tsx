import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { ReportedListing, Product, User } from '../types';
import { AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';

interface ReportedListingWithDetails extends ReportedListing {
  product?: Product;
  reporter?: User;
  reviewer?: User;
}

export default function ReportedListingsPage() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<ReportedListingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchReports();
    }
  }, [user, filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('reported_listings')
        .select('*')
        .order('createdAt', { ascending: false });

      if (filter === 'pending') {
        query = query.eq('status', 'pending');
      } else if (filter === 'reviewed') {
        query = query.in('status', ['reviewed', 'resolved', 'dismissed']);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      // Fetch related data
      const reportsWithDetails = await Promise.all(
        (reportsData || []).map(async (report) => {
          // Fetch product
          const { data: product } = await supabase
            .from('products')
            .select('*')
            .eq('id', report.productId)
            .single();

          // Fetch reporter
          const { data: reporter } = await supabase
            .from('users')
            .select('*')
            .eq('id', report.reportedBy)
            .single();

          // Fetch reviewer if exists
          let reviewer = null;
          if (report.reviewedBy) {
            const { data: reviewerData } = await supabase
              .from('users')
              .select('*')
              .eq('id', report.reviewedBy)
              .single();
            reviewer = reviewerData;
          }

          return {
            ...report,
            product: product || undefined,
            reporter: reporter || undefined,
            reviewer: reviewer || undefined,
          };
        })
      );

      setReports(reportsWithDetails);
    } catch (error) {
      console.error('Error fetching reported listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: 'reviewed' | 'resolved' | 'dismissed',
    reviewNotes?: string
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reported_listings')
        .update({
          status,
          reviewedBy: user.id,
          reviewNotes: reviewNotes || null,
        })
        .eq('id', reportId);

      if (error) throw error;
      alert('Report status updated successfully');
      fetchReports();
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report status');
    }
  };

  const deactivateProduct = async (productId: string, reportId: string) => {
    if (!confirm('Are you sure you want to deactivate this product? This will remove it from the marketplace.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ isActive: false })
        .eq('id', productId);

      if (error) throw error;

      // Update report status
      await updateReportStatus(reportId, 'resolved', 'Product deactivated');
    } catch (error) {
      console.error('Error deactivating product:', error);
      alert('Failed to deactivate product');
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
        <h1 className="text-3xl font-bold mb-6">Reported Listings</h1>

        {/* Filter Tabs */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'pending' ? 'bg-navy-800 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Pending ({reports.filter((r) => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('reviewed')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'reviewed' ? 'bg-navy-800 text-white' : 'bg-white text-gray-700'
            }`}
          >
            Reviewed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all' ? 'bg-navy-800 text-white' : 'bg-white text-gray-700'
            }`}
          >
            All Reports
          </button>
        </div>

        {/* Reports List */}
        <div className="space-y-4">
          {loading ? (
            <div className="card text-center py-12">
              <div className="text-gray-500">Loading reports...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-500">No reported listings found</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="card">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">
                        {report.product?.title || 'Product not found'}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          report.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : report.status === 'resolved'
                            ? 'bg-green-100 text-green-800'
                            : report.status === 'dismissed'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {report.status}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>Reason:</strong> {report.reason}
                      </p>
                      {report.description && (
                        <p>
                          <strong>Description:</strong> {report.description}
                        </p>
                      )}
                      <p>
                        <strong>Reported by:</strong>{' '}
                        {report.reporter
                          ? `${report.reporter.firstName} ${report.reporter.lastName} (${report.reporter.email})`
                          : 'Unknown'}
                      </p>
                      <p>
                        <strong>Reported on:</strong>{' '}
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                      {report.reviewedBy && report.reviewer && (
                        <p>
                          <strong>Reviewed by:</strong>{' '}
                          {report.reviewer.firstName} {report.reviewer.lastName}
                        </p>
                      )}
                      {report.reviewNotes && (
                        <p>
                          <strong>Review Notes:</strong> {report.reviewNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2 lg:w-48">
                    {report.product && (
                      <Link
                        to={`/product/${report.product.id}`}
                        className="btn-outline flex items-center justify-center space-x-2"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Product</span>
                      </Link>
                    )}

                    {report.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            const notes = prompt('Enter review notes (optional):');
                            updateReportStatus(report.id, 'reviewed', notes || '');
                          }}
                          className="btn-primary flex items-center justify-center space-x-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark Reviewed</span>
                        </button>

                        {report.product && (
                          <button
                            onClick={() => deactivateProduct(report.productId, report.id)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                          >
                            <AlertCircle className="h-4 w-4" />
                            <span>Deactivate</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            const notes = prompt('Enter dismissal reason (optional):');
                            updateReportStatus(report.id, 'dismissed', notes || '');
                          }}
                          className="btn-outline flex items-center justify-center space-x-2"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Dismiss</span>
                        </button>
                      </>
                    )}
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
