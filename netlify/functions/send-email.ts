import sgMail from '@sendgrid/mail';
import { Handler } from '@netlify/functions';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

interface EmailRequest {
  to: string;
  subject: string;
  template: 'order_confirmation' | 'order_shipped' | 'order_delivered' | 'return_requested' | 'dispute_opened';
  data: Record<string, unknown>;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body: EmailRequest = JSON.parse(event.body || '{}');
    const { to, subject, template, data } = body;

    const htmlContent = generateEmailHTML(template, data);

    const msg = {
      to,
      from: process.env.VITE_SUPPORT_EMAIL || 'loadifymarket.co.uk@gmail.com',
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
        <p>Danny Courier LTD | 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom</p>
        <p>VAT: GB375949535 | Email: loadifymarket.co.uk@gmail.com</p>
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
        <p>If you have any questions, please contact us at loadifymarket.co.uk@gmail.com</p>
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

    default:
      content = `
        <h2>Email Notification</h2>
        <p>${JSON.stringify(data)}</p>
      `;
  }

  return header + content + footer;
}
