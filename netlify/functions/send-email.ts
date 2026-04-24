import sgMail from '@sendgrid/mail';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './_shared/rateLimiter';
import { getClientIp } from './_shared/getClientIp';

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (!sendgridApiKey) {
  console.error('send-email: SENDGRID_API_KEY is not set');
}
sgMail.setApiKey(sendgridApiKey!);

// Templates that public (unauthenticated) users may trigger directly.
// All other templates require the X-Internal-Secret header.
const PUBLIC_TEMPLATES = new Set(['contact_enquiry']);

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
  template: 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'return_requested' | 'dispute_opened' | 'seller_new_order' | 'seller_shipping_reminder' | 'admin_seller_verification' | 'contact_enquiry' | 'admin_new_buyer' | 'admin_new_seller' | 'admin_seller_active' | 'seller_welcome' | 'seller_account_active' | 'buyer_welcome' | 'resend_verification';
  data: Record<string, unknown>;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!sendgridApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Email service not configured' }),
    };
  }

  // ── Internal-secret gate ─────────────────────────────────────────────────
  // Function-to-function calls (stripe-webhook, register, connect-status, etc.)
  // must include the X-Internal-Secret header.  Public callers may only use
  // templates listed in PUBLIC_TEMPLATES (e.g. the contact form).
  let body: EmailRequest;
  try {
    body = JSON.parse(event.body || '{}') as EmailRequest;
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  const { to, subject, template, data } = body;

  const internalSecret = process.env.NETLIFY_INTERNAL_SECRET;
  const providedSecret = event.headers['x-internal-secret'];
  // NETLIFY_DEV is set to 'true' by `netlify dev` when running locally.
  // Only fail-open in that context so developers don't need to configure the
  // secret just to test locally.  In every other environment (staging,
  // production, deploy-preview) the secret MUST be present and correct.
  const isLocalDev = process.env.NETLIFY_DEV === 'true';

  if (!internalSecret || internalSecret.length === 0) {
    if (isLocalDev) {
      console.warn(
        'send-email: NETLIFY_INTERNAL_SECRET is not configured – accepting all ' +
        'server-side calls in local dev. Set this variable before deploying.',
      );
    } else {
      console.error(
        'send-email: NETLIFY_INTERNAL_SECRET is not configured. ' +
        'Add this environment variable in the Netlify dashboard.',
      );
    }
  }

  // A call is considered internal when:
  //   a) running in local dev with no secret configured (dev convenience), OR
  //   b) the caller presents the correct x-internal-secret header value.
  const isInternalCall =
    (isLocalDev && (!internalSecret || internalSecret.length === 0)) ||
    (internalSecret && internalSecret.length > 0 && providedSecret === internalSecret);

  if (!isInternalCall && !PUBLIC_TEMPLATES.has(template)) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Forbidden' }),
    };
  }
  // ─────────────────────────────────────────────────────────────────────────

  // ── Rate limiting: 20 emails per IP per 15 minutes ───────────────────────
  if (supabase) {
    const ip = getClientIp(event);

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
    const htmlContent = generateEmailHTML(template, data);

    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || 'loadifymarket.co.uk@gmail.com',
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

/** Escape a string for safe embedding in HTML to prevent HTML injection. */
function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
        <p>Hi ${escapeHtml(data.customerName || 'Customer')},</p>
        <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${escapeHtml(data.orderNumber || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Order Date:</strong> ${escapeHtml(data.orderDate || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Total:</strong> £${typeof data.total === 'number' ? data.total.toFixed(2) : '0.00'}</p>
        </div>
        <h3 style="color: #243b53;">Order Items:</h3>
        ${Array.isArray(data.items) ? data.items.map((item: Record<string, unknown>) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0;"><strong>${escapeHtml(item.title || '')}</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">Quantity: ${escapeHtml(item.quantity || 0)} | Price: £${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</p>
          </div>
        `).join('') : ''}
        <p style="margin-top: 20px;">We'll send you another email when your order has been shipped.</p>
        <p>If you have any questions, please contact us at support@loadifymarket.co.uk</p>
      `;
      break;

    case 'order_shipped':
      content = `
        <h2 style="color: #243b53;">Your Order Has Been Shipped!</h2>
        <p>Hi ${escapeHtml(data.customerName)},</p>
        <p>Great news! Your order #${escapeHtml(data.orderNumber)} has been shipped.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Tracking Number:</strong> ${escapeHtml(data.trackingNumber || 'Not available')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Carrier:</strong> ${escapeHtml(data.carrier || 'Standard Delivery')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Estimated Delivery:</strong> ${escapeHtml(data.estimatedDelivery || '3-5 business days')}</p>
        </div>
        <p>You can track your order on our website using your order number.</p>
        <a href="${process.env.URL}/tracking/${escapeHtml(data.orderNumber)}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Track Order</a>
      `;
      break;

    case 'order_delivered':
      content = `
        <h2 style="color: #243b53;">Order Delivered!</h2>
        <p>Hi ${escapeHtml(data.customerName)},</p>
        <p>Your order #${escapeHtml(data.orderNumber)} has been delivered.</p>
        <p>We hope you're satisfied with your purchase. If you have any issues, please don't hesitate to contact us.</p>
        <p style="margin-top: 20px;">Would you like to leave a review?</p>
        <a href="${process.env.URL}/orders/${escapeHtml(data.orderId)}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Order &amp; Review</a>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">Remember: You have 14 days from delivery to request a return if needed.</p>
      `;
      break;

    case 'return_requested':
      content = `
        <h2 style="color: #243b53;">Return Request Received</h2>
        <p>Hi ${escapeHtml(data.customerName)},</p>
        <p>We've received your return request for order #${escapeHtml(data.orderNumber)}.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Reason:</strong> ${escapeHtml(data.reason)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Under Review</p>
        </div>
        <p>The seller will review your request and respond within 2 business days.</p>
        <p>You can track the status of your return in your account dashboard.</p>
      `;
      break;

    case 'dispute_opened':
      content = `
        <h2 style="color: #243b53;">Dispute Opened</h2>
        <p>Hi ${escapeHtml(data.customerName)},</p>
        <p>A dispute has been opened for order #${escapeHtml(data.orderNumber)}.</p>
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #ffc107;">
          <p style="margin: 0;"><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
          <p style="margin: 10px 0 0 0;"><strong>Status:</strong> Open</p>
        </div>
        <p>Our team will review this dispute and work to resolve it as quickly as possible.</p>
        <p>Expected response time: 2-3 business days.</p>
      `;
      break;

    case 'seller_new_order':
      content = `
        <h2 style="color: #243b53;">New Order Received</h2>
        <p>You have a new order on Loadify Market!</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Order Number:</strong> ${escapeHtml(data.orderNumber || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Order Date:</strong> ${escapeHtml(data.orderDate || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Order Total:</strong> £${typeof data.sellerTotal === 'number' ? data.sellerTotal.toFixed(2) : '0.00'}</p>
        </div>
        <h3 style="color: #243b53;">Items Ordered:</h3>
        ${Array.isArray(data.items) ? data.items.map((item: Record<string, unknown>) => `
          <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
            <p style="margin: 0;"><strong>${escapeHtml(item.title || '')}</strong></p>
            <p style="margin: 5px 0 0 0; color: #666;">Quantity: ${escapeHtml(item.quantity || 0)} | Price: £${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}</p>
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
          <p style="margin: 0;"><strong>Order Number:</strong> ${escapeHtml(data.orderNumber || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Ordered On:</strong> ${escapeHtml(data.orderDate || '')}</p>
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
          <p style="margin: 0;"><strong>Name:</strong> ${escapeHtml(data.name || '')}</p>
          <p style="margin: 8px 0 0 0;"><strong>Email:</strong> ${escapeHtml(data.email || '')}</p>
          ${data.subject ? `<p style="margin: 8px 0 0 0;"><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>` : ''}
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Message:</strong></p>
          <p style="margin: 8px 0 0 0; white-space: pre-wrap;">${escapeHtml(data.message || '')}</p>
        </div>
        <p style="color: #888; font-size: 12px;">Submitted at: ${new Date().toLocaleString('en-GB')}</p>
      `;
      break;

    case 'admin_seller_verification':
      content = `
        <h2 style="color: #243b53;">New Seller Verification Request</h2>
        <p>A seller has submitted a verification request and requires review.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Seller:</strong> ${escapeHtml(data.sellerName || 'Unknown')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Email:</strong> ${escapeHtml(data.sellerEmail || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Business:</strong> ${escapeHtml(data.businessName || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Submitted:</strong> ${escapeHtml(data.submittedAt || new Date().toLocaleDateString('en-GB'))}</p>
        </div>
        <p>Please log in to the admin dashboard to review the submitted documents and approve or reject the verification.</p>
        <a href="${process.env.URL}/admin/approvals" style="display: inline-block; background-color: #243b53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Review Verification</a>
      `;
      break;

    case 'admin_new_buyer':
      content = `
        <h2 style="color: #243b53;">New Buyer Registration</h2>
        <p>A new buyer account has been created on Loadify Market.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Registered:</strong> ${escapeHtml(data.registeredAt || new Date().toLocaleString('en-GB'))}</p>
        </div>
        <p>No action required. The buyer has direct access to the platform.</p>
        <a href="${process.env.URL}/admin/users" style="display: inline-block; background-color: #243b53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Users</a>
      `;
      break;

    case 'admin_new_seller':
      content = `
        <h2 style="color: #243b53;">New Seller Registration</h2>
        <p>A new seller account has been created on Loadify Market and is setting up their store.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Email:</strong> ${escapeHtml(data.sellerEmail || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Name:</strong> ${escapeHtml(data.sellerName || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Store:</strong> ${escapeHtml(data.storeName || '')}</p>
          <p style="margin: 10px 0 0 0;"><strong>Registered:</strong> ${escapeHtml(data.registeredAt || new Date().toLocaleString('en-GB'))}</p>
        </div>
        <p>The seller must complete their profile and connect a Stripe account before their store is active. No manual approval is required.</p>
        <a href="${process.env.URL}/admin/approvals" style="display: inline-block; background-color: #243b53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Sellers</a>
      `;
      break;

    case 'admin_seller_active':
      content = `
        <h2 style="color: #243b53;">Seller Account Now Active</h2>
        <p>A seller account has met all setup requirements and is now active on Loadify Market.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Activated:</strong> ${escapeHtml(data.activatedAt || new Date().toLocaleString('en-GB'))}</p>
        </div>
        <p>The seller's account was activated automatically after their profile and Stripe setup were complete.</p>
        <a href="${process.env.URL}/admin/approvals" style="display: inline-block; background-color: #243b53; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">View Sellers</a>
      `;
      break;

    case 'seller_welcome':
      content = `
        <h2 style="color: #243b53;">Welcome to Loadify Market</h2>
        <p>Hi ${escapeHtml(data.sellerName || 'there')},</p>
        <p>Your seller account has been created successfully. To start selling on Loadify Market you need to complete two quick steps:</p>
        <ol style="line-height: 1.8;">
          <li><strong>Complete your profile</strong> — add your business name, contact phone number, and business address.</li>
          <li><strong>Connect your Stripe account</strong> — this is required to receive payouts for your sales.</li>
        </ol>
        <p>Once both steps are done your store will go live automatically — no manual approval needed.</p>
        <a href="${(process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '')}/seller/setup" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Complete Your Setup</a>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">If you have any questions please contact us at support@loadifymarket.co.uk</p>
      `;
      break;

    case 'seller_account_active':
      content = `
        <h2 style="color: #243b53;">Your Store Is Now Live!</h2>
        <p>Hi ${escapeHtml(data.sellerName || 'there')},</p>
        <p>Great news — your Loadify Market seller account is now active. Your profile is complete and your Stripe account is connected and ready to accept payments.</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <p style="margin: 0;"><strong>Activated:</strong> ${escapeHtml(data.activatedAt || new Date().toLocaleString('en-GB'))}</p>
        </div>
        <p>You can now list products and start receiving orders. Head to your seller dashboard to get started.</p>
        <a href="${(process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '')}/seller" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Go to Seller Dashboard</a>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">If you have any questions please contact us at support@loadifymarket.co.uk</p>
      `;
      break;

    case 'buyer_welcome':
      content = `
        <h2 style="color: #243b53;">Welcome to Loadify Market</h2>
        <p>Hi ${escapeHtml((data.buyerName as string) || 'there')},</p>
        <p>Your Loadify Market account has been created successfully. You can now browse products, place orders, and track your deliveries.</p>
        <a href="${(process.env.URL || process.env.VITE_APP_URL || 'https://loadifymarket.co.uk').replace(/\/$/, '')}/catalog" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Start Shopping</a>
        <p style="margin-top: 20px; color: #888; font-size: 13px;">If you have any questions please contact us at support@loadifymarket.co.uk</p>
      `;
      break;

    case 'resend_verification':
      content = `
        <h2 style="color: #243b53;">Sign in to Loadify Market</h2>
        <p>Hi ${escapeHtml((data.userName as string) || 'there')},</p>
        <p>An administrator has requested that a sign-in link be sent to your account. Click the button below to access your dashboard.</p>
        <a href="${escapeHtml((data.actionLink as string) || '#')}" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0;">Access My Account</a>
        <p style="color: #555; font-size: 14px;">This link is valid for 24 hours and can only be used once. If you did not expect this email, please ignore it or contact us at <a href="mailto:support@loadifymarket.co.uk" style="color: #f59e0b;">support@loadifymarket.co.uk</a>.</p>
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
