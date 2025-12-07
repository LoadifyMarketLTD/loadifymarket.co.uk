import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store';

// Layout
import Layout from './components/Layout';

// Pages
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SellerDashboardPage from './pages/SellerDashboardPage';
import ProductFormPage from './pages/ProductFormPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import TrackingPage from './pages/TrackingPage';
import ReturnsPage from './pages/ReturnsPage';
import DisputesPage from './pages/DisputesPage';
import WishlistPage from './pages/WishlistPage';
import HelpPage from './pages/HelpPage';
import ContactPage from './pages/ContactPage';
import TermsPage from './pages/legal/TermsPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import CookiePage from './pages/legal/CookiePage';
import ReturnsPolicy from './pages/legal/ReturnsPolicyPage';
import ShippingPolicy from './pages/legal/ShippingPolicyPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        // Fetch user profile with role
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }: any) => {
            if (data) {
              setUser(data);
            } else {
              setLoading(false);
            }
          });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
        supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }: any) => {
            if (data) {
              setUser(data);
            }
          });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="product/:id" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="seller" element={<SellerDashboardPage />} />
          <Route path="seller/products/new" element={<ProductFormPage />} />
          <Route path="seller/products/:id/edit" element={<ProductFormPage />} />
          <Route path="admin" element={<AdminDashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />
          <Route path="tracking/:orderNumber" element={<TrackingPage />} />
          <Route path="returns" element={<ReturnsPage />} />
          <Route path="disputes" element={<DisputesPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="contact" element={<ContactPage />} />
          
          {/* Legal Pages */}
          <Route path="terms" element={<TermsPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="cookies" element={<CookiePage />} />
          <Route path="returns-policy" element={<ReturnsPolicy />} />
          <Route path="shipping-policy" element={<ShippingPolicy />} />
          
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
