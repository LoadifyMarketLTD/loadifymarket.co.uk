import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Star, Package, Clock, TrendingUp, Award, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import VerificationBadge from './VerificationBadge';

interface SellerPerformanceProps {
  sellerId: string;
  compact?: boolean;
}

interface SellerStats {
  rating: number;
  totalSales: number;
  responseTime: number; // in hours
  onTimeShipment: number; // percentage
  memberSince: string;
  totalProducts: number;
  reviewCount: number;
}

interface SellerInfoData {
  userId: string;
  businessName?: string;
  rating: number;
  totalSales: number;
  isApproved?: boolean;
  createdAt: string;
  users: {
    id: string;
    createdAt: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function SellerPerformance({ sellerId, compact = false }: SellerPerformanceProps) {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState<SellerInfoData | null>(null);

  useEffect(() => {
    fetchSellerPerformance();
  }, [sellerId]);

  const fetchSellerPerformance = async () => {
    setLoading(true);
    try {
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('seller_profiles')
        .select('*, users(*)')
        .eq('userId', sellerId)
        .single();

      if (sellerError) throw sellerError;
      setSellerInfo(sellerData);

      // Fetch seller statistics
      const { data: products } = await supabase
        .from('products')
        .select('id, reviewCount, rating')
        .eq('sellerId', sellerId)
        .eq('isApproved', true);

      const { data: orders } = await supabase
        .from('orders')
        .select('id, createdAt, shippedAt, status')
        .eq('sellerId', sellerId);

      // Calculate stats
      const totalProducts = products?.length || 0;
      const totalReviews = products?.reduce((sum, p) => sum + (p.reviewCount || 0), 0) || 0;
      const avgRating = products && products.length > 0
        ? products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length
        : 0;

      // Calculate on-time shipment percentage
      const shippedOrders = orders?.filter(o => o.status === 'shipped' || o.status === 'delivered') || [];
      const onTimeOrders = shippedOrders.filter(o => {
        if (!o.shippedAt) return false;
        const shipped = new Date(o.shippedAt);
        const created = new Date(o.createdAt);
        const hoursDiff = (shipped.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 48; // Consider on-time if shipped within 48 hours
      });
      const onTimePercentage = shippedOrders.length > 0
        ? (onTimeOrders.length / shippedOrders.length) * 100
        : 100;

      // Calculate average response time (mock data for now)
      const avgResponseTime = 4; // 4 hours average response time

      setStats({
        rating: avgRating,
        totalSales: orders?.length || 0,
        responseTime: avgResponseTime,
        onTimeShipment: onTimePercentage,
        memberSince: sellerData.users.createdAt,
        totalProducts,
        reviewCount: totalReviews,
      });
    } catch (error) {
      console.error('Error fetching seller performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!stats || !sellerInfo) {
    return null;
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getPerformanceLevel = () => {
    const score = (
      (stats.rating / 5) * 0.4 +
      (stats.onTimeShipment / 100) * 0.3 +
      (stats.responseTime <= 6 ? 1 : stats.responseTime <= 12 ? 0.7 : 0.4) * 0.3
    );

    if (score >= 0.9) return { label: 'Elite Seller', color: 'gold', icon: '⭐' };
    if (score >= 0.8) return { label: 'Top Rated', color: 'blue', icon: '🏆' };
    if (score >= 0.7) return { label: 'Reliable', color: 'green', icon: '✓' };
    return { label: 'Active', color: 'gray', icon: '•' };
  };

  const performanceLevel = getPerformanceLevel();

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1">
          <Star className={`w-4 h-4 ${getRatingColor(stats.rating)} fill-current`} />
          <span className="font-medium">{stats.rating.toFixed(1)}</span>
          <span className="text-gray-500">({stats.reviewCount})</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Package className="w-4 h-4" />
          <span>{stats.totalSales} sales</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>~{stats.responseTime}h response</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seller Name with Verification Badge */}
      {sellerInfo && (
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">
            {sellerInfo.businessName || 
             `${sellerInfo.users.firstName || ''} ${sellerInfo.users.lastName || ''}`.trim() || 
             'Seller'}
          </h3>
          {sellerInfo.isApproved !== undefined && (
            <VerificationBadge isVerified={sellerInfo.isApproved} size="md" />
          )}
        </div>
      )}
      
      {/* Performance Badge */}
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-${performanceLevel.color}-50 border border-${performanceLevel.color}-200`}>
        <span className="text-xl">{performanceLevel.icon}</span>
        <span className={`font-semibold text-${performanceLevel.color}-700`}>
          {performanceLevel.label}
        </span>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < Math.round(stats.rating)
                  ? `${getRatingColor(stats.rating)} fill-current`
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl">{stats.rating.toFixed(1)}</span>
          <span className="text-gray-500">({stats.reviewCount} reviews)</span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">Total Sales</p>
            <p className="font-semibold text-lg">{stats.totalSales}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">Products</p>
            <p className="font-semibold text-lg">{stats.totalProducts}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">Response Time</p>
            <p className="font-semibold text-lg">~{stats.responseTime} hours</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-500">On-Time Shipping</p>
            <p className="font-semibold text-lg">{stats.onTimeShipment.toFixed(0)}%</p>
          </div>
        </div>
      </div>

      {/* Member Since */}
      <div className="pt-4 border-t">
        <p className="text-sm text-gray-500">
          Member since{' '}
          <span className="font-medium text-gray-700">
            {formatDistanceToNow(new Date(stats.memberSince), { addSuffix: true })}
          </span>
        </p>
      </div>

      {/* Performance Indicators */}
      <div className="space-y-2">
        {stats.rating >= 4.5 && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded">
            <span>✓</span>
            <span>Highly rated by customers</span>
          </div>
        )}
        {stats.responseTime <= 6 && (
          <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded">
            <MessageCircle className="w-4 h-4" />
            <span>Responds quickly to messages</span>
          </div>
        )}
        {stats.onTimeShipment >= 95 && (
          <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded">
            <Package className="w-4 h-4" />
            <span>Ships orders on time</span>
          </div>
        )}
      </div>
    </div>
  );
}
