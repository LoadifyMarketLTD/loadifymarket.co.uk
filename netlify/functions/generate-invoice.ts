import { Handler } from '@netlify/functions';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('generate-invoice: missing required environment variables');
}

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceRoleKey!
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

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  // ── Authentication ─────────────────────────────────────────────────────────
  // The caller must supply a valid Supabase JWT in the Authorization header.
  // The authenticated user must be the buyer or seller of the requested order.
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Authentication required' }),
    };
  }

  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Invalid authentication token' }),
    };
  }
  // ─────────────────────────────────────────────────────────────────────────

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
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Order not found' }),
      };
    }

    // ── Authorization check ──────────────────────────────────────────────────
    // Only the buyer or seller of this order may download its invoice.
    // Fetch the user's role to also allow admins.
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single<{ role: string }>();

    const isAdmin = userData?.role === 'admin';
    const isBuyer = order.buyerId === authUser.id;
    const isSeller = order.sellerId === authUser.id;

    if (!isAdmin && !isBuyer && !isSeller) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'You do not have permission to access this invoice' }),
      };
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Fetch buyer details
    const { data: buyer } = await supabase
      .from('users')
      .select('*, buyer_profiles(*)')
      .eq('id', order.buyerId)
      .single();

    // Fetch seller profile so the invoice is issued by the seller, not the
    // platform.  Loadify Market is a marketplace intermediary — the contract
    // of sale is between the buyer and the seller, so the seller must appear
    // as the invoicing party.
    const { data: sellerProfile } = await supabase
      .from('seller_profiles')
      .select('businessName, vatNumber, businessAddress, fullName')
      .eq('userId', order.sellerId)
      .maybeSingle<{
        businessName: string | null;
        vatNumber: string | null;
        businessAddress: {
          line1?: string;
          line2?: string;
          city?: string;
          postal_code?: string;
          country?: string;
        } | null;
        fullName: string | null;
      }>();

    // Fetch seller email for buyer contact information on the invoice.
    const { data: sellerUser } = await supabase
      .from('users')
      .select('email')
      .eq('id', order.sellerId)
      .maybeSingle<{ email: string | null }>();

    const sellerDisplayName =
      sellerProfile?.businessName ||
      sellerProfile?.fullName ||
      'Seller';

    // Generate PDF
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();

    // ── Seller Header ────────────────────────────────────────────────────────
    // The invoice must be issued by the seller, not the platform.
    // Loadify Market appears only as the marketplace facilitator.
    pdf.setFontSize(22);
    pdf.setTextColor(36, 59, 83); // Navy
    pdf.text(sellerDisplayName, 20, 20);

    pdf.setFontSize(10);
    pdf.setTextColor(100);

    let sellerHeaderY = 28;
    if (sellerProfile?.businessAddress) {
      const addr = sellerProfile.businessAddress;
      const line1 = addr.line1 || '';
      const line2 = addr.line2;
      const cityPostal = [addr.city, addr.postal_code].filter(Boolean).join(', ');
      const country = addr.country || '';
      if (line1) {
        pdf.text(line1, 20, sellerHeaderY);
        sellerHeaderY += 5;
      }
      if (line2) {
        pdf.text(line2, 20, sellerHeaderY);
        sellerHeaderY += 5;
      }
      if (cityPostal) {
        pdf.text(cityPostal, 20, sellerHeaderY);
        sellerHeaderY += 5;
      }
      if (country) {
        pdf.text(country, 20, sellerHeaderY);
        sellerHeaderY += 5;
      }
    }
    if (sellerProfile?.vatNumber) {
      pdf.text(`VAT: ${sellerProfile.vatNumber}`, 20, sellerHeaderY);
      sellerHeaderY += 5;
    }

    // Marketplace facilitator note — clearly identifies Loadify Market as
    // an intermediary, not as the seller.
    pdf.setFontSize(8);
    pdf.setTextColor(130);
    pdf.text('Sold via Loadify Market (marketplace intermediary)', 20, sellerHeaderY);
    // ─────────────────────────────────────────────────────────────────────────

    // Invoice title (top-right, aligned with seller header top)
    pdf.setFontSize(18);
    pdf.setTextColor(0);
    pdf.text('INVOICE', pageWidth - 60, 20);

    pdf.setFontSize(10);
    pdf.text(`Invoice #: ${order.orderNumber}`, pageWidth - 60, 28);
    pdf.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB')}`, pageWidth - 60, 33);

    // Line separator — placed below the taller of the two header columns.
    const separatorY = Math.max(sellerHeaderY + 8, 50);
    pdf.setDrawColor(200);
    pdf.line(20, separatorY, pageWidth - 20, separatorY);

    // Bill To / Ship To
    let y = separatorY + 10;
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

    // Shipping address — pinned to the same starting row as Bill To
    const shipY = separatorY + 17;
    if (order.shippingAddress) {
      pdf.text(buyerName, 110, shipY);
      pdf.text(order.shippingAddress.line1, 110, shipY + 5);
      let shipOffsetY = shipY + 10;
      if (order.shippingAddress.line2) {
        pdf.text(order.shippingAddress.line2, 110, shipOffsetY);
        shipOffsetY += 5;
      }
      pdf.text(`${order.shippingAddress.city}, ${order.shippingAddress.postal_code}`, 110, shipOffsetY);
      pdf.text(order.shippingAddress.country, 110, shipOffsetY + 5);
    }

    // Items table — start below address blocks (fixed offset from separator)
    y = separatorY + 55;
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

    // Footer — seller contact note + intermediary disclaimer
    y = pdf.internal.pageSize.getHeight() - 35;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(100);
    pdf.text('Thank you for your purchase!', 20, y);
    const sellerContact = sellerUser?.email
      ? `${sellerDisplayName} — ${sellerUser.email}`
      : sellerDisplayName;
    pdf.text(`For queries about this order, please contact the seller: ${sellerContact}`, 20, y + 5);
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(
      'This order was facilitated by Loadify Market (marketplace intermediary). ' +
      'The contract of sale is between you and the seller above.',
      20,
      y + 12
    );

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
  } catch (error) {
    console.error('Invoice generation error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      }),
    };
  }
};
