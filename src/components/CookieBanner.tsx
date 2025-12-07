import { useState } from 'react';

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
    <div className="fixed bottom-0 left-0 right-0 bg-navy-900 text-white p-4 shadow-lg z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
            We use cookies to enhance your browsing experience and analyze our traffic. 
            By clicking "Accept", you consent to our use of cookies.{' '}
            <a href="/cookies" className="text-gold-500 hover:underline">
              Learn more
            </a>
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={declineCookies}
            className="px-4 py-2 text-sm border border-gray-400 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 text-sm bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
