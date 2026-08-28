import { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { isCapacitorContext } from '@/lib/capacitorUtils';
import '@/authenticated-mobile-web.css';

/**
 * Adds the browser-only mobile app identity class.
 *
 * Never activates inside Capacitor/native. This lets the mobile website adopt
 * the installed app's dark shell after authentication without redesigning or
 * mutating the downloadable application.
 */
export default function MobileWebIdentityClass() {
  const { user, isLoading } = useAuthStore();
  const isMobile = useIsMobile();
  const isNativeContext = isCapacitorContext();

  useEffect(() => {
    const root = document.documentElement;
    const enabled = !isLoading && Boolean(user) && isMobile && !isNativeContext;
    root.classList.toggle('mobile-web-app-identity', enabled);

    return () => {
      root.classList.remove('mobile-web-app-identity');
    };
  }, [isLoading, isMobile, isNativeContext, user]);

  return null;
}
