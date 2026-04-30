/**
 * APK Runtime Diagnostics
 *
 * Patches window.fetch when running inside the Capacitor native APK so every
 * outgoing request is logged to the console.  This helps identify which fetch
 * call is responsible for the "Failed to execute 'fetch' on 'Window': Invalid
 * value" crash seen on Android WebView.
 *
 * All functions in this file are guarded by isApkNative() — nothing runs on
 * the production web app.
 *
 * What is logged (no secrets or auth values are ever emitted):
 *   • URL hostname only
 *   • HTTP method
 *   • Option keys present in the RequestInit object
 *   • Safe header names (auth/key/token headers counted but not named)
 *   • keepalive value before the call reaches the WebView
 *   • Full error name, message, and stack on failure
 */

import { Capacitor } from '@capacitor/core';

const TAG = '[APK-DIAG]';
let _callId = 0;

/** Extract the hostname from any valid RequestInfo / URL value. */
function safeDomain(input: RequestInfo | URL): string {
  try {
    const raw = input instanceof Request ? input.url : String(input);
    return new URL(raw).hostname;
  } catch {
    return '(unresolvable-url)';
  }
}

/** Comma-separated list of all keys present in a RequestInit, or '(none)'. */
function initKeys(init: RequestInit | undefined): string {
  if (!init) return '(none)';
  const keys = Object.keys(init);
  return keys.length ? keys.join(',') : '(empty-object)';
}

/** Header names with sensitive ones replaced by a count. */
function safeHeaderNames(headers: HeadersInit | undefined): string {
  if (!headers) return '(none)';
  try {
    let names: string[];
    if (headers instanceof Headers) {
      names = [...headers.keys()];
    } else if (Array.isArray(headers)) {
      // string[][] — each entry is [name, value]
      names = (headers as string[][]).map(([k]) => k ?? '');
    } else {
      names = Object.keys(headers as Record<string, string>);
    }
    const safe: string[] = [];
    let sensitive = 0;
    for (const n of names) {
      const lo = n.toLowerCase();
      if (
        lo === 'authorization' ||
        lo.includes('apikey') ||
        lo.includes('token') ||
        lo.includes('secret') ||
        lo.includes('key')
      ) {
        sensitive++;
      } else {
        safe.push(n);
      }
    }
    return safe.join(',') + (sensitive > 0 ? ` +${sensitive}×sensitive` : '');
  } catch {
    return '(error-reading-headers)';
  }
}

/**
 * Returns true when the JS bundle is running inside the Capacitor Android APK
 * (i.e. on a real device or emulator via the native WebView bridge).
 *
 * Exported so other diagnostic callers (supabase.ts, Login.tsx) can use the
 * same check instead of duplicating the window.Capacitor inspection.
 */
export function isApkNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * Log runtime proof of the Supabase env vars baked into the bundle.
 *
 * Only executes when the app is running as a native APK (Capacitor).
 * Nothing is logged on the production web app.
 *
 * Emits: URL validity flag, key length, has-whitespace flag, eyJ-prefix flag.
 * The full key and the first/last characters are never emitted.
 */
export function logApkEnvDiagnostics(): void {
  if (!isApkNative()) return;

  // Read raw — intentionally NOT trimmed so hidden chars are visible in flags.
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  const urlValid = url.trimStart().startsWith('https://');
  const keyOk = key.length > 0 && !/\s/.test(key) && key.startsWith('eyJ');

  console.warn('[APK ENV CHECK]', {
    urlValid,
    keyLength: key.length,
    hasWhitespace: /\s/.test(key),
    startsWithEyJ: key.startsWith('eyJ'),
  });

  if (!urlValid || !keyOk) {
    console.error('[FATAL] INVALID SUPABASE ENV IN APK', {
      urlValid,
      keyNonEmpty: key.length > 0,
      keyNoWhitespace: !/\s/.test(key),
      keyStartsEyJ: key.startsWith('eyJ'),
    });
  }
}

/**
 * Install a diagnostic wrapper around window.fetch.
 *
 * Only active when Capacitor.isNativePlatform() returns true (i.e. when the
 * app is running as the signed APK on a real Android device or emulator).
 */
export function initApkFetchDiagnostics(): void {
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

  const buildSha = (import.meta.env.VITE_BUILD_SHA ?? 'local').slice(0, 7);
  const buildNum = import.meta.env.VITE_BUILD_NUMBER ?? '0';
  const buildTime = import.meta.env.VITE_BUILD_TIME ?? 'unknown';

  // Always log Capacitor detection so the log is useful even when the patch
  // is skipped (helps confirm whether the bundle is running as APK or web).
  const isNative = isApkNative();
  console.warn(
    TAG,
    `Capacitor detected: ${typeof (window as Window & { Capacitor?: unknown }).Capacitor !== 'undefined'}`,
    `isNative: ${isNative}`,
    `build: ${buildSha} #${buildNum} @ ${buildTime}`,
  );

  if (!isNative) {
    console.warn(TAG, 'Not a native platform — global fetch patch skipped');
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = function apkDiagFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const id = ++_callId;
    const domain = safeDomain(input);
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const keys = initKeys(init);
    const headers = safeHeaderNames(init?.headers);
    const keepaliveBefore =
      init != null && 'keepalive' in init ? String((init as RequestInit & { keepalive?: unknown }).keepalive) : 'absent';

    console.warn(
      `${TAG} #${id} START`,
      `domain=${domain}`,
      `method=${method}`,
      `optKeys=[${keys}]`,
      `headers=[${headers}]`,
      `keepalive=${keepaliveBefore}`,
    );

    return originalFetch(input, init).then(
      (res: Response) => {
        console.warn(`${TAG} #${id} OK`, `status=${res.status}`, `domain=${domain}`);
        return res;
      },
      (err: unknown) => {
        const name = err instanceof Error ? err.name : 'UnknownError';
        const msg = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? (err.stack ?? '(no stack)') : '(no stack)';
        console.error(
          `${TAG} #${id} FAIL`,
          `domain=${domain}`,
          `optKeys=[${keys}]`,
          `keepalive=${keepaliveBefore}`,
          `error: ${name}: ${msg}`,
          `stack: ${stack}`,
        );
        throw err;
      },
    );
  };

  console.warn(TAG, `Global fetch patched — every request will be logged (build ${buildSha} #${buildNum})`);
}
