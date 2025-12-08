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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="container-cinematic">
        <div className="card-glass flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeInUp">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-2 rounded-premium-sm bg-gold/20 flex-shrink-0">
              <Cookie className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-sm text-white/80">
                We use cookies to enhance your browsing experience and analyze our traffic.
                By clicking "Accept", you consent to our use of cookies.{' '}
                <Link to="/cookies" className="text-gold hover:underline">
                  Learn more
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={declineCookies}
              className="btn-glass py-2 px-4 text-sm"
            >
              Decline
            </button>
            <button
              onClick={acceptCookies}
              className="btn-primary py-2 px-4 text-sm"
            >
              Accept All
            </button>
          </div>
          <button
            onClick={declineCookies}
            className="absolute top-2 right-2 md:hidden p-2 text-white/40 hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
