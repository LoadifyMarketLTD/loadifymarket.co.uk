import { createClient } from '@supabase/supabase-js';
import type { Config, Context } from '@netlify/functions';
import { runSupplierAcquisition } from '../functions/_shared/supplierAcquisitionRuntime';

function supplierKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const key = (item as Record<string, unknown>).supplier_key;
    return typeof key === 'string' && key.trim() ? [key.trim().toLowerCase()] : [];
  });
}

export default async function supplierAcquisitionScheduled(
  _request: Request,
  _context: Context,
): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('supplier-acquisition-scheduled: server configuration unavailable');
    return new Response(null, { status: 204 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.rpc('server_supplier_acquisition_due_v1', {
    p_limit: 2,
  });
  if (error) {
    console.error('supplier-acquisition-scheduled: due selector failed');
    return new Response(null, { status: 204 });
  }

  const due = supplierKeys(data).slice(0, 2);
  if (due.length === 0) return new Response(null, { status: 204 });

  const results = await Promise.allSettled(
    due.map((supplierKey) => runSupplierAcquisition({
      supabase: admin,
      supplierKey,
      trigger: 'scheduled',
    })),
  );

  const summary = results.map((result, index) => {
    if (result.status === 'rejected') {
      return { supplierKey: due[index], ok: false, code: 'UNHANDLED_RUNTIME_ERROR' };
    }
    return result.value.ok
      ? {
          supplierKey: due[index],
          ok: true,
          acceptedCount: result.value.acceptedCount,
          quarantinedCount: result.value.quarantinedCount,
        }
      : {
          supplierKey: due[index],
          ok: false,
          code: result.value.code,
        };
  });
  console.log('supplier-acquisition-scheduled:', JSON.stringify(summary));

  return new Response(null, { status: 204 });
}

export const config: Config = {
  schedule: '*/15 * * * *',
};
