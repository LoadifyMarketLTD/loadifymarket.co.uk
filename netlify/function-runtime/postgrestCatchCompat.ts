import { createClient } from '@supabase/supabase-js';

type CatchHandler = (reason: unknown) => unknown;
type ThenableWithCatch = PromiseLike<unknown> & {
  catch?: (onRejected: CatchHandler) => Promise<unknown>;
};

let installed = false;

function addCatchToThenablePrototype(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;

  let prototype = Object.getPrototypeOf(value) as Record<string, unknown> | null;
  while (prototype && prototype !== Object.prototype) {
    if (typeof prototype.then === 'function') {
      if (typeof prototype.catch !== 'function') {
        Object.defineProperty(prototype, 'catch', {
          configurable: true,
          enumerable: false,
          writable: true,
          value(this: ThenableWithCatch, onRejected: CatchHandler) {
            return Promise.resolve(this).catch(onRejected);
          },
        });
      }
      return;
    }
    prototype = Object.getPrototypeOf(prototype) as Record<string, unknown> | null;
  }
}

/**
 * Supabase PostgREST builders are PromiseLike (they implement `.then`) but the
 * current runtime version does not expose Promise `.catch` directly. A small
 * number of legacy checkout paths use `.catch` for best-effort cleanup/RPC
 * calls, which otherwise throws synchronously before the query can run.
 *
 * Keep this compatibility shim scoped to the two payment entrypoints that still
 * contain those legacy call sites. It adds normal Promise catch semantics to the
 * shared PostgREST builder prototype and does not change successful query data,
 * database error objects, authentication, or payment behaviour.
 */
export function installPostgrestCatchCompat(): void {
  if (installed) return;

  // Probe objects are never awaited, so these calls perform no network I/O.
  // They only give us instances of the same PostgREST builder classes used by
  // clients created later inside the checkout handlers.
  const probe = createClient('https://example.supabase.co', 'public-anon-probe-key', {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  addCatchToThenablePrototype(probe.from('__loadify_probe__').select('*'));
  addCatchToThenablePrototype(probe.rpc('__loadify_probe_rpc__'));

  installed = true;
}
