import { createClient } from '@supabase/supabase-js';

type CatchHandler = (reason: unknown) => unknown;
type ThenableWithCatch = PromiseLike<unknown> & {
  catch?: (onRejected: CatchHandler) => Promise<unknown>;
};

type LegacyMutationCountOptions = {
  head?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
};

type PostgrestResultLike = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
  [key: string]: unknown;
};

type BuilderLike = {
  method?: unknown;
};

type RpcFactoryLike = {
  rpc?: (...args: unknown[]) => unknown;
  [key: symbol]: unknown;
};

const MUTATION_COUNT_COMPAT_MARKER = Symbol.for('loadify.postgrest.mutation-count-compat');
const RPC_CATCH_FACTORY_COMPAT_MARKER = Symbol.for('loadify.postgrest.rpc-catch-factory-compat');
let installed = false;

function addCatchToThenablePrototype(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;

  let prototype = Object.getPrototypeOf(value) as Record<PropertyKey, unknown> | null;
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
    prototype = Object.getPrototypeOf(prototype) as Record<PropertyKey, unknown> | null;
  }
}

function addCatchDirectly(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;

  const thenable = value as ThenableWithCatch;
  if (typeof thenable.then !== 'function' || typeof thenable.catch === 'function') return;

  Object.defineProperty(thenable, 'catch', {
    configurable: true,
    enumerable: false,
    writable: true,
    value(this: ThenableWithCatch, onRejected: CatchHandler) {
      return Promise.resolve(this).catch(onRejected);
    },
  });
}

function installRpcCatchFactoryCompat(client: unknown): void {
  if (!client || (typeof client !== 'object' && typeof client !== 'function')) return;

  let prototype = Object.getPrototypeOf(client) as RpcFactoryLike | null;
  while (prototype && prototype !== Object.prototype) {
    const originalRpc = prototype.rpc;
    if (typeof originalRpc === 'function') {
      if (prototype[RPC_CATCH_FACTORY_COMPAT_MARKER] === true) return;

      Object.defineProperty(prototype, 'rpc', {
        configurable: true,
        enumerable: false,
        writable: true,
        value(this: unknown, ...args: unknown[]) {
          const result = originalRpc.apply(this, args);
          addCatchToThenablePrototype(result);
          addCatchDirectly(result);
          return result;
        },
      });

      Object.defineProperty(prototype, RPC_CATCH_FACTORY_COMPAT_MARKER, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: true,
      });
      return;
    }
    prototype = Object.getPrototypeOf(prototype) as RpcFactoryLike | null;
  }
}

function addLegacyMutationCountCompat(value: unknown): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;

  let prototype = Object.getPrototypeOf(value) as Record<PropertyKey, unknown> | null;
  while (prototype && prototype !== Object.prototype) {
    const originalSelect = prototype.select;
    if (typeof originalSelect === 'function') {
      if (prototype[MUTATION_COUNT_COMPAT_MARKER] === true) return;

      Object.defineProperty(prototype, 'select', {
        configurable: true,
        enumerable: false,
        writable: true,
        value(
          this: BuilderLike,
          columns?: string,
          options?: LegacyMutationCountOptions,
        ) {
          // PostgREST mutation builders accept select(columns) to request the
          // affected rows back. Legacy checkout code also passes the read-query
          // { count, head } options as a second argument; that argument is ignored
          // by the installed supabase-js version, so a successful PATCH can return
          // count=null and be mistaken for a lost reservation.
          const selected = (originalSelect as (this: BuilderLike, columns?: string) => unknown)
            .call(this, columns);
          const method = String((selected as BuilderLike | null)?.method ?? this.method ?? '').toUpperCase();

          if (
            options?.head === true
            && options.count === 'exact'
            && method !== 'GET'
            && method !== 'HEAD'
          ) {
            // Keep the mutation's normal return=representation semantics and
            // derive the affected-row count from the returned rows. This is
            // exact for the checkout reservation UPDATE because it is filtered
            // by one product id plus listingStatus='active'. Zero rows remains a
            // real conflict; one returned row is a successful reservation.
            return Promise.resolve(selected as PromiseLike<PostgrestResultLike>).then((result) => {
              if (!result || result.error || !Array.isArray(result.data)) return result;
              return { ...result, count: result.data.length };
            });
          }

          return selected;
        },
      });

      Object.defineProperty(prototype, MUTATION_COUNT_COMPAT_MARKER, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: true,
      });
      return;
    }
    prototype = Object.getPrototypeOf(prototype) as Record<PropertyKey, unknown> | null;
  }
}

/**
 * Supabase PostgREST builders are PromiseLike (they implement `.then`) but the
 * current runtime version does not expose Promise `.catch` directly. A small
 * number of legacy checkout paths use `.catch` for best-effort cleanup/RPC
 * calls, which otherwise throws synchronously before the query can run.
 *
 * The RPC factory is wrapped as well as the shared builder prototype. This is
 * intentionally redundant: Netlify's bundled runtime can materialise an RPC
 * thenable whose concrete object does not inherit the probe object's patched
 * prototype. Decorating each rpc() result guarantees the legacy detached
 * `rpc.call(client, ...)` checkout path receives Promise-style `.catch`.
 *
 * The same legacy payment paths use mutation.select('id', { count:'exact',
 * head:true }) to determine whether an atomic reservation UPDATE matched one
 * row. In the installed supabase-js version the mutation select overload ignores
 * that second options object, so count can be null even when the row was updated.
 * For those mutation-only calls we derive count from the returned representation.
 *
 * Keep both compatibility shims scoped to the two payment entrypoints that still
 * contain those legacy call sites. They do not change database predicates,
 * authentication, pricing, tax, Stripe ownership or successful mutation data.
 */
export function installPostgrestCatchCompat(): void {
  if (installed) return;

  // Probe objects are never awaited, so these calls perform no network I/O.
  // They only give us instances of the same PostgREST builder classes used by
  // clients created later inside the checkout handlers.
  const probe = createClient('https://example.supabase.co', 'public-anon-probe-key', {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  installRpcCatchFactoryCompat(probe);

  const rpcProbe = probe.rpc('__loadify_probe_rpc__');
  addCatchToThenablePrototype(rpcProbe);
  addCatchDirectly(rpcProbe);
  addCatchToThenablePrototype(probe.from('__loadify_probe__').select('*'));
  addLegacyMutationCountCompat(
    probe.from('__loadify_probe__').update({ marker: true }).eq('id', '__probe__'),
  );

  installed = true;
}
