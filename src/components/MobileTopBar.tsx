/**
 * MobileTopBar — home-page-only top bar (< md).
 * Logo left · Search + Notifications right · height 56px.
 * Hidden on desktop (md+) via Tailwind.
 */

import { Link, useNavigate } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';
import logo from '@/assets/loadify-logo.svg';

export default function MobileTopBar() {
  const navigate = useNavigate();

  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        height: '56px',
        background: 'rgba(11,15,26,0.97)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
      aria-label="Loadify Market top bar"
    >
      {/* Logo */}
      <Link to="/" aria-label="Loadify Market — Home" className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="" aria-hidden="true" className="h-8 w-8" />
        <span className="font-display text-[16px] font-extrabold text-white tracking-tight leading-none">
          Loadify
        </span>
      </Link>

      {/* Right icons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => navigate('/catalog')}
          aria-label="Search marketplace"
          className="p-2.5 rounded-xl text-white/60 hover:text-[#FBBF24] hover:bg-white/10 transition-all"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link
          to="/inbox"
          aria-label="Notifications and messages"
          className="p-2.5 rounded-xl text-white/60 hover:text-[#FBBF24] hover:bg-white/10 transition-all"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
