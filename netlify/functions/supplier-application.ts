import { Buffer } from 'node:buffer';
import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';
import { verifyCaptchaToken } from './_shared/verifyCaptcha';
import { jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const MAX_BODY_BYTES = 32 * 1024;
const MIN_SUBMIT_MS = 1_500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORBIDDEN_KEYS = /^(password|secret|access[_-]?token|refresh[_-]?token|api[_-]?key|credential|card(number)?|private[_-]?key)$/i;
const SUPPORT_EMAIL = (process.env.SUPPORT_INBOX_EMAIL || 'contact@loadifymarket.co.uk').trim().toLowerCase();

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function containsForbiddenKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenKey);
  if (!isRecord(value)) return false;
  return Object.entries(value).some(([key, child]) => FORBIDDEN_KEYS.test(key) || containsForbiddenKey(child));
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))].slice(0, max);
}

function numericValue(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const raw = event.body || '';
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { error: 'Supplier application is too large' }, METHODS);
  }

  let input: unknown;
  try {
    input = JSON.parse(raw || '{}') as unknown;
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }
  if (!isRecord(input)) return jsonResponse(400, { error: 'Invalid supplier application' }, METHODS);
  if (containsForbiddenKey(input)) {
    return jsonResponse(400, { error: 'Secrets, credentials and payment data are not accepted in supplier applications' }, METHODS);
  }

  const honeypot = text(input.honeypot || input.botField || input['bot-field']);
  if (honeypot) return jsonResponse(201, { ok: true, candidateOnly: true }, METHODS);

  if (typeof input.submittedAt === 'number') {
    const elapsed = Date.now() - input.submittedAt;
    if (elapsed >= 0 && elapsed < MIN_SUBMIT_MS) {
      return jsonResponse(429, { error: 'Spam protection triggered' }, METHODS);
    }
  }

  const contactEmail = text(input.contactEmail).toLowerCase();
  if (!EMAIL_RE.test(contactEmail) || contactEmail.length > 254) {
    return jsonResponse(400, { error: 'Valid contact email is required' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ip = getClientIp(event) || 'unknown';
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit({
      supabase: admin,
      tableName: 'email_rate_limits',
      identifier: `supplier-application:ip:${ip}`,
      windowMinutes: 30,
      maxAttempts: 5,
    }),
    checkRateLimit({
      supabase: admin,
      tableName: 'email_rate_limits',
      identifier: `supplier-application:email:${contactEmail}`,
      windowMinutes: 60,
      maxAttempts: 3,
    }),
  ]);
  if (byIp.exceeded || byEmail.exceeded) {
    return jsonResponse(429, { error: 'Too many supplier applications. Please try again later.' }, METHODS);
  }

  const captcha = await verifyCaptchaToken({
    token: text(input.captchaToken),
    remoteIp: getClientIp(event),
  });
  if (!captcha.ok) return jsonResponse(400, { error: 'Captcha verification failed' }, METHODS);

  const payload = {
    legalName: text(input.legalName),
    tradingName: text(input.tradingName) || undefined,
    registrationCountry: text(input.registrationCountry).toUpperCase(),
    registrationNumber: text(input.registrationNumber) || undefined,
    vatNumber: text(input.vatNumber) || undefined,
    website: text(input.website) || undefined,
    contactName: text(input.contactName),
    contactEmail,
    contactPhone: text(input.contactPhone) || undefined,
    productCategories: stringArray(input.productCategories, 32),
    warehouseCountries: stringArray(input.warehouseCountries, 16).map((item) => item.toUpperCase()),
    fulfilmentTerritories: stringArray(input.fulfilmentTerritories, 32).map((item) => item.toUpperCase()),
    catalogMethods: stringArray(input.catalogMethods, 8).map((item) => item.toLowerCase()),
    catalogSize: numericValue(input.catalogSize),
    directDispatch: input.directDispatch === true,
    blindShipping: input.blindShipping === true,
    trackingAvailable: input.trackingAvailable === true,
    returnsSupported: input.returnsSupported === true,
    dispatchSlaHours: numericValue(input.dispatchSlaHours),
    stockRefreshMinutes: numericValue(input.stockRefreshMinutes),
    priceRefreshMinutes: numericValue(input.priceRefreshMinutes),
    minimumOrderValue: numericValue(input.minimumOrderValue),
    notes: text(input.notes) || undefined,
  };

  const { data, error } = await admin.rpc('server_submit_supplier_application_v1', {
    p_payload: payload,
  });
  if (error || !isRecord(data) || data.ok !== true) {
    const validation = error?.message && /required|invalid|must|accepted|non-negative|https|too long/i.test(error.message);
    console.error('supplier-application: submit failed:', error?.message || 'invalid RPC response');
    return jsonResponse(validation ? 400 : 500, {
      error: validation ? error?.message : 'Unable to submit supplier application',
    }, METHODS);
  }

  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET } : {}),
  };
  void fetch(`${appUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify({
      to: SUPPORT_EMAIL,
      subject: `Supplier Application: ${payload.legalName || contactEmail}`,
      template: 'contact_enquiry',
      data: {
        name: payload.contactName,
        email: contactEmail,
        subject: 'New Supplier Application',
        message: [
          `Legal name: ${payload.legalName}`,
          `Website: ${payload.website || 'not provided'}`,
          `Categories: ${payload.productCategories.join(', ')}`,
          `Warehouse countries: ${payload.warehouseCountries.join(', ')}`,
          `Catalogue methods: ${payload.catalogMethods.join(', ')}`,
          `Application ID: ${String(data.applicationId || '')}`,
        ].join('\n'),
      },
    }),
  }).catch(() => undefined);

  return jsonResponse(201, {
    ok: true,
    applicationId: data.applicationId,
    status: data.status,
    candidateOnly: true,
    supplierFoundationMutationPerformed: false,
    commerceActivationPerformed: false,
    marketplaceListingPerformed: false,
  }, METHODS);
};
