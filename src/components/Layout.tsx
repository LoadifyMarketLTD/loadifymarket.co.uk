import { Outlet } from 'react-router-dom';
import Header from './layout/Header';
import Footer from './layout/Footer';
import CookieBanner from './CookieBanner';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-grow pt-[120px] md:pt-[120px]">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
