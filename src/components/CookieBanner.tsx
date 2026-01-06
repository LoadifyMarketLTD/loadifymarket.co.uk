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
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[100] animate-fadeInUp">
      <div className="card-glass p-4 shadow-cinematic-gold">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-gold/20 flex-shrink-0">
            <Cookie className="w-4 h-4 text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 leading-relaxed">
              We use cookies to enhance your browsing experience and analyze our traffic. By clicking "Accept", you consent to our use of cookies.{' '}
              <Link to="/cookies" className="text-gold hover:underline whitespace-nowrap">
                Read our cookie policy
              </Link>
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={declineCookies}
                className="text-xs py-1.5 px-3 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                Decline
              </button>
              <button
                onClick={acceptCookies}
                className="text-xs py-1.5 px-4 rounded-lg bg-gold text-jet font-semibold hover:bg-gold/90 transition-all"
              >
                Accept All
              </button>
            </div>
          </div>
          <button
            onClick={declineCookies}
            className="p-1 text-white/40 hover:text-white transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
