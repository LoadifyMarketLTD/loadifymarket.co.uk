import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { hasSellerAccess } from '../lib/roleUtils';
import type { RFQRequest } from '../types';
import {
  FileText,
  Mail,
  Globe,
  Package,
  DollarSign,
  Calendar,
  MessageSquare,
  ChevronLeft,
  Inbox,
} from 'lucide-react';

export default function SellerRFQPage() {
  const { user } = useAuthStore();
  const [rfqRequests, setRfqRequests] = useState<RFQRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRFQRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rfq_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRfqRequests((data as RFQRequest[]) || []);
    } catch (error) {
      console.error('Error fetching RFQ requests:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchRFQRequests();
    }
  }, [user, fetchRFQRequests]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (!user || !hasSellerAccess(user)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Seller Access Required</h2>
          <p className="text-gray-600 mb-6">
            You need to be registered as a seller to access this page.
          </p>
          <Link to="/register?type=seller" className="btn-primary">
            Register as Seller
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      {/* Breadcrumb */}
      <div className="bg-white/30">
        <div className="container-cinematic py-4">
          <Link
            to="/seller"
            className="text-gray-500 hover:text-gold transition-colors flex items-center gap-2 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="container-cinematic py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gold/10 border border-gold/30 rounded-premium-sm flex items-center justify-center">
                <FileText className="w-5 h-5 text-gold" />
              </div>
              <h1 className="heading-section text-gray-900">RFQ Inbox</h1>
            </div>
            <p className="text-gray-400 text-sm ml-13">
              Wholesale quote requests from buyers
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full px-4 py-2">
            <Inbox className="w-4 h-4 text-gold" />
            <span className="text-gold text-sm font-medium">
              {rfqRequests.length} request{rfqRequests.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center h-48">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400 text-sm">Loading requests...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && rfqRequests.length === 0 && (
          <div className="card-glass text-center py-16 px-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 rounded-full mb-6">
              <Inbox className="w-8 h-8 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">No RFQ requests yet</h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              When buyers submit wholesale quote requests for your products, they will appear here.
            </p>
          </div>
        )}

        {/* RFQ List */}
        {!loading && rfqRequests.length > 0 && (
          <div className="space-y-4">
            {rfqRequests.map((rfq) => (
              <div key={rfq.id} className="card-glass">
                {/* Card Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-gold/10 border border-gold/20 rounded-premium-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Package className="w-4 h-4 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-snug">
                        {rfq.product_name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                            rfq.status === 'replied'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {rfq.status === 'replied' ? 'Replied' : 'Pending'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(rfq.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-start gap-2">
                    <Package className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Quantity</p>
                      <p className="text-white text-sm font-medium">{rfq.quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Destination</p>
                      <p className="text-white text-sm font-medium">{rfq.destination_country}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <DollarSign className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Budget</p>
                      <p className="text-white text-sm font-medium">{rfq.estimated_budget}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs mb-0.5">Buyer Email</p>
                      <a
                        href={`mailto:${rfq.buyer_email}`}
                        className="text-gold text-sm font-medium hover:underline"
                      >
                        {rfq.buyer_email}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {rfq.message && (
                  <div className="border-t border-gray-200 pt-4 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Message</p>
                      <p className="text-gray-600 text-sm leading-relaxed">{rfq.message}</p>
                    </div>
                  </div>
                )}

                {/* Action */}
                <div className="border-t border-gray-200 pt-4 mt-4 flex justify-end">
                  <a
                    href={`mailto:${rfq.buyer_email}?subject=Re: Wholesale Quote Request – ${encodeURIComponent(rfq.product_name)}`}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Reply via Email
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
