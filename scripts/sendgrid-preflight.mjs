import { mkdirSync, writeFileSync } from 'node:fs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const diagnosticContext = 'sendgrid-sandbox-preflight-20260905';

let cleaned = false;

if (supabaseUrl && serviceRoleKey) {
  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/error_reports?context=eq.${encodeURIComponent(diagnosticContext)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Prefer: 'return=minimal',
        },
      },
    );
    cleaned = response.ok;
    if (!response.ok) {
      console.warn(`SendGrid diagnostic cleanup failed with HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('SendGrid diagnostic cleanup failed:', error instanceof Error ? error.message : 'unknown error');
  }
}

mkdirSync('public', { recursive: true });
writeFileSync(
  'public/sendgrid-preflight.json',
  `${JSON.stringify({ diagnosticClosed: true, cleaned }, null, 2)}\n`,
  'utf8',
);
console.log(`SendGrid diagnostic cleanup: cleaned=${cleaned}`);
