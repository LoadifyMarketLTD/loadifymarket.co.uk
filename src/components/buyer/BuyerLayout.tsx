import { Outlet } from 'react-router-dom';
import BuyerSidebar from './BuyerSidebar';

/**
 * BuyerLayout — wraps buyer / account dashboard pages with the shared sidebar.
 */
export default function BuyerLayout() {
  return (
    <div className="flex min-h-[calc(100vh-120px)]">
      <BuyerSidebar />
      <main className="flex-1 overflow-x-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
