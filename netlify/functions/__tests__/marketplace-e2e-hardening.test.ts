import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const confirmDelivery = read('netlify/functions/confirm-delivery.ts');
const escrowRelease = read('netlify/functions/_shared/escrowRelease.ts');
const createShipment = read('netlify/functions/create-shipment.ts');
const updateShipmentStatus = read('netlify/functions/update-shipment-status.ts');
const sellerOrderStatus = read('netlify/functions/seller-order-status.ts');
const createRefund = read('netlify/functions/create-refund.ts');
const caseRls = read('supabase/migrations/20260818113100_harden_return_dispute_order_ownership_20260818.sql');
const reviewRls = read('supabase/migrations/20260818114500_harden_review_mutations_20260818.sql');
const notificationRls = read('supabase/migrations/20260818115500_harden_notifications_and_case_alerts_20260818.sql');
const buyerOrders = read('src/pages/pixel-perfect/buyer/BuyerOrders.tsx');
const buyerReviews = read('src/pages/pixel-perfect/buyer/BuyerReviews.tsx');
const adminDisputes = read('src/pages/pixel-perfect/admin/AdminDisputes.tsx');

describe('marketplace E2E hardening contracts', () => {
  it('routes buyer-confirmed delivery through the single Stripe payout path', () => {
    expect(confirmDelivery).toContain("import { releaseHeldOrder } from './_shared/escrowRelease';");
    expect(confirmDelivery).toContain("reason: 'buyer_confirmed'");
    expect(confirmDelivery).not.toContain("escrowStatus: 'released'");
    expect(confirmDelivery).not.toContain("status: 'completed', escrowStatus");

    expect(escrowRelease).toContain("{ idempotencyKey: `escrow-release:${order.id}` }");
    expect(escrowRelease).toContain(".in('status', ['open', 'in_review'])");
    expect(escrowRelease).toContain(".in('status', ['requested', 'approved'])");
    expect(escrowRelease).toContain("latestOrder?.status === 'completed'");
    expect(escrowRelease).toContain("latestOrder.escrowStatus === 'released'");
  });

  it('keeps physical order money immutable and dispatch inside shipment lifecycle', () => {
    expect(createShipment).toContain("'shipping_cost' in rawBody");
    expect(createShipment).toContain("'shipping_method' in rawBody");
    expect(createShipment).toContain("'dispatched_at' in rawBody");
    expect(createShipment).toContain("product.listingContext === 'service'");
    expect(createShipment).not.toContain('shippingAmount: shipping_cost');
    expect(createShipment).not.toContain('shippingMethod: shipping_method');

    expect(sellerOrderStatus).toContain('Physical orders must be dispatched through the shipment workflow.');
    expect(updateShipmentStatus).toContain("targetOrderStatus = 'shipped'");
    expect(updateShipmentStatus).toContain("targetOrderStatus = 'delivered'");
    expect(updateShipmentStatus).toContain(".eq('status', shipment.orders.status)");
    expect(updateShipmentStatus).toContain('shipment rollback failed');
  });

  it('allows seller refunds only for an approved return on the seller own order', () => {
    expect(createRefund).toContain("callerRow?.role !== 'admin' && callerRow?.role !== 'seller'");
    expect(createRefund).toContain("callerRow.role === 'seller' && order.sellerId !== user.id");
    expect(createRefund).toContain('Seller refunds must be linked to an approved return.');
    expect(createRefund).toContain("returnRow.status !== 'approved'");
    expect(createRefund).toContain("status: 'completed'");
    expect(createRefund).toContain('refundAmount: refund.amount / 100');
    expect(createRefund).toContain("{ idempotencyKey: `order-refund:${orderId}` }");
  });

  it('binds return and dispute creation to the authenticated buyer real order', () => {
    expect(caseRls).toContain('o.id = returns."orderId"');
    expect(caseRls).toContain('o."buyerId" = auth.uid()');
    expect(caseRls).toContain('o."sellerId" = returns."sellerId"');
    expect(caseRls).toContain("o.status IN ('delivered', 'completed')");
    expect(caseRls).toContain("existing_return.status IN ('requested', 'approved', 'completed')");

    expect(caseRls).toContain('o.id = disputes."orderId"');
    expect(caseRls).toContain('o."sellerId" = disputes."sellerId"');
    expect(caseRls).toContain("o.status IN ('paid', 'packed', 'shipped', 'delivered', 'completed')");
    expect(caseRls).toContain("existing_dispute.status IN ('open', 'in_review')");
  });

  it('keeps review moderation fields protected while allowing canonical helpful votes and seller replies', () => {
    expect(reviewRls).toContain('CREATE OR REPLACE FUNCTION public.guard_review_mutation()');
    expect(reviewRls).toContain("OLD.status = 'published'");
    expect(reviewRls).toContain('NEW."helpfulCount" = OLD."helpfulCount" + 1');
    expect(reviewRls).toContain("array_append(COALESCE(OLD.\"helpfulVoters\", '{}'::UUID[]), v_uid)");
    expect(reviewRls).toContain("v_is_product_seller");
    expect(reviewRls).toContain("NEW.\"sellerRespondedAt\" := NOW()");
    expect(reviewRls).toContain('reviews."isAbusive" = FALSE');
    expect(reviewRls).toContain('reviews."adminNote" IS NULL');
  });

  it('makes cross-user case notifications server-owned', () => {
    expect(notificationRls).toContain("CREATE POLICY \"notifications_insert\"");
    expect(notificationRls).toContain('WITH CHECK (public.is_admin());');
    expect(notificationRls).not.toContain('WITH CHECK (TRUE)');
    expect(notificationRls).toContain("'order_refunded'");
    expect(notificationRls).toContain('SECURITY DEFINER');
    expect(notificationRls).toContain('trg_notify_return_status_change');
    expect(notificationRls).toContain('trg_notify_dispute_opened');
  });

  it('keeps buyer actions aligned with delivered/completed lifecycle', () => {
    expect(buyerOrders).toContain('["delivered", "completed"].includes(o.status) ? "Request return"');
    expect(buyerOrders).toContain('["paid", "packed", "shipped", "delivered", "completed"].includes(o.status) ? "Open dispute"');
    expect(buyerOrders).toContain('.in("status", ["open", "in_review"])');
    expect(buyerReviews).toContain('.in("status", ["delivered", "completed"])');
  });

  it('does not expose a fake partial-refund option that issues a full Stripe refund', () => {
    expect(adminDisputes).toContain('resolveForm.resolutionType === "full_refund"');
    expect(adminDisputes).not.toContain('value="partial_refund"');
    expect(adminDisputes).not.toContain('resolutionType === "partial_refund"');
  });
});
