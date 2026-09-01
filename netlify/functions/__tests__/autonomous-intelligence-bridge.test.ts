import { describe, expect, it } from 'vitest';
import {
  createProviderCapabilityRegistry,
} from '../_shared/autonomousCapabilityRegistry';
import {
  createAutomatedDecisionEvidence,
  digestAutomatedDecisionFacts,
} from '../_shared/autonomousDecisionEvidence';
import { createAutonomousException } from '../_shared/autonomousExceptionModel';
import {
  capabilityKillSwitchKey,
  resolveAutonomousKillSwitch,
} from '../_shared/autonomousKillSwitch';
import {
  type ProviderCapabilityRecord,
} from '../_shared/autonomousOperationsFoundation';

const NOW = new Date('2026-09-01T00:00:00.000Z');

const capability = (
  overrides: Partial<ProviderCapabilityRecord> = {},
): ProviderCapabilityRecord => ({
  provider: 'provider-a',
  capability: 'create_case',
  verified: true,
  verificationStatus: 'runtime_verified',
  evidenceSource: 'sandbox-runtime-evidence',
  evidenceVersion: 'v1',
  lastVerifiedAt: '2026-08-31T22:00:00.000Z',
  verificationTtlHours: 168,
  readAllowed: true,
  writeAllowed: true,
  piiAllowed: false,
  idempotencyKnown: true,
  lostResponseRecoveryKnown: true,
  rateLimitKnown: true,
  autonomyLevel: 'auto_external',
  killSwitchActive: false,
  ...overrides,
});

describe('Autonomous Intelligence Bridge v1', () => {
  it('rejects duplicate provider capability truth', () => {
    expect(() => createProviderCapabilityRegistry([
      capability(),
      capability({ provider: ' Provider-A ', capability: ' CREATE_CASE ' }),
    ])).toThrow(/duplicate provider capability/);
  });

  it('never guesses an unregistered provider capability', () => {
    const registry = createProviderCapabilityRegistry([]);
    expect(registry.resolve({
      provider: 'unknown-provider',
      capability: 'create_order',
      now: NOW,
    })).toEqual({
      found: false,
      provider: 'unknown-provider',
      capability: 'create_order',
      availability: 'unavailable',
      reason: 'CAPABILITY_NOT_REGISTERED',
      record: null,
      effectiveAutonomyLevel: 'disabled',
      readAllowed: false,
      externalMutationAllowed: false,
      piiDisclosureAllowed: false,
      killSwitchReasons: [],
    });
  });

  it('rejects write or PII grants on an unverified capability', () => {
    expect(() => createProviderCapabilityRegistry([
      capability({
        verified: false,
        verificationStatus: 'unverified',
        writeAllowed: true,
      }),
    ])).toThrow(/unverified capability/);

    expect(() => createProviderCapabilityRegistry([
      capability({
        verified: false,
        verificationStatus: 'unverified',
        writeAllowed: false,
        piiAllowed: true,
      }),
    ])).toThrow(/unverified capability/);
  });

  it('keeps read-verified capability available for reads but not external mutation', () => {
    const registry = createProviderCapabilityRegistry([
      capability({
        capability: 'stock_read',
        verificationStatus: 'read_verified',
        writeAllowed: false,
        piiAllowed: false,
        idempotencyKnown: false,
        lostResponseRecoveryKnown: false,
        autonomyLevel: 'observe',
      }),
    ]);

    const resolved = registry.resolve({
      provider: 'provider-a',
      capability: 'stock_read',
      now: NOW,
    });
    expect(resolved.availability).toBe('available');
    expect(resolved.readAllowed).toBe(true);
    expect(resolved.externalMutationAllowed).toBe(false);
    expect(resolved.piiDisclosureAllowed).toBe(false);
  });

  it('allows external mutation only with fresh runtime evidence and all execution contracts', () => {
    const registry = createProviderCapabilityRegistry([capability()]);
    const resolved = registry.resolve({
      provider: 'provider-a',
      capability: 'create_case',
      now: NOW,
    });
    expect(resolved.externalMutationAllowed).toBe(true);
    expect(resolved.piiDisclosureAllowed).toBe(false);

    const stale = createProviderCapabilityRegistry([
      capability({
        lastVerifiedAt: '2026-08-20T00:00:00.000Z',
        verificationTtlHours: 24,
      }),
    ]).resolve({
      provider: 'provider-a',
      capability: 'create_case',
      now: NOW,
    });
    expect(stale.externalMutationAllowed).toBe(false);
  });

  it('requires a separate explicit PII grant', () => {
    const registry = createProviderCapabilityRegistry([
      capability({ piiAllowed: true }),
    ]);
    expect(registry.resolve({
      provider: 'provider-a',
      capability: 'create_case',
      now: NOW,
    }).piiDisclosureAllowed).toBe(true);
  });

  it('applies record, global, provider and capability kill switches independently', () => {
    expect(resolveAutonomousKillSwitch({
      provider: 'provider-a',
      capability: 'create_case',
      recordKillSwitchActive: true,
    }).reasons).toContain('RECORD_KILL_SWITCH');

    const registry = createProviderCapabilityRegistry([capability()]);
    const global = registry.resolve({
      provider: 'provider-a',
      capability: 'create_case',
      killSwitchState: { version: 1, global: true, providers: [], capabilities: [] },
      now: NOW,
    });
    expect(global.availability).toBe('manual_only');
    expect(global.externalMutationAllowed).toBe(false);
    expect(global.killSwitchReasons).toContain('GLOBAL_KILL_SWITCH');

    const provider = registry.resolve({
      provider: 'provider-a',
      capability: 'create_case',
      killSwitchState: { version: 1, global: false, providers: ['provider-a'], capabilities: [] },
      now: NOW,
    });
    expect(provider.killSwitchReasons).toContain('PROVIDER_KILL_SWITCH');

    const exactCapability = registry.resolve({
      provider: 'provider-a',
      capability: 'create_case',
      killSwitchState: {
        version: 1,
        global: false,
        providers: [],
        capabilities: [capabilityKillSwitchKey('provider-a', 'create_case')],
      },
      now: NOW,
    });
    expect(exactCapability.killSwitchReasons).toContain('CAPABILITY_KILL_SWITCH');
  });

  it('creates deterministic decision evidence without storing hidden reasoning', () => {
    expect(digestAutomatedDecisionFacts({ b: 2, a: 1 })).toBe(
      digestAutomatedDecisionFacts({ a: 1, b: 2 }),
    );

    const evidence = createAutomatedDecisionEvidence({
      decisionId: 'decision-1',
      correlationId: 'correlation-1',
      capability: 'provider-a:create_case',
      autonomyLevel: 'recommend',
      inputFacts: { shipmentStatus: 'In Transit', ageHours: 52 },
      evidenceRefs: ['shipment:1', 'shipment-event:9', 'shipment:1'],
      policyVersion: 'shipment-stall-v1',
      decision: 'recommend',
      reconciliationState: 'not_required',
      createdAt: NOW,
    });

    expect(evidence.evidenceRefs).toEqual(['shipment:1', 'shipment-event:9']);
    expect(evidence.inputFactsDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence.actionPerformed).toBe(null);
    expect(evidence.createdAt).toBe('2026-09-01T00:00:00.000Z');
  });

  it('requires evidence references for material decisions', () => {
    expect(() => createAutomatedDecisionEvidence({
      decisionId: 'decision-2',
      correlationId: 'correlation-2',
      capability: 'provider-a:create_case',
      autonomyLevel: 'recommend',
      inputFacts: {},
      evidenceRefs: [],
      policyVersion: 'v1',
      decision: 'block',
      createdAt: NOW,
    })).toThrow(/at least one evidence ref/);
  });

  it('builds a unified exception that forces escalation for high severity', () => {
    const exception = createAutonomousException({
      exceptionId: 'exception-1',
      correlationId: 'correlation-1',
      category: 'shipment',
      severity: 'high',
      source: 'shipment-stall-monitor',
      entityRefs: { shipmentId: 'shipment-1', orderId: 'order-1' },
      observedFacts: { ageHours: 52, status: 'In Transit' },
      evidenceRefs: ['shipment:1', 'shipment-event:9'],
      policyVersion: 'shipment-stall-v1',
      recommendedAction: 'review carrier status',
      allowedAutomatedActions: ['notify_internal_queue', 'notify_internal_queue'],
      slaMinutes: 60,
      exposureMinor: 12500,
      escalationRequired: false,
      createdAt: NOW,
    });

    expect(exception.escalationRequired).toBe(true);
    expect(exception.allowedAutomatedActions).toEqual(['notify_internal_queue']);
    expect(exception.resolutionState).toBe('open');
    expect(exception.reconciliationState).toBe('not_required');
    expect(exception.observedFactsDigest).toMatch(/^[0-9a-f]{64}$/);
  });
});
