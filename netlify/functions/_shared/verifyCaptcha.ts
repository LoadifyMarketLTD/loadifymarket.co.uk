interface VerifyCaptchaInput {
  token?: string;
  remoteIp?: string;
}

interface VerifyCaptchaResult {
  ok: boolean;
  skipped?: boolean;
}

/**
 * Verify Cloudflare Turnstile (or compatible) captcha token.
 *
 * If no secret is configured, verification is skipped (fail-open) so environments
 * without captcha setup can continue functioning while still using other anti-spam
 * layers (honeypot + rate limits + strict validation).
 */
export async function verifyCaptchaToken(input: VerifyCaptchaInput): Promise<VerifyCaptchaResult> {
  const secret =
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.CAPTCHA_SECRET_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { ok: true, skipped: true };
  }

  const token = input.token?.trim();
  if (!token) {
    return { ok: false };
  }

  try {
    const params = new URLSearchParams();
    params.set('secret', secret);
    params.set('response', token);
    if (input.remoteIp) params.set('remoteip', input.remoteIp);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) return { ok: false };

    const json = (await res.json()) as { success?: boolean };
    return { ok: json.success === true };
  } catch {
    return { ok: false };
  }
}
