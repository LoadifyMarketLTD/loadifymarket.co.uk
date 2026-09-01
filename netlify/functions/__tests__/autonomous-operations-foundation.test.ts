import { describe, expect, it } from 'vitest';
import {
  canDiscloseCustomerPii,
  canPerformExternalMutation,
  canPerformFinancialMutation,
  type ProviderCapabilityRecord,
} from '../_shared/autonomousOperationsFoundation';

const NOW = new Date('2026-09-01T00:00:00.000Z');

const verifiedExternalCapability = (
  overrides: Partial<ProviderCapabilityRecord> = {},
): ProviderCapabilityRecord => ({
  provider: 'test-provider',
  capability: 'create_case',
  verified: true,
  verificationStatus: 'runtime_verified',
  evidenceSource: 'provider-contract',
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

describe('autonomous operations foundation', () => {
  it('denies unverified or read-only capabilities', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability({
      verified: false,
      verificationStatus: 'unverified',
    }), NOW)).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      verificationStatus: 'read_verified',
    }), NOW)).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      writeAllowed: false,
    }), NOW)).toBe(false);
  });

  it('requires explicit runtime-grade evidence and recovery contracts', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability({
      evidenceSource: null,
    }), NOW)).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      idempotencyKnown: false,
    }), NOW)).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      lostResponseRecoveryKnown: false,
    }), NOW)).toBe(false);
  });

  it('fails closed when capability evidence is stale or has no TTL', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability({
      lastVerifiedAt: '2026-08-20T00:00:00.000Z',
      verificationTtlHours: 24,
    }), NOW)).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      verificationTtlHours: null,
    }), NOW)).toBe(false);
  });

  it('denies external mutations when the kill switch is active', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability({
      killSwitchActive: true,
    }), NOW)).toBe(false);
  });

  it('allows only fully verified auto-external capabilities', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability(), NOW)).toBe(true);
  });

  it('requires an additional explicit PII grant', () => {
    expect(canDiscloseCustomerPii(verifiedExternalCapability(), NOW)).toBe(false);
    expect(canDiscloseCustomerPii(verifiedExternalCapability({
      piiAllowed: true,
    }), NOW)).toBe(true);
  });

  it('keeps generic financial mutation disabled', () => {
    expect(canPerformFinancialMutation()).toBe(false);
  });
});
