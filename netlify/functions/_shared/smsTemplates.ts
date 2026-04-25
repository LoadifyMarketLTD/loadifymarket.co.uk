/**
 * smsTemplates.ts
 *
 * Static SMS message templates for future integration with an SMS provider
 * (e.g. Twilio, AWS SNS). No provider is currently configured.
 *
 * All functions return a plain string ≤ 160 characters where possible.
 * Variables in braces denote substitution points.
 *
 * IMPORTANT — TRANSACTIONAL ONLY
 * --------------------------------
 * These templates are for transactional notifications triggered by user
 * actions. They MUST NOT be used for marketing or promotional SMS.
 */

// ── Order Confirmed ────────────────────────────────────────────────────────

export function smsOrderConfirmed(orderNumber: string): string {
  return `Loadify Market: Your order #${orderNumber} is confirmed. We'll notify you when it ships. Help: support@loadifymarket.co.uk`;
}

// ── Service Completed — Confirmation Needed ───────────────────────────────

export function smsServiceCompletedConfirmation(orderNumber: string, confirmUrl: string): string {
  return `Loadify Market: Service for order #${orderNumber} is marked complete. Please confirm: ${confirmUrl}`;
}

// ── RFQ — New Quote Received ───────────────────────────────────────────────

export function smsRfqNewQuote(rfqId: string, dashboardUrl: string): string {
  return `Loadify Market: You have a new quote for RFQ #${rfqId}. View it: ${dashboardUrl}`;
}

// ── Dispute Opened ─────────────────────────────────────────────────────────

export function smsDisputeOpened(orderNumber: string, dashboardUrl: string): string {
  return `Loadify Market: A dispute has been opened for order #${orderNumber}. View details: ${dashboardUrl}`;
}
