/**
 * Mock SendGrid Service for Development
 * Used when real SendGrid credentials are not available
 */

export interface MockEmailData {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

// Store sent emails for testing
const sentEmails: MockEmailData[] = [];

export const createMockSendGridService = () => {
  return {
    send: async (emailData: MockEmailData) => {
      console.log('[MOCK SENDGRID] Sending email', {
        to: emailData.to,
        subject: emailData.subject,
      });
      
      // Store email in mock storage
      sentEmails.push({
        ...emailData,
        from: emailData.from || 'loadifymarket.co.uk@gmail.com',
      });
      
      // Log email content for debugging
      console.log('[MOCK SENDGRID] Email content:', emailData.html.substring(0, 200) + '...');
      
      return {
        statusCode: 202,
        body: {},
        headers: {},
      };
    },
    
    sendMultiple: async (emails: MockEmailData[]) => {
      console.log('[MOCK SENDGRID] Sending multiple emails', emails.length);
      
      for (const email of emails) {
        await createMockSendGridService().send(email);
      }
      
      return {
        statusCode: 202,
        body: {},
        headers: {},
      };
    },
    
    // Helper to get sent emails (for testing)
    getSentEmails: () => {
      return [...sentEmails];
    },
    
    // Helper to clear sent emails (for testing)
    clearSentEmails: () => {
      sentEmails.length = 0;
    },
  };
};

// Email template generators
export const mockEmailTemplates = {
  orderConfirmation: (orderData: { orderNumber: string; total: number }) => {
    return {
      subject: `Order Confirmation - #${orderData.orderNumber}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #243b53; color: white; padding: 20px; text-align: center;">
              <h1>Loadify Market</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Thank you for your order!</h2>
              <p>Order Number: <strong>#${orderData.orderNumber}</strong></p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              <hr>
              <h3>Order Summary</h3>
              <p>Total: £${orderData.total.toFixed(2)}</p>
              <hr>
              <p>We'll send you another email when your order ships.</p>
            </div>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
              <p>Danny Courier LTD | 101 Cornelian Street, Blackburn, BB1 9QL</p>
              <p>VAT: GB375949535</p>
            </div>
          </body>
        </html>
      `,
      text: `Thank you for your order! Order #${orderData.orderNumber}`,
    };
  },
  
  orderShipped: (trackingData: { trackingNumber: string; carrier: string }) => {
    return {
      subject: `Your order has been shipped - Tracking #${trackingData.trackingNumber}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #243b53; color: white; padding: 20px; text-align: center;">
              <h1>Loadify Market</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Your order is on the way!</h2>
              <p>Tracking Number: <strong>${trackingData.trackingNumber}</strong></p>
              <p>Carrier: ${trackingData.carrier}</p>
              <hr>
              <p>You can track your shipment at any time from your order history.</p>
            </div>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
              <p>Danny Courier LTD | 101 Cornelian Street, Blackburn, BB1 9QL</p>
            </div>
          </body>
        </html>
      `,
      text: `Your order has been shipped! Tracking: ${trackingData.trackingNumber}`,
    };
  },
  
  returnRequested: (returnData: { returnNumber: string; reason?: string }) => {
    return {
      subject: `Return Request Received - #${returnData.returnNumber}`,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #243b53; color: white; padding: 20px; text-align: center;">
              <h1>Loadify Market</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Return Request Received</h2>
              <p>Return Number: <strong>#${returnData.returnNumber}</strong></p>
              ${returnData.reason ? `<p>Reason: ${returnData.reason}</p>` : ''}
              <hr>
              <p>We're processing your return request. You'll receive an update within 24 hours.</p>
            </div>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
              <p>Danny Courier LTD | 101 Cornelian Street, Blackburn, BB1 9QL</p>
            </div>
          </body>
        </html>
      `,
      text: `Return request received: #${returnData.returnNumber}`,
    };
  },
};
