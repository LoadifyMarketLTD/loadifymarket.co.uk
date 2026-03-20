import sgMail from '@sendgrid/mail';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const supabase =
  process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      )
    : null;

interface EmailRequest {
  to: string;
  subject: string;
  template: 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'return_requested' | 'dispute_opened' | 'transport_quote_request' | 'seller_new_order' | 'seller_shipping_reminder' | 'admin_seller_verification' | 'contact_enquiry';
  data: Record<string, unknown>;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // ── Rate limiting: 20 emails per IP per 15 minutes ───────────────────────
  if (supabase) {
    const ip =
      event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      event.headers['client-ip'];

    if (ip) {
      const rl = await checkRateLimit({
        supabase,
        tableName: 'email_rate_limits',
        identifier: ip,
        windowMinutes: 15,
        maxAttempts: 20,
      });
      if (rl.exceeded) {
        return {
          statusCode: 429,
          body: JSON.stringify({ error: 'Too many email requests. Please try again later.' }),
        };
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const body: EmailRequest = JSON.parse(event.body || '{}');
    const { to, subject, template, data } = body;

    const htmlContent = generateEmailHTML(template, data);

    const msg = {
      to,
      from: process.env.VITE_SUPPORT_EMAIL || 'support@loadifymarket.co.uk',
      subject,
      html: htmlContent,
    };

    await sgMail.send(msg);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Email sent' }),
    };
  } catch (error) {
    console.error('Email sending error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to send email',
      }),
    };
  }
};

function generateEmailHTML(template: string, data: Record<string, unknown>): string {
  const header = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #243b53; padding: 20px; text-align: center;">
        <h1 style="color: #f59e0b; margin: 0;">Loadify Market</h1>
      </div>
      <div style="background-color: white; padding: 30px; margin-top: 20px;">
  `;

  const footer = `
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>Loadify Market - B2B &amp; B2C Marketplace</p>
        <p>XDrive Logistics Ltd | 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</p>
        <p>VAT: GB375949535 | Email: support@loadifymarket.co.uk</p>
      </div>
    </div>
  `;

  let content = '';

  switch (template) {
    case 'order_confirmation':
      content = `
        <h2 style="color: #243b53;">Order Confirmation</h2>
        <p>Hi ${String(data.customerName || 'Customer')},</p>
        <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${String(data.orderNumber || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Order Date:</strong> ${String(data.orderDate || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Total:</strong> £${typeof data.total === 'number' ? data.total.toFixed(2) : '0.00'}</p>
        </div>
        <h3 style="color: #243b53;">Order Items:</h3>
        ${Array.isArray(data.items) ? data.items.map((item: Record<string, unknown>) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0;"><strong>${String(item.title || '')}</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">Quantity: ${String(item.quantity || 0)} | Price: £${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</p>
          </div>
        `).join('') : ''}
        <p style="margin-top: 20px;">We'll send you another email when your order has been shipped.</p>
        <p>If you have any questions, please contact us at support@loadifymarket.co.uk</p>
      `;
      break;

    case 'order_shipped':
      content = `
        <h2 style="color: #243b53;">Your Order Has Been Shipped!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Great news! Your order #${data.orderNumber} has been shipped.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Tracking Number:</strong> ${data.trackingNumber || 'Not available'}</p>
          <p style="margin: 10px 0 0 0;"><strong>Carrier:</strong> ${data.carrier || 'Standard Delivery'}</p>
          <p style="margin: 10px 0 0 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery || '3-5 business days'}</p>
        </div>
        <p>You can track your order on our website using your order number.</p>
        <a href="${process.env.URL}/tracking/${data.orderNumber}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Track Order</a>
      `;
      break;

    case 'order_delivered':
      content = `
        <h2 style="color: #243b53;">Order Delivered!</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your order #${data.orderNumber} has been delivered.</p>
        <p>We hope you're satisfied with your purchase. If you have any issues, please don't hesitate to contact us.</p>
        <p style="margin-top: 20px;">Would you like to leave a review?</p>
        <a href="${process.env.URL}/orders/${data.orderId}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Order &amp; Review</a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">Remember: You have 14 days from delivery to request a return if needed.</p>
      `;
      break;

    case 'return_requested':
      content = `
        <h2 style="color: #243b53;">Return Request Received</h2>
        <p>Hi ${data.customerName},</p>
        <p>We've received your return request for order #${data.orderNumber}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Reason:</strong> ${data.reason}</p>
          <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Under Review</p>
        </div>
        <p>The seller will review your request and respond within 2 business days.</p>
        <p>You can track the status of your return in your account dashboard.</p>
      `;
      break;

    case 'dispute_opened':
      content = `
        <h2 style="color: #243b53;">Dispute Opened</h2>
        <p>Hi ${data.customerName},</p>
        <p>A dispute has been opened for order #${data.orderNumber}.</p>
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>Subject:</strong> ${data.subject}</p>
          <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Open</p>
        </div>
        <p>Our team will review this dispute and work to resolve it as quickly as possible.</p>
        <p>Expected response time: 2-3 business days.</p>
      `;
      break;

    case 'transport_quote_request':
      content = `
        <h2 style="color: #243b53;">New Transport Quote Request</h2>
        <p>A new delivery request has been submitted from <strong>Loadify Market</strong>.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Reference:</strong> ${String(data.requestId || '')}</p>
          <p style="margin: 8px 0 0 0;"><strong>Contact:</strong> ${String(data.fullName || '')} — ${String(data.email || '')} — ${String(data.phone || '')}</p>
          ${data.companyName ? `<p style="margin: 8px 0 0 0;"><strong>Company:</strong> ${String(data.companyName)}</p>` : ''}
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Item:</strong> ${String(data.itemType || '')}</p>
          ${data.listingTitle ? `<p style="margin: 8px 0 0 0;"><strong>Listing:</strong> ${String(data.listingTitle)} (ID: ${String(data.listingId || '')})</p>` : ''}
          ${data.sellerName ? `<p style="margin: 8px 0 0 0;"><strong>Seller:</strong> ${String(data.sellerName)} (ID: ${String(data.sellerId || '')})</p>` : ''}
          <p style="margin: 8px 0 0 0;"><strong>Pallets / Items:</strong> ${String(data.palletCount || '')}</p>
          ${data.weight ? `<p style="margin: 8px 0 0 0;"><strong>Weight:</strong> ${String(data.weight)}</p>` : ''}
          ${data.dimensions ? `<p style="margin: 8px 0 0 0;"><strong>Dimensions:</strong> ${String(data.dimensions)}</p>` : ''}
          ${data.quantity ? `<p style="margin: 8px 0 0 0;"><strong>Quantity:</strong> ${String(data.quantity)}</p>` : ''}
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Pickup Postcode:</strong> ${String(data.pickupPostcode || '')}</p>
          <p style="margin: 8px 0 0 0;"><strong>Dropoff Postcode:</strong> ${String(data.dropoffPostcode || '')}</p>
          <p style="margin: 8px 0 0 0;"><strong>Collection Date:</strong> ${String(data.collectionDate || '')}</p>
        </div>
        ${data.deliveryNotes ? `<p><strong>Delivery Notes:</strong> ${String(data.deliveryNotes)}</p>` : ''}
        ${data.listingReference ? `<p><strong>Listing Reference:</strong> ${String(data.listingReference)}</p>` : ''}
        <p style="color: #888; font-size: 12px;">Source: ${String(data.source || 'loadify-market')}</p>
      `;
      break;

    case 'seller_new_order':
      content = `
        <h2 style="color: #243b53;">New Order Received</h2>
        <p>You have a new order on Loadify Market!</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${String(data.orderNumber || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Order Date:</strong> ${String(data.orderDate || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Order Total:</strong> £${typeof data.sellerTotal === 'number' ? data.sellerTotal.toFixed(2) : '0.00'}</p>
        </div>
        <h3 style="color: #243b53;">Items Ordered:</h3>
        ${Array.isArray(data.items) ? data.items.map((item: Record<string, unknown>) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0;"><strong>${String(item.title || '')}</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">Quantity: ${String(item.quantity || 0)} | Price: £${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</p>
          </div>
        `).join('') : ''}
        <p style="margin-top: 20px;">Please process this order promptly. Log in to your seller dashboard to view full order details and arrange shipping.</p>
        <a href="${process.env.URL}/seller" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Seller Dashboard</a>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">Reminder: Please ship within your stated dispatch time to maintain your seller rating.</p>
      `;
      break;

    case 'seller_shipping_reminder':
      content = `
        <h2 style="color: #243b53;">Shipping Reminder</h2>
        <p>You have an order that is awaiting shipment.</p>
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${String(data.orderNumber || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Ordered On:</strong> ${String(data.orderDate || '')}</p>
        </div>
        <p>Please arrange shipment as soon as possible to keep your seller rating high and your customers happy.</p>
        <a href="${process.env.URL}/seller" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Ship Now</a>
      `;
      break;

    case 'contact_enquiry':
      content = `
        <h2 style="color: #243b53;">New Contact Form Submission</h2>
        <p>A visitor has submitted a message via the Loadify Market contact form.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Name:</strong> ${String(data.name || '')}</p>
          <p style="margin: 8px 0 0 0;"><strong>Email:</strong> ${String(data.email || '')}</p>
          ${data.subject ? `<p style="margin: 8px 0 0 0;"><strong>Subject:</strong> ${String(data.subject)}</p>` : ''}
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Message:</strong></p>
          <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${String(data.message || '')}</p>
        </div>
        <p style="color: #888; font-size: 12px;">Submitted at: ${new Date().toLocaleString('en-GB')}</p>
      `;
      break;

    case 'admin_seller_verification':
      content = `
        <h2 style="color: #243b53;">New Seller Verification Request</h2>
        <p>A seller has submitted a verification request and requires review.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Seller:</strong> ${String(data.sellerName || 'Unknown')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Email:</strong> ${String(data.sellerEmail || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Business:</strong> ${String(data.businessName || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Submitted:</strong> ${String(data.submittedAt || new Date().toLocaleDateString('en-GB'))}</p>
        </div>
        <p>Please log in to the admin dashboard to review the submitted documents and approve or reject the verification.</p>
        <a href="${process.env.URL}/admin/sellers" style="display: inline-block; background-color: #243b53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Review Verification</a>
      `;
      break;

    default:
      content = `
        <h2>Email Notification</h2>
        <p>${JSON.stringify(data)}</p>
      `;
  }

  return header + content + footer;
}
