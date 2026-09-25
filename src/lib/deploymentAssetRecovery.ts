const RECOVERY_KEY = 'loadify:deployment-asset-recovery-at';
const RECOVERY_WINDOW_MS = 2 * 60 * 1000;

const DEPLOYMENT_ASSET_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
  /loading chunk [^ ]+ failed/i,
  /failed to load module script/i,
  /unable to preload css for/i,
  /cannot read properties of undefined \(reading ['"]default['"]\)/i,
];

export function isDeploymentAssetError(error: unknown): boolean {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error ?? '');

  return DEPLOYMENT_ASSET_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

function canAttemptRecovery(): boolean {
  try {
    const lastAttempt = Number(window.sessionStorage.getItem(RECOVERY_KEY) || '0');
    return !Number.isFinite(lastAttempt) || Date.now() - lastAttempt > RECOVERY_WINDOW_MS;
  } catch {
    return true;
  }
}

function markRecoveryAttempt(): void {
  try {
    window.sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  } catch {
    // Session storage can be unavailable in privacy modes; recovery can still continue.
  }
}

async function clearLoadifyWebCaches(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // Best effort only. A full reload still refreshes the application shell.
    }
  }

  if ('caches' in window) {
    try {
      const names = await window.caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('loadify-'))
          .map((name) => window.caches.delete(name)),
      );
    } catch {
      // Best effort only.
    }
  }
}

/**
 * Recover from an atomic deployment replacing a Vite lazy-loaded chunk while
 * an older SPA session is still open. Recovery is one-shot within a short
 * window so a genuine application error can never cause a reload loop.
 */
export function recoverFromDeploymentAssetError(error: unknown): boolean {
  if (typeof window === 'undefined' || !isDeploymentAssetError(error) || !canAttemptRecovery()) {
    return false;
  }

  markRecoveryAttempt();

  void clearLoadifyWebCaches().finally(() => {
    window.location.reload();
  });

  return true;
}
