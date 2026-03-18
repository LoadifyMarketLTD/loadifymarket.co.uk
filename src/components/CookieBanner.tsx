import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(() => {
    const consent = localStorage.getItem('cookie-consent');
    return !consent;
  });

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gold/20 shadow-cinematic-gold">
      <div className="container-cinematic py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Cookie className="w-4 h-4 text-gold flex-shrink-0" />
            <p className="text-xs sm:text-sm text-gray-700">
              We use cookies to enhance your browsing experience.{' '}
              <Link to="/cookies" className="text-gold hover:underline whitespace-nowrap">
                Cookie policy
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={declineCookies}
              className="text-xs py-1.5 px-3 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-[#1E3A5F] transition-all whitespace-nowrap"
            >
              Decline
            </button>
            <button
              onClick={acceptCookies}
              className="text-xs py-1.5 px-4 rounded-lg bg-gold text-jet font-semibold hover:bg-gold/90 transition-all whitespace-nowrap"
            >
              Accept All
            </button>
            <button
              onClick={declineCookies}
              className="p-1.5 text-gray-400 hover:text-[#1E3A5F] transition-colors flex-shrink-0 sm:hidden"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
