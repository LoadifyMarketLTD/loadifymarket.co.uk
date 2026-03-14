import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package, Truck, CheckCircle, Clock, MapPin, Download,
  ChevronLeft, FileText, XCircle, RotateCcw, Store,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import { BRAND } from '../constants/brand';
import type { Order } from '../types';

const STATUS_STEPS = [
  { key: 'pending',   label: 'Order Placed',       icon: Clock },
  { key: 'paid',      label: 'Payment Confirmed',  icon: CheckCircle },
  { key: 'packed',    label: 'Packed',             icon: Package },
  { key: 'shipped',   label: 'Shipped',            icon: Truck },
  { key: 'delivered', label: 'Delivered',          icon: CheckCircle },
];

const STATUS_ORDER = ['pending', 'paid', 'packed', 'shipped', 'delivered'];

function generateInvoicePDF(order: Order & { productTitle?: string; storeName?: string }) {
  // Build a printable HTML invoice and trigger browser print/save
  const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${order.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .brand { font-size: 22px; font-weight: bold; color: #D4AF37; }
    .brand-sub { font-size: 12px; color: #666; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #222; }
    .invoice-meta { font-size: 13px; color: #555; line-height: 1.7; }
    .divider { border: none; border-top: 2px solid #D4AF37; margin: 24px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
    .total-row td { font-weight: bold; font-size: 15px; border-bottom: none; }
    .footer { margin-top: 40px; font-size: 11px; color: #888; line-height: 1.6; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">${BRAND.name}</div>
      <div class="brand-sub">${BRAND.companyAddress}</div>
      <div class="brand-sub">VAT: ${BRAND.vatNumber}</div>
      <div class="brand-sub">${BRAND.supportEmail}</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <strong>Invoice #:</strong> INV-${order.orderNumber}<br/>
        <strong>Order #:</strong> ${order.orderNumber}<br/>
        <strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-GB')}<br/>
        <strong>Status:</strong> ${order.status.toUpperCase()}
      </div>
    </div>
  </div>
  <hr class="divider"/>
  <div style="display:flex; gap:40px; margin-bottom:24px;">
    <div style="flex:1">
      <div style="font-weight:bold; margin-bottom:6px; font-size:12px; text-transform:uppercase; color:#888;">Ship To</div>
      <div style="font-size:13px; line-height:1.7; color:#444;">
        ${order.shippingAddress?.line1 || ''}<br/>
        ${order.shippingAddress?.line2 ? order.shippingAddress.line2 + '<br/>' : ''}
        ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.postcode || ''}<br/>
        ${order.shippingAddress?.country || 'United Kingdom'}
      </div>
    </div>
    <div style="flex:1">
      <div style="font-weight:bold; margin-bottom:6px; font-size:12px; text-transform:uppercase; color:#888;">Payment</div>
      <div style="font-size:13px; line-height:1.7; color:#444;">
        Method: Card (Stripe)<br/>
        Delivery: ${order.deliveryMethod || 'delivery'}<br/>
        ${order.storeName ? `Sold by: ${order.storeName}` : ''}
      </div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${order.productTitle || 'Order item'}</td>
        <td style="text-align:center">${order.quantity}</td>
        <td style="text-align:right">£${(order.subtotal / order.quantity).toFixed(2)}</td>
        <td style="text-align:right">£${order.subtotal.toFixed(2)}</td>
      </tr>
    </tbody>
    <tfoot>
      <tr><td colspan="3" style="text-align:right; padding-top:8px; color:#666; font-size:12px;">Subtotal</td><td style="text-align:right; padding-top:8px;">£${order.subtotal.toFixed(2)}</td></tr>
      <tr><td colspan="3" style="text-align:right; color:#666; font-size:12px;">VAT</td><td style="text-align:right;">£${order.vatAmount.toFixed(2)}</td></tr>
      ${order.shippingAmount ? `<tr><td colspan="3" style="text-align:right; color:#666; font-size:12px;">Shipping</td><td style="text-align:right;">£${order.shippingAmount.toFixed(2)}</td></tr>` : ''}
      <tr class="total-row"><td colspan="3" style="text-align:right; padding-top:12px;">TOTAL</td><td style="text-align:right; padding-top:12px; color:#D4AF37;">£${order.total.toFixed(2)}</td></tr>
    </tfoot>
  </table>
  <hr class="divider"/>
  <div class="footer">
    <p>Thank you for your order. ${BRAND.name} operates as a marketplace platform facilitating transactions between buyers and independent sellers.</p>
    <p>This product is sold and fulfilled by the seller. For returns or enquiries, please contact the seller directly or raise a dispute via your orders page within ${BRAND.returnsDays} days of delivery.</p>
    <p>This invoice was generated automatically. Platform fee: ${BRAND.marketplaceFeePercent}%.</p>
  </div>
</body>
</html>`;

  const blob = new Blob([invoiceHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.print();
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<(Order & { productTitle?: string; storeName?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`*, product:products(title), store:seller_stores(storeName)`)
          .eq('id', id)
          .eq('buyerId', user.id)
          .single();
        if (error) throw error;
        setOrder({
          ...data,
          productTitle: (data?.product as { title?: string } | null)?.title,
          storeName: (data?.store as { storeName?: string } | null)?.storeName,
        });
      } catch (e) {
        console.error('Error fetching order:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, user]);

  const currentStepIdx = order ? STATUS_ORDER.indexOf(order.status) : -1;

  if (loading) {
    return (
      <div className="bg-jet min-h-screen pt-24 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-jet min-h-screen pt-24">
        <div className="container-cinematic py-10 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Order not found</h2>
          <Link to="/orders" className="btn-primary mt-4 inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-jet min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-4xl">
        {/* Back */}
        <Link to="/orders" className="flex items-center gap-2 text-white/50 hover:text-gold transition-colors mb-8 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>

        {/* Title Row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Order Details</h1>
            <p className="text-white/50 font-mono text-sm mt-1">{order.orderNumber}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => generateInvoicePDF(order)}
              className="btn-glass flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              Download Invoice
            </button>
            {order.status === 'delivered' && (
              <Link to="/returns" className="btn-outline flex items-center gap-2 text-sm">
                <RotateCcw className="w-4 h-4" />
                Request Return
              </Link>
            )}
          </div>
        </div>

        {/* Order Tracking Timeline */}
        <div className="card-glass mb-6">
          <h2 className="text-lg font-bold text-white mb-6">Tracking Timeline</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isComplete ? 'bg-gold text-jet' : 'bg-graphite/60 text-white/30'
                  } ${isCurrent ? 'ring-2 ring-gold ring-offset-2 ring-offset-jet' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium ${isComplete ? 'text-gold' : 'text-white/30'}`}>
                    {step.label}
                  </span>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`hidden sm:block absolute w-full h-0.5 top-5 left-1/2 ${isComplete ? 'bg-gold/50' : 'bg-white/10'}`} style={{ transform: 'translateX(0)' }} />
                  )}
                </div>
              );
            })}
          </div>
          {order.trackingNumber && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
              <Truck className="w-4 h-4 text-gold" />
              <span className="text-white/60 text-sm">Tracking: </span>
              <span className="text-white font-mono text-sm">{order.trackingNumber}</span>
              <Link to={`/track-order?orderNumber=${order.orderNumber}`} className="ml-auto text-gold text-xs hover:underline">
                Full Tracking →
              </Link>
            </div>
          )}
        </div>

        {/* Order Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Order Summary */}
          <div className="card-glass">
            <h2 className="text-lg font-bold text-white mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Product</span>
                <span className="text-white font-medium">{order.productTitle || '–'}</span>
              </div>
              {order.storeName && (
                <div className="flex justify-between items-center">
                  <span className="text-white/50 flex items-center gap-1">
                    <Store className="w-3 h-3" /> Sold by
                  </span>
                  <span className="text-gold font-medium">{order.storeName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/50">Quantity</span>
                <span className="text-white">{order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white">£{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">VAT</span>
                <span className="text-white">£{order.vatAmount.toFixed(2)}</span>
              </div>
              {order.shippingAmount ? (
                <div className="flex justify-between">
                  <span className="text-white/50">Shipping</span>
                  <span className="text-white">£{order.shippingAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-3 border-t border-white/10 font-bold">
                <span className="text-white">Total</span>
                <span className="text-gold text-lg">£{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="card-glass">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold" />
              Shipping Address
            </h2>
            {order.shippingAddress ? (
              <address className="not-italic text-sm text-white/70 leading-relaxed">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.postcode}<br />
                {order.shippingAddress.country}
              </address>
            ) : (
              <p className="text-white/40 text-sm">No address on file</p>
            )}
            <div className="mt-4 pt-4 border-t border-white/10 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Delivery Method</span>
                <span className="text-white capitalize">{order.deliveryMethod}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-white/50">Ordered</span>
                <span className="text-white">{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Proof of Delivery */}
        {order.proofOfDelivery?.images?.length ? (
          <div className="card-glass">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Proof of Delivery
            </h2>
            <div className="flex gap-3 flex-wrap">
              {order.proofOfDelivery.images.map((img, i) => (
                <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                  <img src={img} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-white/10 hover:border-gold transition-colors" />
                </a>
              ))}
            </div>
            {order.proofOfDelivery.receivedBy && (
              <p className="text-white/50 text-xs mt-3">Received by: {order.proofOfDelivery.receivedBy}</p>
            )}
          </div>
        ) : null}

        {/* Invoice Download Button */}
        <div className="mt-6 card-glass flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-premium-sm">
              <Download className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Invoice PDF</p>
              <p className="text-white/40 text-xs">INV-{order.orderNumber} • {BRAND.name}</p>
            </div>
          </div>
          <button
            onClick={() => generateInvoicePDF(order)}
            className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Download Invoice
          </button>
        </div>
      </div>
    </div>
  );
}
