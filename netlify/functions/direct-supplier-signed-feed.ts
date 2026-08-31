import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { parseDirectSupplierOnboardingManifest } from './_shared/directSupplierOnboarding';
import { processDirectSupplierSignedFeed } from './_shared/directSupplierSignedFeedPipeline';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const MAX_BODY_BYTES = 2 * 1024 * 1024;

function flag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

/**
 * Machine self-service ingress for an onboarded Direct Supplier.
 *
 * The supplier signs the exact JSON envelope body with HMAC-SHA256. CSV/XML/
 * SFTP/API are onboarding transport declarations; before reaching this route
 * their data must be normalized into the canonical signed JSON feed contract.
 * The endpoint is disabled by default and cannot activate commerce/listings.
 */
export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  if (!flag(process.env.DIRECT_SUPPLIER_SIGNED_FEED_ENDPOINT_ENABLED)) {
    return jsonResponse(404, { error: 'Not found' }, METHODS);
  }

  const rawBody = event.body || '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'Supplier feed is too large' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const manifestRaw = process.env.DIRECT_SUPPLIER_ONBOARDING_MANIFEST_JSON;
  const signingSecret = process.env.DIRECT_SUPPLIER_SIGNING_SECRET;
  if (!supabaseUrl || !serviceRoleKey || !manifestRaw || !signingSecret) {
    return jsonResponse(503, { error: 'Supplier feed endpoint is not configured' }, METHODS);
  }

  let manifestValue: unknown;
  try { manifestValue = JSON.parse(manifestRaw) as unknown; }
  catch { return jsonResponse(503, { error: 'Supplier feed endpoint is not configured' }, METHODS); }
  const manifest = parseDirectSupplierOnboardingManifest(manifestValue);
  if (!manifest.ok) return jsonResponse(503, { error: 'Supplier feed endpoint is not configured' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const result = await processDirectSupplierSignedFeed({
      supabase: admin,
      manifest: manifest.manifest,
      secret: signingSecret,
      timestamp: event.headers['x-loadify-supplier-timestamp'],
      signature: event.headers['x-loadify-supplier-signature'],
      rawBody,
    });

    if (!result.ok) {
      const authFailure = result.reason === 'SIGNATURE_REJECTED';
      return jsonResponse(authFailure ? 401 : 400, {
        error: authFailure ? 'Supplier feed authentication failed' : 'Supplier feed rejected',
        reason: result.reason,
        details: authFailure ? undefined : result.details,
      }, METHODS);
    }

    return jsonResponse(202, {
      ok: true,
      status: result.commit.replayed ? 'replayed' : 'staged',
      persisted: result.commit.persisted,
      commercialActivationPerformed: false,
      capabilityPromotionPerformed: false,
      marketplaceListingPerformed: false,
    }, METHODS);
  } catch (error) {
    console.error('direct-supplier-signed-feed: atomic staging failed', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse(503, { error: 'Supplier feed staging unavailable' }, METHODS);
  }
};
