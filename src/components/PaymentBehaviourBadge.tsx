import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import type { PaymentBehaviour } from '../types';

interface PaymentBehaviourBadgeProps {
  behaviour: PaymentBehaviour;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export default function PaymentBehaviourBadge({
  behaviour,
  size = 'sm',
  showLabel = true,
}: PaymentBehaviourBadgeProps) {
  if (!behaviour) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  const getBehaviourConfig = () => {
    switch (behaviour) {
      case 'pays_on_time':
        return {
          icon: CheckCircle,
          label: 'Pays on time',
          className: 'bg-green-500/20 border border-green-500/40 text-green-300',
          title: 'This seller typically pays on time',
        };
      case 'sometimes_late':
        return {
          icon: Clock,
          label: 'Sometimes late',
          className: 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300',
          title: 'This seller sometimes pays late',
        };
      case 'repeated_delays':
        return {
          icon: AlertTriangle,
          label: 'Repeated delays',
          className: 'bg-red-500/20 border border-red-500/40 text-red-300',
          title: 'This seller has repeated payment delays',
        };
      default:
        return null;
    }
  };

  const config = getBehaviourConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.className} ${sizeClasses[size]}`}
      title={config.title}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
