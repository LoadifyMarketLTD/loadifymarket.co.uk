import { CheckCircle, Clock, Pause, Package } from 'lucide-react';

type ListingStatus = 'draft' | 'active' | 'paused' | 'sold';

interface StatusBadgeProps {
  status: ListingStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'active':
        return {
          icon: CheckCircle,
          label: 'Active',
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'draft':
        return {
          icon: Clock,
          label: 'Draft',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
      case 'paused':
        return {
          icon: Pause,
          label: 'Paused',
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        };
      case 'sold':
        return {
          icon: Package,
          label: 'Sold',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-medium border ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  );
}
