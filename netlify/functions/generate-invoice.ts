import { Handler } from '@netlify/functions';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface InvoiceRequest {
  orderId: string;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body: InvoiceRequest = JSON.parse(event.body || '{}');
    const { orderId } = body;

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found');
    }

    // Fetch buyer and seller details
    const { data: buyer } = await supabase
      .from('users')
      .select('*, buyer_profiles(*)')
      .eq('id', order.buyerId)
      .single();

    const { data: seller } = await supabase
      .from('users')
      .select('*, seller_profiles(*)')
      .eq('id', order.sellerId)
      .single();

    // Generate PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Header
    pdf.setFontSize(24);
    pdf.setTextColor(36, 59, 83); // Navy
    pdf.text('Loadify Market', 20, 20);

    pdf.setFontSize(10);
    pdf.setTextColor(100);
    pdf.text('Danny Courier LTD', 20, 28);
    pdf.text('101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom', 20, 33);
    pdf.text('VAT: GB375949535', 20, 38);
    pdf.text('Email: loadifymarket.co.uk@gmail.com', 20, 43);

    // Invoice title
    pdf.setFontSize(18);
    pdf.setTextColor(0);
    pdf.text('INVOICE', pageWidth - 60, 20);

    pdf.setFontSize(10);
    pdf.text(`Invoice #: ${order.orderNumber}`, pageWidth - 60, 28);
    pdf.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, pageWidth - 60, 33);

    // Line separator
    pdf.setDrawColor(200);
    pdf.line(20, 50, pageWidth - 20, 50);

    // Bill To / Ship To
    let y = 60;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('Bill To:', 20, y);
    pdf.text('Ship To:', 110, y);

    y += 7;
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(10);

    // Buyer details
    const buyerName = `${buyer?.firstName || ''} ${buyer?.lastName || ''}`.trim() || 'Customer';
    pdf.text(buyerName, 20, y);
    
    if (order.billingAddress) {
      pdf.text(order.billingAddress.line1, 20, y + 5);
      if (order.billingAddress.line2) {
        pdf.text(order.billingAddress.line2, 20, y + 10);
        y += 5;
      }
      pdf.text(`${order.billingAddress.city}, ${order.billingAddress.postal_code}`, 20, y + 10);
      pdf.text(order.billingAddress.country, 20, y + 15);
    }

    // Shipping address
    if (order.shippingAddress) {
      pdf.text(buyerName, 110, 67);
      pdf.text(order.shippingAddress.line1, 110, 72);
      if (order.shippingAddress.line2) {
        pdf.text(order.shippingAddress.line2, 110, 77);
      }
      pdf.text(`${order.shippingAddress.city}, ${order.shippingAddress.postal_code}`, 110, order.shippingAddress.line2 ? 82 : 77);
      pdf.text(order.shippingAddress.country, 110, order.shippingAddress.line2 ? 87 : 82);
    }

    // Items table
    y = 105;
    pdf.setDrawColor(200);
    pdf.line(20, y, pageWidth - 20, y);

    y += 7;
    pdf.setFont(undefined, 'bold');
    pdf.text('Description', 20, y);
    pdf.text('Qty', 120, y);
    pdf.text('Unit Price', 140, y);
    pdf.text('VAT', 160, y);
    pdf.text('Total', pageWidth - 35, y);

    y += 5;
    pdf.line(20, y, pageWidth - 20, y);

    // Order items
    y += 7;
    pdf.setFont(undefined, 'normal');

    if (order.order_items && order.order_items.length > 0) {
      for (const item of order.order_items) {
        pdf.text('Product Item', 20, y);
        pdf.text(item.quantity.toString(), 120, y);
        pdf.text(`£${item.unitPrice.toFixed(2)}`, 140, y);
        pdf.text(`£${item.vatAmount.toFixed(2)}`, 160, y);
        pdf.text(`£${item.lineTotal.toFixed(2)}`, pageWidth - 35, y);
        y += 7;
      }
    }

    // Totals
    y += 5;
    pdf.line(20, y, pageWidth - 20, y);

    y += 7;
    pdf.text('Subtotal (excl. VAT):', pageWidth - 80, y);
    pdf.text(`£${order.subtotal.toFixed(2)}`, pageWidth - 35, y);

    y += 7;
    pdf.text('VAT (20%):', pageWidth - 80, y);
    pdf.text(`£${order.vatAmount.toFixed(2)}`, pageWidth - 35, y);

    y += 7;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(12);
    pdf.text('Total:', pageWidth - 80, y);
    pdf.text(`£${order.total.toFixed(2)}`, pageWidth - 35, y);

    // Footer
    y = pdf.internal.pageSize.getHeight() - 30;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100);
    pdf.text('Thank you for your business!', 20, y);
    pdf.text('For any queries, please contact: loadifymarket.co.uk@gmail.com', 20, y + 5);

    // Generate PDF as base64
    const pdfBase64 = pdf.output('datauristring').split(',')[1];

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        pdf: pdfBase64,
        filename: `Invoice-${order.orderNumber}.pdf`,
      }),
    };
  } catch (error: any) {
    console.error('Invoice generation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Failed to generate invoice',
      }),
    };
  }
};
