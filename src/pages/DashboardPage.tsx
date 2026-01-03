import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { User, Settings, Package, MessageSquare, Heart, Bell } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const quickLinks = [
    {
      to: '/account/settings',
      icon: Settings,
      title: 'Account Settings',
      description: 'Manage your email, phone, and personal information',
    },
    {
      to: '/orders',
      icon: Package,
      title: 'My Orders',
      description: 'View and track your orders',
    },
    {
      to: '/wishlist',
      icon: Heart,
      title: 'Wishlist',
      description: 'View your saved items',
    },
    {
      to: '/messages',
      icon: MessageSquare,
      title: 'Messages',
      description: 'Communication with sellers',
    },
    {
      to: '/notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Manage notification preferences',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        {user && (
          <p className="text-gray-600 mt-2">
            Welcome back, {user.firstName || user.email}!
          </p>
        )}
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="card hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-navy-50 rounded-lg group-hover:bg-navy-100 transition-colors">
                  <Icon className="w-6 h-6 text-navy-800" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-navy-800 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-gray-600">{link.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Account Overview Card */}
      {user && (
        <div className="card">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-gray-100 rounded-full">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Account Information</h2>
              <p className="text-sm text-gray-600">Your basic account details</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-900">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Account Type</p>
              <p className="font-medium text-gray-900 capitalize">{user.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="font-medium text-gray-900">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t">
            <Link
              to="/account/settings"
              className="inline-flex items-center gap-2 text-navy-800 hover:text-navy-700 font-medium"
            >
              <Settings className="w-4 h-4" />
              Edit Account Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
