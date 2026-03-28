import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getClientIp } from './_shared/getClientIp';

/**
 * POST /.netlify/functions/error-report
 *
 * Receives JavaScript error reports from the client-side errorTracking module.
 * Reports are logged to the function console and persisted to the
 * `error_reports` table when Supabase credentials are available.
 *
 * The endpoint enforces a simple IP-based rate limit (60 reports per hour)
 * to prevent abuse and log flooding.
 *
 * Always returns 204 No Content so the client does not retry unnecessarily.
 */

interface ErrorReport {
  message?: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  context?: string;
}

const MAX_REPORTS_PER_HOUR = 60;

const supabase =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '' };
  }

  let report: ErrorReport = {};
  try {
    report = JSON.parse(event.body || '{}') as ErrorReport;
  } catch {
    return { statusCode: 204, body: '' };
  }

  // Basic sanity check — ignore empty or obviously-invalid reports.
  if (!report.message) {
    return { statusCode: 204, body: '' };
  }

  const ip = getClientIp(event) ?? 'unknown';

  // ── IP-based rate limiting ────────────────────────────────────────────────
  if (supabase) {
    const windowEnd = new Date(
      Math.ceil(Date.now() / (60 * 60 * 1000)) * (60 * 60 * 1000),
    ).toISOString();

    const { data: rl } = await supabase
      .from('error_report_rate_limits')
      .select('id, attempts')
      .eq('identifier', ip)
      .eq('windowEnd', windowEnd)
      .maybeSingle<{ id: string; attempts: number }>();

    if (rl && rl.attempts >= MAX_REPORTS_PER_HOUR) {
      return { statusCode: 204, body: '' };
    }

    if (rl) {
      await supabase
        .from('error_report_rate_limits')
        .update({ attempts: rl.attempts + 1 })
        .eq('id', rl.id);
    } else {
      await supabase
        .from('error_report_rate_limits')
        .insert({ identifier: ip, windowEnd, attempts: 1 });
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  console.error('[ErrorReport]', {
    message: report.message,
    url: report.url,
    context: report.context,
    timestamp: report.timestamp,
    ip,
  });

  if (supabase) {
    const { error: insertError } = await supabase
      .from('error_reports')
      .insert({
        message: String(report.message ?? '').slice(0, 500),
        url: String(report.url ?? '').slice(0, 500),
        userAgent: String(report.userAgent ?? '').slice(0, 300),
        context: String(report.context ?? '').slice(0, 100),
        timestamp: report.timestamp ?? new Date().toISOString(),
        ip,
      });
    if (insertError && insertError.code !== '42P01') {
      console.error('[ErrorReport] DB insert failed:', insertError.message);
    }
  }

  return { statusCode: 204, body: '' };
};
