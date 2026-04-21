import sgMail from '@sendgrid/mail';
import type { Handler } from '@netlify/functions';

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

    const msg = {
      to: 'loadifymarket.co.uk@gmail.com',
      from: 'no-reply@loadifymarket.co.uk',
      subject: 'New Seller Registered - Loadify Market',
      html: `
        <h2>New Seller Registration</h2>
        <p><strong>Email:</strong> ${data.email ?? ''}</p>
        <p><strong>Business:</strong> ${data.businessName ?? ''}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    };

    await sgMail.send(msg);

    console.log('EMAIL SENT:', data);

    return { statusCode: 200, body: 'OK' };
  } catch (error) {
    console.error('EMAIL ERROR:', error);
    return { statusCode: 500, body: 'ERROR' };
  }
};
