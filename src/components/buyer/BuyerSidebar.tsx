import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  RotateCcw,
  AlertTriangle,
  MessageSquare,
  Bell,
  Truck,
  Settings,
  ChevronRight,
  User,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'My Account',    to: '/dashboard',            icon: LayoutDashboard, exact: true },
  { label: 'Orders',        to: '/orders',               icon: ShoppingBag },
  { label: 'Wishlist',      to: '/wishlist',             icon: Heart },
  { label: 'Returns',       to: '/returns',              icon: RotateCcw },
  { label: 'Disputes',      to: '/disputes',             icon: AlertTriangle },
  { label: 'Messages',      to: '/messages',             icon: MessageSquare },
  { label: 'Track Order',   to: '/track-order',          icon: Truck },
  { label: 'Notifications', to: '/notifications',        icon: Bell },
  { label: 'Settings',      to: '/account-settings',     icon: Settings },
];

/**
 * BuyerSidebar — navigation sidebar for the buyer / account area.
 */
export default function BuyerSidebar() {
  const { pathname } = useLocation();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <aside className="w-56 flex-shrink-0 hidden lg:flex flex-col bg-white border-r border-gray-200 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-[#0A2239] flex items-center justify-center">
          <User className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <span className="text-sm font-extrabold text-gray-900">My Account</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5" aria-label="Account navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                active
                  ? 'bg-[#0A2239] text-white font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-[#D4AF37]' : 'text-gray-400 group-hover:text-gray-600'}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-white/50" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-gray-200">
        <Link
          to="/shop"
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 py-1 transition-colors"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Continue Shopping
        </Link>
      </div>
    </aside>
  );
}
