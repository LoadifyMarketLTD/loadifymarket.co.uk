import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Truck,
  RotateCcw,
  Star,
  DollarSign,
  Settings,
  Plus,
  Store,
  FileText,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    to: '/seller',                   icon: LayoutDashboard, exact: true },
  { label: 'My Products',  to: '/seller/products/new',      icon: Package },
  { label: 'Orders',       to: '/seller',                   icon: ShoppingBag },
  { label: 'Shipments',    to: '/seller/shipments',         icon: Truck },
  { label: 'Returns',      to: '/seller/returns',           icon: RotateCcw },
  { label: 'Reviews',      to: '/seller/reviews',           icon: Star },
  { label: 'Payouts',      to: '/seller',                   icon: DollarSign },
  { label: 'RFQ Inbox',    to: '/seller/rfq',               icon: FileText },
  { label: 'Profile',      to: '/seller/profile',           icon: Settings },
];

/**
 * SellerSidebar — navigation sidebar for the seller dashboard area.
 * Highlights the active route and provides quick-access CTAs.
 */
export default function SellerSidebar() {
  const { pathname } = useLocation();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <aside className="w-60 flex-shrink-0 hidden lg:flex flex-col bg-white border-r border-gray-200 min-h-screen">
      {/* Branding strip */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
        <div className="w-8 h-8 rounded-lg bg-[#0A2239] flex items-center justify-center">
          <Store className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <span className="text-sm font-extrabold text-gray-900">Seller Hub</span>
      </div>

      {/* Quick action */}
      <div className="px-4 py-3 border-b border-gray-200">
        <Link
          to="/seller/products/new"
          className="flex items-center justify-center gap-2 w-full bg-[#D4AF37] hover:bg-[#C9A227] text-gray-900 text-xs font-extrabold py-2.5 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Listing
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5" aria-label="Seller navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${item.to}`}
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

      {/* Bottom links */}
      <div className="px-4 py-4 border-t border-gray-200 space-y-1">
        <Link
          to="/shop"
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 py-1 transition-colors"
        >
          <Store className="h-3.5 w-3.5" />
          View Marketplace
        </Link>
        <Link
          to="/seller-guidelines"
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 py-1 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Seller Guidelines
        </Link>
      </div>
    </aside>
  );
}
