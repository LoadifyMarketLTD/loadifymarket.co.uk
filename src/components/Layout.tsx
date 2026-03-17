import { Outlet } from 'react-router-dom';
import Header from './layout/Header';
import Footer from './layout/Footer';
import CookieBanner from './CookieBanner';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Skip navigation — keyboard / screen-reader accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#1E3A5F] focus:text-white focus:rounded focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Header />
      <main id="main-content" className="flex-grow pt-[120px] md:pt-[160px]">
        <Outlet />
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
