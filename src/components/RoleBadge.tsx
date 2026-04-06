import { Truck, Briefcase, Package } from 'lucide-react';
import type { MarketplaceRole } from '../types';

interface RoleBadgeProps {
  role: MarketplaceRole;
  size?: 'sm' | 'md';
}

export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  if (!role) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
  };

  const getRoleConfig = () => {
    switch (role) {
      case 'carrier':
        return {
          icon: Truck,
          label: 'Carrier',
          className: 'bg-purple-500/20 border border-purple-500/40 text-purple-300',
        };
      case 'broker':
        return {
          icon: Briefcase,
          label: 'Broker',
          className: 'bg-purple-500/20 border border-purple-500/40 text-purple-300',
        };
      case 'seller':
        return {
          icon: Package,
          label: 'Seller',
          className: 'bg-green-500/20 border border-green-500/40 text-green-300',
        };
      default:
        return null;
    }
  };

  const config = getRoleConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.className} ${sizeClasses[size]}`}
      title={config.label}
    >
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
    </div>
  );
}
