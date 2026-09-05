import { mkdirSync, writeFileSync } from 'node:fs';

const apiKey = process.env.SENDGRID_API_KEY || '';
const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';
const diagnosticRecipient = process.env.VITE_SUPPORT_EMAIL || 'loadifymarket.co.uk@gmail.com';

const output = {
  generatedAt: new Date().toISOString(),
  sandboxMode: true,
  deliveredEmail: false,
  apiKeyConfigured: Boolean(apiKey),
  fromConfigured: Boolean(fromEmail),
  configuredFromDomain: fromEmail.includes('@') ? fromEmail.split('@').pop() : null,
  status: null,
  ok: false,
  providerError: null,
};

if (!apiKey || !fromEmail) {
  output.providerError = !apiKey ? 'SENDGRID_API_KEY is not configured' : 'SENDGRID_FROM_EMAIL is not configured';
} else {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: diagnosticRecipient }] }],
        from: { email: fromEmail, name: 'Loadify Market' },
        subject: 'Loadify Market SendGrid sandbox preflight',
        content: [{ type: 'text/plain', value: 'Sandbox validation only. No email is delivered.' }],
        mail_settings: { sandbox_mode: { enable: true } },
      }),
    });

    output.status = response.status;
    output.ok = response.ok;

    if (!response.ok) {
      const text = await response.text();
      try {
        const body = JSON.parse(text);
        const messages = Array.isArray(body?.errors)
          ? body.errors.map((error) => String(error?.message || '')).filter(Boolean)
          : [];
        output.providerError = messages.join(' | ') || `SendGrid HTTP ${response.status}`;
      } catch {
        output.providerError = `SendGrid HTTP ${response.status}`;
      }
    }
  } catch (error) {
    output.providerError = error instanceof Error ? error.message : 'SendGrid preflight request failed';
  }
}

mkdirSync('public', { recursive: true });
writeFileSync('public/sendgrid-preflight.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`SendGrid sandbox preflight: status=${output.status ?? 'n/a'} ok=${output.ok}`);
