import { describe, expect, it, vi } from 'vitest';
import {
  assessAdminReleaseEligibility,
  enforcePaymentBackedTransition,
  summarizePaymentEvidence,
} from '../_shared/orderTransitionGuards';

describe('orderTransitionGuards', () => {
  it('accepts direct Stripe payment intent evidence on goods orders', () => {
    const summary = summarizePaymentEvidence({
      order: {
        stripePaymentIntentId: 'pi_live_123',
        rfqId: null,
        rfqResponseId: null,
      },
      listingContext: 'product',
      paymentSession: null,
    });

    expect(summary.hasValidPaymentEvidence).toBe(true);
    expect(summary.paymentEvidenceSource).toBe('order.stripePaymentIntentId');
    expect(summary.requiresPaymentEvidence).toBe(true);
  });

  it('accepts legacy completed payment session evidence on goods orders', () => {
    const summary = summarizePaymentEvidence({
      order: {
        stripePaymentIntentId: null,
        rfqId: null,
        rfqResponseId: null,
      },
      listingContext: 'product',
      paymentSession: {
        status: 'completed',
        stripePaymentIntent: 'pi_legacy_456',
      },
    });

    expect(summary.hasValidPaymentEvidence).toBe(true);
    expect(summary.paymentEvidenceSource).toBe('payment_sessions.stripePaymentIntent');
  });

  it('allows explicit RFQ service flows without Stripe evidence', () => {
    const summary = summarizePaymentEvidence({
      order: {
        stripePaymentIntentId: null,
        rfqId: 'rfq-1',
        rfqResponseId: 'resp-1',
      },
      listingContext: 'service',
      paymentSession: null,
    });

    expect(summary.hasValidPaymentEvidence).toBe(false);
    expect(summary.requiresPaymentEvidence).toBe(false);
    expect(summary.allowedNonStripeFlow).toBe('rfq_service');
  });

  it('blocks packed/shipped/delivered transitions for unpaid goods orders', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    } as never;

    const decision = await enforcePaymentBackedTransition({
      supabase,
      order: {
        id: 'order-1',
        orderNumber: 'LM-1000001',
        status: 'paid',
        productId: 'product-1',
        stripePaymentIntentId: null,
        rfqId: null,
        rfqResponseId: null,
      },
      product: {
        id: 'product-1',
        listingContext: 'product',
      },
      nextStatus: 'shipped',
      actorRole: 'seller',
    });

    expect(decision.ok).toBe(false);
    expect(decision.statusCode).toBe(409);
    expect(decision.error).toMatch(/valid stripe payment record/i);
  });

  it('allows release only for unpaid active/test order states', () => {
    const releaseEligibility = assessAdminReleaseEligibility({
      order: {
        status: 'delivered',
        escrowStatus: 'held',
      },
      paymentEvidence: {
        hasValidPaymentEvidence: false,
        paymentEvidenceSource: null,
        requiresPaymentEvidence: true,
        allowedNonStripeFlow: null,
      },
    });

    expect(releaseEligibility.eligible).toBe(true);
    expect(releaseEligibility.reason).toBeNull();
  });

  it('rejects release when Stripe payment evidence exists', () => {
    const releaseEligibility = assessAdminReleaseEligibility({
      order: {
        status: 'delivered',
        escrowStatus: 'held',
      },
      paymentEvidence: {
        hasValidPaymentEvidence: true,
        paymentEvidenceSource: 'order.stripePaymentIntentId',
        requiresPaymentEvidence: true,
        allowedNonStripeFlow: null,
      },
    });

    expect(releaseEligibility.eligible).toBe(false);
    expect(releaseEligibility.reason).toMatch(/already has valid Stripe payment evidence/i);
  });

  it('rejects release for approved non-Stripe service flows', () => {
    const releaseEligibility = assessAdminReleaseEligibility({
      order: {
        status: 'delivered',
        escrowStatus: 'held',
      },
      paymentEvidence: {
        hasValidPaymentEvidence: false,
        paymentEvidenceSource: null,
        requiresPaymentEvidence: false,
        allowedNonStripeFlow: 'rfq_service',
      },
    });

    expect(releaseEligibility.eligible).toBe(false);
    expect(releaseEligibility.reason).toMatch(/approved non-Stripe flow/i);
  });
});
