import sgMail from '@sendgrid/mail';
import type { Handler } from '@netlify/functions';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}') as {
      email?: string;
      businessName?: string;
    };

    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is missing');
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const safeEmail = escapeHtml(data.email);
    const safeBusinessName = escapeHtml(data.businessName);

    const adminTo = process.env.ADMIN_NOTIFICATION_EMAIL;
    if (!adminTo) throw new Error('ADMIN_NOTIFICATION_EMAIL is not configured');

    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    if (!fromEmail) throw new Error('SENDGRID_FROM_EMAIL is not configured');

    const msg = {
      to: adminTo,
      from: fromEmail,
      replyTo: 'support@loadifymarket.co.uk',
      subject: 'New Seller Registered - Loadify Market',
      html: `
        <h2>New Seller Registration</h2>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Business:</strong> ${safeBusinessName}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    await sgMail.send(msg);

    console.log('notify-new-seller: email sent');

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('EMAIL ERROR:', error);
    return { statusCode: 500, body: 'ERROR' };
  }
};
