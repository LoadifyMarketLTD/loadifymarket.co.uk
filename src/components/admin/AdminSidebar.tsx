import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingBag,
  AlertTriangle,
  Star,
  DollarSign,
  Settings,
  Truck,
  Flag,
  ChevronRight,
  Shield,
} from 'lucide-react';

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',         to: '/admin/dashboard',    icon: LayoutDashboard, exact: true },
  { label: 'Seller Approvals',  to: '/admin/sellers',      icon: Users },
  { label: 'Products',          to: '/admin/dashboard',    icon: Package },
  { label: 'Orders',            to: '/admin/dashboard',    icon: ShoppingBag },
  { label: 'Disputes',          to: '/admin/dashboard',    icon: AlertTriangle },
  { label: 'Reviews',           to: '/admin/reviews',      icon: Star },
  { label: 'Shipments',         to: '/admin/shipments',    icon: Truck },
  { label: 'Reported Listings', to: '/admin/reported',     icon: Flag },
  { label: 'Payouts',           to: '/admin/dashboard',    icon: DollarSign },
  { label: 'Categories',        to: '/admin/categories',   icon: Settings },
];

/**
 * AdminSidebar — navigation sidebar for the admin area.
 */
export default function AdminSidebar() {
  const { pathname } = useLocation();

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <aside className="w-60 flex-shrink-0 hidden lg:flex flex-col bg-[#0A2239] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-[#D4AF37] flex items-center justify-center">
          <Shield className="h-4 w-4 text-[#0A2239]" />
        </div>
        <span className="text-sm font-extrabold text-white">Admin Panel</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${item.to}`}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
                active
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-[#D4AF37]' : 'text-white/40 group-hover:text-white/70'}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 py-1 transition-colors"
        >
          View Site
        </Link>
      </div>
    </aside>
  );
}
