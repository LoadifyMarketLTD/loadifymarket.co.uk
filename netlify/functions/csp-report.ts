import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

/**
 * POST /.netlify/functions/csp-report
 *
 * Receives Content-Security-Policy violation reports sent by the browser
 * via the `report-uri` directive in the CSP header.
 *
 * Reports are:
 *  1. Logged to the function console (visible in Netlify function logs).
 *  2. Persisted to the `csp_reports` table when Supabase credentials are
 *     present, enabling long-term trend analysis.
 *
 * Browsers send the report as JSON with Content-Type:
 *   application/csp-report  (legacy)
 *   application/reports+json (Reporting API v1)
 *
 * The endpoint always returns 204 No Content so the browser does not retry.
 */

interface CSPReportBody {
  'csp-report'?: {
    'document-uri'?: string;
    'violated-directive'?: string;
    'blocked-uri'?: string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'status-code'?: number;
  };
}

const supabase =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

export const handler: Handler = async (event) => {
  // Only accept POST; browsers always use POST for CSP reports.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: '' };
  }

  // ── IP-based rate limit: 60 reports per hour per IP ──────────────────────────
  // Prevents an attacker from flooding the csp_reports table or our log budget.
  // If the client IP cannot be determined, skip DB persistence entirely
  // (we still log to console) to avoid grouping all unidentifiable clients
  // into a shared bucket that could block legitimate browsers.
  const ip = getClientIp(event);
  if (supabase && ip) {
    const rl = await checkRateLimit({
      supabase,
      tableName: 'csp_report_rate_limits',
      identifier: ip,
      windowMinutes: 60,
      maxAttempts: 60,
    });
    if (rl.exceeded) {
      // Return 204 so the browser does not keep retrying; we silently drop it.
      return { statusCode: 204, body: '' };
    }
  }

  let report: CSPReportBody = {};
  try {
    report = JSON.parse(event.body || '{}') as CSPReportBody;
  } catch {
    // Malformed body — still return 204 so the browser stops retrying.
    return { statusCode: 204, body: '' };
  }

  const cspReport = report['csp-report'];
  if (cspReport) {
    console.warn('[CSP Violation]', JSON.stringify(cspReport));

    // Persist to database for monitoring (only when IP was identifiable, since
    // the rate-limit guard above is skipped for requests without a known IP).
    if (supabase && ip) {
      const { error: dbError } = await supabase
        .from('csp_reports')
        .insert({
          documentUri: cspReport['document-uri'],
          violatedDirective: cspReport['violated-directive'],
          blockedUri: cspReport['blocked-uri'],
          sourceFile: cspReport['source-file'],
          lineNumber: cspReport['line-number'],
          columnNumber: cspReport['column-number'],
          statusCode: cspReport['status-code'],
          userAgent: event.headers['user-agent'],
          reportedAt: new Date().toISOString(),
        });
      if (dbError && dbError.code !== '42P01') {
        // Log insertion errors (except "table does not exist" which is
        // expected before the migration is applied).
        console.error('[CSP Violation] DB insert failed:', dbError.message);
      }
    }
  }

  // 204 No Content — standard response for CSP report endpoints.
  return { statusCode: 204, body: '' };
};
