/**
 * emailTemplates.ts
 *
 * Centralised static text for transactional emails sent through SendGrid.
 *
 * IMPORTANT — TRANSACTIONAL ONLY
 * --------------------------------
 * These templates are for transactional messages triggered by user actions
 * (purchases, service completions, disputes, RFQ quotes).
 * They MUST NOT be repurposed for marketing, promotional campaigns, or
 * bulk/newsletter emails. Doing so violates SendGrid's Sender Policy,
 * PECR / GDPR rules, and our platform's deliverability standing.
 *
 * Each export is a function that accepts a minimal data bag and returns
 * { subject, body } — plain text suitable for wrapping in the HTML layout
 * inside send-email.ts. No HTML, no branding logic here.
 */

export interface EmailTemplate {
  subject: string;
  /** Plain-text body. Callers embed this in the HTML wrapper from send-email.ts. */
  body: string;
}

// ── Order Confirmed (Buyer) ────────────────────────────────────────────────

export function orderConfirmedBuyer(data: {
  customerName: string;
  orderNumber: string;
  orderDate: string;
  total: string;
  sellerName?: string;
}): EmailTemplate {
  return {
    subject: `Order Confirmed — #${data.orderNumber}`,
    body: [
      `Hi ${data.customerName},`,
      '',
      `Thank you for your order! Your order #${data.orderNumber} has been confirmed and is being processed.`,
      '',
      `Order date: ${data.orderDate}`,
      `Order total: £${data.total}`,
      ...(data.sellerName ? [`Sold by: ${data.sellerName}`] : []),
      '',
      "We'll send you another email when your order has been shipped.",
      '',
      'If you have any questions, please contact us at support@loadifymarket.co.uk.',
    ].join('\n'),
  };
}

// ── Service Completed — Confirmation Required (Buyer) ─────────────────────

export function serviceCompletedConfirmation(data: {
  customerName: string;
  orderNumber: string;
  serviceName: string;
  sellerName: string;
  confirmUrl: string;
}): EmailTemplate {
  return {
    subject: `Action Required: Confirm Service Completion — #${data.orderNumber}`,
    body: [
      `Hi ${data.customerName},`,
      '',
      `The seller "${data.sellerName}" has marked the service "${data.serviceName}" (order #${data.orderNumber}) as completed.`,
      '',
      'Please log in to your account and confirm that the service has been delivered to your satisfaction.',
      'Once you confirm, the payment will be released to the seller.',
      '',
      `Confirm here: ${data.confirmUrl}`,
      '',
      'If you have any concerns about the service delivered, please open a dispute before confirming.',
      '',
      'Need help? Contact support@loadifymarket.co.uk.',
    ].join('\n'),
  };
}

// ── RFQ Received — New Quote (Seller) ─────────────────────────────────────

export function rfqReceivedSeller(data: {
  sellerName: string;
  rfqId: string;
  buyerName: string;
  itemDescription: string;
  quantity: string;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: `New RFQ Received — #${data.rfqId}`,
    body: [
      `Hi ${data.sellerName},`,
      '',
      `You have received a new Request for Quote (RFQ #${data.rfqId}) from ${data.buyerName}.`,
      '',
      `Item: ${data.itemDescription}`,
      `Quantity requested: ${data.quantity}`,
      '',
      'Please log in to your seller dashboard to review the full request and submit your quote.',
      '',
      `View RFQ: ${data.dashboardUrl}`,
      '',
      'RFQs that are not responded to within 5 business days may be awarded to another seller.',
      '',
      'Questions? Contact support@loadifymarket.co.uk.',
    ].join('\n'),
  };
}

// ── Dispute Opened (Buyer & Seller) ───────────────────────────────────────

export function disputeOpenedBuyer(data: {
  customerName: string;
  orderNumber: string;
  disputeSubject: string;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: `Dispute Opened — Order #${data.orderNumber}`,
    body: [
      `Hi ${data.customerName},`,
      '',
      `A dispute has been opened for order #${data.orderNumber}.`,
      '',
      `Subject: ${data.disputeSubject}`,
      '',
      'Our support team will review this dispute and aim to respond within 2–3 business days.',
      'You can track the status of your dispute in your account dashboard.',
      '',
      `View dispute: ${data.dashboardUrl}`,
      '',
      'Questions? Contact support@loadifymarket.co.uk.',
    ].join('\n'),
  };
}

export function disputeOpenedSeller(data: {
  sellerName: string;
  orderNumber: string;
  disputeSubject: string;
  dashboardUrl: string;
}): EmailTemplate {
  return {
    subject: `Dispute Opened by Buyer — Order #${data.orderNumber}`,
    body: [
      `Hi ${data.sellerName},`,
      '',
      `A buyer has opened a dispute for order #${data.orderNumber}.`,
      '',
      `Subject: ${data.disputeSubject}`,
      '',
      'Please log in to your seller dashboard to view the dispute details and provide any relevant information.',
      'Our support team will mediate and aim to resolve the dispute within 2–3 business days.',
      '',
      `View dispute: ${data.dashboardUrl}`,
      '',
      'Questions? Contact support@loadifymarket.co.uk.',
    ].join('\n'),
  };
}
