import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';
import { verifyCaptchaToken } from './_shared/verifyCaptcha';
import { getBearerToken, jsonResponse, optionsResponse } from './_shared/http';

const METHODS = 'POST, OPTIONS';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CONTACT_SUBMIT_MS = 1_500;
const SUPPORT_EMAIL = (process.env.SUPPORT_INBOX_EMAIL || 'contact@loadifymarket.co.uk').trim().toLowerCase();

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  captchaToken?: unknown;
  submittedAt?: unknown;
  honeypot?: unknown;
  botField?: unknown;
  ['bot-field']?: unknown;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return optionsResponse(METHODS);
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, METHODS);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Server configuration error' }, METHODS);
  }

  let payloadRaw: unknown;
  try {
    payloadRaw = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS);
  }

  if (!isPlainObject(payloadRaw)) {
    return jsonResponse(400, { error: 'Invalid payload' }, METHODS);
  }
  const payload = payloadRaw as ContactPayload;

  const honeypot = asTrimmed(payload.honeypot || payload.botField || payload['bot-field']);
  if (honeypot) {
    // Return success for bots to avoid signal leaks.
    return jsonResponse(201, { ok: true }, METHODS);
  }

  if (typeof payload.submittedAt === 'number') {
    const elapsed = Date.now() - payload.submittedAt;
    if (elapsed >= 0 && elapsed < MIN_CONTACT_SUBMIT_MS) {
      return jsonResponse(429, { error: 'Spam protection triggered' }, METHODS);
    }
  }

  const name = asTrimmed(payload.name);
  const email = asTrimmed(payload.email).toLowerCase();
  const subject = asTrimmed(payload.subject) || 'Contact Form Enquiry';
  const message = asTrimmed(payload.message);

  if (!name || name.length < 2 || name.length > 120) {
    return jsonResponse(400, { error: 'Invalid name' }, METHODS);
  }
  if (!isValidEmail(email)) {
    return jsonResponse(400, { error: 'Invalid email' }, METHODS);
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return jsonResponse(400, { error: 'Invalid message length' }, METHODS);
  }
  if (subject.length > 200) {
    return jsonResponse(400, { error: 'Invalid subject length' }, METHODS);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ip = getClientIp(event) || 'unknown';
  const byIp = await checkRateLimit({
    supabase: admin,
    tableName: 'email_rate_limits',
    identifier: `support:ip:${ip}`,
    windowMinutes: 15,
    maxAttempts: 5,
  });
  if (byIp.exceeded) {
    return jsonResponse(429, { error: 'Too many requests from your network. Please try again later.' }, METHODS);
  }

  const byEmail = await checkRateLimit({
    supabase: admin,
    tableName: 'email_rate_limits',
    identifier: `support:email:${email}`,
    windowMinutes: 15,
    maxAttempts: 3,
  });
  if (byEmail.exceeded) {
    return jsonResponse(429, { error: 'Too many requests from this email. Please try again later.' }, METHODS);
  }

  const captcha = await verifyCaptchaToken({
    token: asTrimmed(payload.captchaToken),
    remoteIp: getClientIp(event),
  });
  if (!captcha.ok) {
    return jsonResponse(400, { error: 'Captcha verification failed' }, METHODS);
  }

  // Optional authenticated context: if a valid bearer token is present, attach userId.
  let userId: string | null = null;
  const token = getBearerToken(event);
  if (token) {
    const { data } = await admin.auth.getUser(token);
    if (data?.user?.id) userId = data.user.id;
  }

  const insertPayload = {
    userId,
    guestEmail: userId ? null : email,
    guestName: userId ? null : name,
    subject,
    message,
    category: 'general',
    priority: 'normal',
    status: 'open',
  };

  const { data: created, error } = await admin
    .from('support_tickets')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    return jsonResponse(500, { error: 'Failed to create support ticket' }, METHODS);
  }

  // Best-effort email notification to support inbox.
  const appUrl = (process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '');
  const internalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(process.env.NETLIFY_INTERNAL_SECRET
      ? { 'x-internal-secret': process.env.NETLIFY_INTERNAL_SECRET }
      : {}),
  };
  void fetch(`${appUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: internalHeaders,
    body: JSON.stringify({
      to: SUPPORT_EMAIL,
      subject: `Contact Form: ${subject}`,
      template: 'contact_enquiry',
      data: { name, email, subject, message },
    }),
  });

  return jsonResponse(201, { ok: true, ticketId: created?.id ?? null }, METHODS);
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asTrimmed(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254;
}
