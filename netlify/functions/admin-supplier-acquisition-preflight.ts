import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { resolveSupplierAcquisitionConfig } from './_shared/supplierAcquisitionConfig';

const METHODS = 'POST, OPTIONS';
const CONFIG_REF_RE = /^env:[A-Z][A-Z0-9_]{2,127}$/;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: {
    supplierKey?: string;
    configRef?: string;
    transport?: string;
    sourceFormat?: string;
  };
  try {
    body = JSON.parse(event.body || '{}') as typeof body;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  const supplierKey = typeof body.supplierKey === 'string' ? body.supplierKey.trim().toLowerCase() : '';
  const configRef = typeof body.configRef === 'string' ? body.configRef.trim() : '';
  const transport = typeof body.transport === 'string' ? body.transport.trim().toLowerCase() : '';
  const sourceFormat = typeof body.sourceFormat === 'string' ? body.sourceFormat.trim().toLowerCase() : '';
  if (!supplierKey || !CONFIG_REF_RE.test(configRef) || !transport || !sourceFormat) {
    return jsonResponse(400, { error: 'supplierKey, configRef, transport and sourceFormat are required' }, METHODS);
  }

  const resolved = resolveSupplierAcquisitionConfig(configRef);
  if (!resolved.ok) {
    return jsonResponse(200, {
      ok: true,
      preflight: {
        provisioned: resolved.code !== 'CONFIG_NOT_PROVISIONED',
        valid: false,
        bound: false,
        code: resolved.code,
        secretMaterialReturned: false,
        externalAccessPerformed: false,
      },
    }, METHODS);
  }

  const config = resolved.config;
  const bound = (
    config.supplierKey === supplierKey
    && config.transport === transport
    && config.sourceFormat === sourceFormat
  );

  const safeDetails = config.kind === 'http'
    ? {
        kind: 'http',
        allowedHostCount: config.allowedHosts.length,
        customHeadersConfigured: Boolean(config.headers && Object.keys(config.headers).length > 0),
        timeoutMs: config.timeoutMs,
        maxBytes: config.maxBytes,
      }
    : {
        kind: 'sftp',
        hostKeyVerificationConfigured: Boolean(config.hostKeySha256),
        authenticationMode: config.privateKey ? 'private_key' : 'password',
        remotePathConfigured: Boolean(config.remotePath),
        timeoutMs: config.timeoutMs,
        maxBytes: config.maxBytes,
      };

  return jsonResponse(200, {
    ok: true,
    preflight: {
      provisioned: true,
      valid: true,
      bound,
      binding: {
        supplierKeyMatches: config.supplierKey === supplierKey,
        transportMatches: config.transport === transport,
        sourceFormatMatches: config.sourceFormat === sourceFormat,
      },
      config: safeDetails,
      secretMaterialReturned: false,
      externalAccessPerformed: false,
    },
  }, METHODS);
};
