import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

/**
 * AdminLayout — wraps admin dashboard pages with the shared dark sidebar.
 */
export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-120px)]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
