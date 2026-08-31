import { describe, expect, it } from 'vitest';
import {
  canDiscloseCustomerPii,
  canPerformExternalMutation,
  canPerformFinancialMutation,
  type ProviderCapabilityRecord,
} from '../_shared/autonomousOperationsFoundation';

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
    }))).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      verificationStatus: 'read_verified',
    }))).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      writeAllowed: false,
    }))).toBe(false);
  });

  it('requires explicit runtime-grade evidence and recovery contracts', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability({
      evidenceSource: null,
    }))).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      idempotencyKnown: false,
    }))).toBe(false);

    expect(canPerformExternalMutation(verifiedExternalCapability({
      lostResponseRecoveryKnown: false,
    }))).toBe(false);
  });

  it('denies external mutations when the kill switch is active', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability({
      killSwitchActive: true,
    }))).toBe(false);
  });

  it('allows only fully verified auto-external capabilities', () => {
    expect(canPerformExternalMutation(verifiedExternalCapability())).toBe(true);
  });

  it('requires an additional explicit PII grant', () => {
    expect(canDiscloseCustomerPii(verifiedExternalCapability())).toBe(false);
    expect(canDiscloseCustomerPii(verifiedExternalCapability({
      piiAllowed: true,
    }))).toBe(true);
  });

  it('keeps generic financial mutation disabled', () => {
    expect(canPerformFinancialMutation()).toBe(false);
  });
});
