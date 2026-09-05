import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('admin onboarding reminder delivery contract', () => {
  it('routes the admin button through the authenticated admin-sellers boundary', () => {
    const ui = read('src/pages/pixel-perfect/admin/AdminApprovals.tsx');
    expect(ui).toContain('handleSendOnboardingReminders');
    expect(ui).toContain('op: "onboarding_reminder"');
    expect(ui).toContain('authorizedFetch("/.netlify/functions/admin-sellers"');
  });

  it('treats non-2xx send-email responses as delivery failures', () => {
    const source = read('netlify/functions/admin-sellers.ts');
    expect(source).toContain('const response = await fetch(`${appUrl}/.netlify/functions/send-email`');
    expect(source).toContain('if (!response.ok)');
    expect(source).toContain('throw new Error(`send-email failed with HTTP ${response.status}`)');
  });

  it('does not report all-failed eligible reminders as no reminders needed', () => {
    const source = read('netlify/functions/admin-sellers.ts');
    expect(source).toContain('const failed = results.length - sent');
    expect(source).toContain('if (failed > 0)');
    expect(source).toContain('statusCode: 502');
    expect(source).toContain('eligible: sellers.length');
  });

  it('uses the internal email gate and only succeeds after SendGrid resolves', () => {
    const email = read('netlify/functions/send-email.ts');
    expect(email).toContain("const internalSecret = process.env.NETLIFY_INTERNAL_SECRET");
    expect(email).toContain("template === 'contact_enquiry'");
    expect(email).toContain('await sgMail.send(msg)');
    expect(email).toContain("message: 'Email sent'");
  });
});
