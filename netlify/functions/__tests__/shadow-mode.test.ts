import { describe, expect, it } from 'vitest';
import {
  compareShadowProposal,
  createShadowProposal,
  summarizeShadowComparisons,
} from '../_shared/shadowMode';

const NOW = new Date('2026-09-01T10:00:00.000Z');

const proposal = (action: Parameters<typeof createShadowProposal>[0]['proposedAction'], exposureMinor = 1000) => createShadowProposal({
  proposalId: `proposal-${action}`,
  correlationId: `correlation-${action}`,
  capability: 'shipment_stall_review',
  proposedAction: action,
  rationaleCode: action === 'no_action' ? 'shipment_activity_fresh' : 'shipment_scan_stalled',
  inputFacts: { action, shipmentId: 'shipment-1' },
  evidenceRefs: ['shipment:shipment-1', 'shipment-event:event-1'],
  policyVersion: 'shipment-shadow-v1',
  exposureMinor,
  createdAt: NOW,
});

describe('Shadow Mode', () => {
  it('creates recommendation-only evidence and never performs or persists a mutation', () => {
    const result = proposal('investigate_shipment');
    expect(result.shadowOnly).toBe(true);
    expect(result.externalMutationPerformed).toBe(false);
    expect(result.persistencePerformed).toBe(false);
    expect(result.evidence.autonomyLevel).toBe('recommend');
    expect(result.evidence.decision).toBe('recommend');
    expect(result.evidence.actionPerformed).toBe(null);
    expect(result.evidence.externalReference).toBe(null);
  });

  it('records an unreviewed proposal when no operator outcome exists', () => {
    expect(compareShadowProposal(proposal('investigate_shipment')).classification).toBe('unreviewed');
  });

  it('classifies exact operator agreement', () => {
    const result = compareShadowProposal(proposal('investigate_shipment'), {
      action: 'investigate_shipment',
      status: 'resolved',
      rationaleCode: 'operator_confirmed_stall',
    });
    expect(result.classification).toBe('agreement');
    expect(result.operatorRelative).toBe(true);
  });

  it('classifies operator-relative false positives and false negatives', () => {
    expect(compareShadowProposal(proposal('investigate_shipment'), {
      action: 'no_action',
      status: 'resolved',
    }).classification).toBe('false_positive');

    expect(compareShadowProposal(proposal('no_action'), {
      action: 'investigate_shipment',
      status: 'resolved',
    }).classification).toBe('false_negative');
  });

  it('classifies a different non-empty operator action as an override', () => {
    expect(compareShadowProposal(proposal('investigate_shipment'), {
      action: 'manual_review',
      status: 'resolved',
    }).classification).toBe('override');
  });

  it('keeps unresolved operator outcomes ambiguous rather than scoring them', () => {
    expect(compareShadowProposal(proposal('investigate_shipment'), {
      action: 'manual_review',
      status: 'unresolved',
    }).classification).toBe('ambiguous');
  });

  it('aggregates reviewed agreement, disagreement, ambiguity and financial exposure', () => {
    const comparisons = [
      compareShadowProposal(proposal('investigate_shipment', 1000), {
        action: 'investigate_shipment',
        status: 'resolved',
      }),
      compareShadowProposal(proposal('investigate_shipment', 2000), {
        action: 'no_action',
        status: 'resolved',
      }),
      compareShadowProposal(proposal('no_action', 3000), {
        action: 'investigate_shipment',
        status: 'resolved',
      }),
      compareShadowProposal(proposal('investigate_shipment', 4000), {
        action: 'manual_review',
        status: 'resolved',
      }),
      compareShadowProposal(proposal('investigate_shipment', 5000), {
        action: 'manual_review',
        status: 'unresolved',
      }),
      compareShadowProposal(proposal('investigate_shipment', 6000)),
    ];

    const metrics = summarizeShadowComparisons(comparisons);
    expect(metrics.total).toBe(6);
    expect(metrics.reviewed).toBe(5);
    expect(metrics.unreviewed).toBe(1);
    expect(metrics.agreement).toBe(1);
    expect(metrics.falsePositive).toBe(1);
    expect(metrics.falseNegative).toBe(1);
    expect(metrics.overrides).toBe(1);
    expect(metrics.ambiguous).toBe(1);
    expect(metrics.agreementRate).toBe(0.25);
    expect(metrics.falsePositiveRate).toBe(0.25);
    expect(metrics.falseNegativeRate).toBe(0.25);
    expect(metrics.overrideRate).toBe(0.25);
    expect(metrics.exposureMinorReviewed).toBe(15000);
    expect(metrics.exposureMinorDisagreement).toBe(9000);
    expect(metrics.operatorRelative).toBe(true);
  });
});
