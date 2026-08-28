import type { ReactNode } from 'react';
import { useAuthStore } from '@/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { isCapacitorContext } from '@/lib/capacitorUtils';

interface MobileWebCloneGateProps {
  clone: ReactNode;
  fallback: ReactNode;
}

/**
 * Selects the browser-only app visual clone without changing Capacitor/native.
 * Native always receives fallback.
 */
export default function MobileWebCloneGate({ clone, fallback }: MobileWebCloneGateProps) {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const enabled = Boolean(user) && isMobile && !isCapacitorContext();
  return <>{enabled ? clone : fallback}</>;
}
