import { Outlet } from 'react-router-dom';
import SellerSidebar from './SellerSidebar';

/**
 * SellerLayout — wraps seller dashboard pages with the shared sidebar.
 * The <Outlet /> renders the active seller page inside the main content area.
 *
 * NOTE: This layout is wired up in App.tsx for routes under /seller/.
 * The existing SellerDashboardPage continues to work as-is; this layout
 * provides the persistent sidebar for pages that opt in.
 */
export default function SellerLayout() {
  return (
    <div className="flex min-h-[calc(100vh-120px)]">
      <SellerSidebar />
      <main className="flex-1 overflow-x-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
