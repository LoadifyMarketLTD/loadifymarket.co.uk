import { CheckCircle, Clock, Pause } from 'lucide-react';

type ListingStatus = 'draft' | 'published' | 'paused';

interface StatusBadgeProps {
  status: ListingStatus;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'published':
        return {
          icon: CheckCircle,
          label: 'Active',
          className: 'bg-gold-500/10 text-gold-600 border-gold-500/20',
        };
      case 'draft':
        return {
          icon: Clock,
          label: 'Draft',
          className: 'bg-gray-100 text-gray-600 border-gray-200',
        };
      case 'paused':
        return {
          icon: Pause,
          label: 'Paused',
          className: 'bg-gray-100 text-gray-500 border-gray-200',
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
