import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { bigBuyClientFromEnvironment } from './_shared/bigBuyClient';
import {
  runBigBuySandboxVerification,
  type BigBuySandboxVerificationConfigV1,
} from './_shared/bigBuySandboxVerification';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';

function requiredEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function positiveSafeIntegerEnv(name: string): number | null {
  const raw = requiredEnv(name);
  if (!raw || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function sandboxConfigFromEnvironment(): BigBuySandboxVerificationConfigV1 | null {
  const parentTaxonomy = positiveSafeIntegerEnv('BIGBUY_PROBE_PARENT_TAXONOMY');
  const productId = positiveSafeIntegerEnv('BIGBUY_PROBE_PRODUCT_ID');
  const variationId = positiveSafeIntegerEnv('BIGBUY_PROBE_VARIATION_ID');
  const productSku = requiredEnv('BIGBUY_PROBE_PRODUCT_SKU');
  const variationSku = requiredEnv('BIGBUY_PROBE_VARIATION_SKU');

  if (!parentTaxonomy || !productId || !variationId || !productSku || !variationSku) return null;
  return { parentTaxonomy, productId, productSku, variationId, variationSku };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  const environment = (process.env.BIGBUY_API_ENVIRONMENT ?? 'sandbox').trim().toLowerCase();
  if (environment !== 'sandbox') {
    return jsonResponse(409, {
      error: 'BigBuy verification runner is sandbox-only',
      provider: 'bigbuy',
      capabilityPromotionPerformed: false,
    }, METHODS);
  }
  if (!requiredEnv('BIGBUY_API_KEY')) {
    return jsonResponse(409, {
      error: 'BigBuy sandbox API key is not configured',
      provider: 'bigbuy',
      capabilityPromotionPerformed: false,
    }, METHODS);
  }

  const config = sandboxConfigFromEnvironment();
  if (!config) {
    return jsonResponse(409, {
      error: 'BigBuy controlled sandbox identifiers are not fully configured',
      provider: 'bigbuy',
      capabilityPromotionPerformed: false,
    }, METHODS);
  }

  const result = await runBigBuySandboxVerification({
    client: bigBuyClientFromEnvironment(),
    context: { correlationId: randomUUID() },
    config,
  });

  if (!result.ok) {
    const status = result.errorClass === 'RATE_LIMITED'
      ? 429
      : result.errorClass === 'AUTH_CONFIGURATION_FAILURE'
        ? 502
        : 409;
    return jsonResponse(status, {
      ok: false,
      provider: 'bigbuy',
      errorClass: result.errorClass,
      error: 'BigBuy sandbox read-only verification did not pass',
      capabilityPromotionPerformed: false,
      providerWriteExecuted: false,
      piiProcessed: false,
    }, METHODS);
  }

  return jsonResponse(200, {
    ok: true,
    evidence: result.data,
    activation: {
      hostedActivationChanged: false,
      capabilityPromotionPerformed: false,
      runtimeAdapterEnabled: false,
    },
  }, METHODS);
};
