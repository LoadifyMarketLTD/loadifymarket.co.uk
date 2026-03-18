import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package, Truck, CheckCircle, Clock, MapPin, Download,
  ChevronLeft, FileText, XCircle, RotateCcw, Store, AlertTriangle,
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
  // Build a printable HTML invoice and trigger browser print/save.
  // The platform (Loadify Market / XDrive Logistics Ltd) is NOT the seller.
  // The invoice header shows the seller's store name, not the platform company info.
  const sellerName = order.storeName || 'Seller';
  const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${order.orderNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .seller-name { font-size: 22px; font-weight: bold; color: #333; }
    .seller-sub { font-size: 12px; color: #666; }
    .intermediary-note { font-size: 11px; color: #888; margin-top: 4px; font-style: italic; }
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
      <div class="seller-name">${sellerName}</div>
      <div class="seller-sub">Seller on Loadify Market</div>
      <div class="intermediary-note">Sold via Loadify Market (marketplace intermediary)</div>
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
    <p>The contract of sale for this order is between you (the buyer) and ${sellerName} (the seller). This invoice is issued by ${sellerName}.</p>
    <p>This transaction was facilitated by Loadify Market (marketplace intermediary), operated by XDrive Logistics Ltd. For returns or enquiries, please contact the seller directly or raise a dispute via your orders page within ${BRAND.returnsDays} days of delivery.</p>
    <p>Loadify Market is not the seller and is not the merchant of record for this transaction.</p>
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
      <div className="bg-[#F8F9FA] min-h-screen pt-24 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-[#F8F9FA] min-h-screen pt-24">
        <div className="container-cinematic py-10 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h2>
          <Link to="/orders" className="btn-primary mt-4 inline-flex items-center gap-2">
            <ChevronLeft className="w-4 h-4" /> Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F9FA] min-h-screen pt-24">
      <div className="container-cinematic py-10 max-w-4xl">
        {/* Back */}
        <Link to="/orders" className="flex items-center gap-2 text-gray-400 hover:text-gold transition-colors mb-8 text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </Link>

        {/* Title Row */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
            <p className="text-gray-400 font-mono text-sm mt-1">{order.orderNumber}</p>
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
            {['paid', 'packed', 'shipped', 'delivered'].includes(order.status) && (
              <Link
                to={`/disputes?orderId=${order.id}`}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Open Dispute
              </Link>
            )}
          </div>
        </div>

        {/* Order Tracking Timeline */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Tracking Timeline</h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {STATUS_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isComplete = currentStepIdx >= idx;
              const isCurrent = currentStepIdx === idx;
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                    isComplete ? 'bg-gold text-jet' : 'bg-white/60 text-gray-300'
                  } ${isCurrent ? 'ring-2 ring-gold ring-offset-2 ring-offset-jet' : ''}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium ${isComplete ? 'text-gold' : 'text-gray-300'}`}>
                    {step.label}
                  </span>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div className={`hidden sm:block absolute w-full h-0.5 top-5 left-1/2 ${isComplete ? 'bg-gold/50' : 'bg-gray-100'}`} style={{ transform: 'translateX(0)' }} />
                  )}
                </div>
              );
            })}
          </div>
          {order.trackingNumber && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-gold" />
              <span className="text-gray-500 text-sm">Tracking: </span>
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
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Product</span>
                <span className="text-white font-medium">{order.productTitle || '–'}</span>
              </div>
              {order.storeName && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Store className="w-3 h-3" /> Sold by
                  </span>
                  <span className="text-gold font-medium">{order.storeName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Quantity</span>
                <span className="text-white">{order.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">£{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">VAT</span>
                <span className="text-white">£{order.vatAmount.toFixed(2)}</span>
              </div>
              {order.shippingAmount ? (
                <div className="flex justify-between">
                  <span className="text-gray-400">Shipping</span>
                  <span className="text-white">£{order.shippingAmount.toFixed(2)}</span>
                </div>
              ) : null}
              <div className="flex justify-between pt-3 border-t border-gray-200 font-bold">
                <span className="text-white">Total</span>
                <span className="text-gold text-lg">£{order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold" />
              Shipping Address
            </h2>
            {order.shippingAddress ? (
              <address className="not-italic text-sm text-gray-600 leading-relaxed">
                {order.shippingAddress.line1}<br />
                {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
                {order.shippingAddress.city}, {order.shippingAddress.postcode}<br />
                {order.shippingAddress.country}
              </address>
            ) : (
              <p className="text-gray-400 text-sm">No address on file</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Delivery Method</span>
                <span className="text-white capitalize">{order.deliveryMethod}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-400">Ordered</span>
                <span className="text-white">{new Date(order.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Proof of Delivery */}
        {order.proofOfDelivery?.images?.length ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Proof of Delivery
            </h2>
            <div className="flex gap-3 flex-wrap">
              {order.proofOfDelivery.images.map((img, i) => (
                <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                  <img src={img} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:border-gold transition-colors" />
                </a>
              ))}
            </div>
            {order.proofOfDelivery.receivedBy && (
              <p className="text-gray-400 text-xs mt-3">Received by: {order.proofOfDelivery.receivedBy}</p>
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
              <p className="text-gray-400 text-xs">INV-{order.orderNumber} • {BRAND.name}</p>
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
