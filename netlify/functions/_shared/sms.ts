/**
 * sms.ts
 *
 * SMS sending stub for Loadify Market.
 *
 * No SMS provider (Twilio, AWS SNS, etc.) is currently integrated.
 * This function logs the intended message so that:
 *   1. SMS flows can be wired in without changing call sites.
 *   2. Development and staging environments never send real SMS.
 *   3. There are zero external API calls and zero costs.
 *
 * To enable real SMS delivery in the future:
 *   - Add the provider's SDK / API call inside this function.
 *   - Gate it behind a feature flag or an env var (e.g. SMS_ENABLED=true).
 *   - Add the provider's API key to Netlify environment variables.
 *   - Do NOT change the function signature — all call sites will work as-is.
 */

/**
 * Send an SMS message to a phone number.
 *
 * Currently a no-op stub: logs the intended message and returns immediately.
 *
 * @param phone   Recipient phone number in E.164 format (e.g. +441234567890).
 * @param message Plain-text message body (keep ≤ 160 chars where possible).
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  // SMS provider not yet configured — log for visibility, do not call any API.
  console.log(`[SMS disabled] To: ${phone} | Message: ${message}`);
}
