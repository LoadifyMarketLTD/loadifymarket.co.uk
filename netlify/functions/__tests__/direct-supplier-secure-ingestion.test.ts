import { describe, expect, it } from 'vitest';
import {
  validateDirectSupplierWebhookEnvelope,
} from '../_shared/directSupplierContract';
import {
  validateDirectSupplierOnboardingManifest,
} from '../_shared/directSupplierOnboarding';
import {
  claimDirectSupplierWebhookEvent,
  computeDirectSupplierWebhookSignature,
  verifyDirectSupplierWebhookSignature,
  type DirectSupplierReplayStore,
} from '../_shared/directSupplierSecurity';
import {
  createSupplierProviderAdapter,
  getSupplierProviderDefinition,
} from '../_shared/supplierProviderRegistry';

const NOW = new Date('2026-08-30T18:40:00.000Z');
const TIMESTAMP = String(Math.floor(NOW.getTime() / 1000));
const SECRET = '0123456789abcdef0123456789abcdef';
const BODY = JSON.stringify({
  contractVersion: 1,
  eventId: 'evt_supplier_0001',
  eventType: 'stock.updated',
  supplierKey: 'uk-maker-001',
  occurredAt: NOW.toISOString(),
  payload: { externalVariantRef: 'SKU-1', stockQuantity: 12 },
});

describe('Direct Supplier onboarding manifest', () => {
  it('accepts a hosted-off business/operations manifest without secrets or customer PII', () => {
    expect(validateDirectSupplierOnboardingManifest({
      onboardingVersion: 1,
      supplierKey: 'uk-maker-001',
      legalName: 'Example UK Manufacturer Ltd',
      registrationCountry: 'GB',
      registrationNumber: '12345678',
      vatNumber: 'GB123456789',
      feedTransport: 'json_api',
      warehouseDeclarations: [
        { externalWarehouseRef: 'blackburn-01', country: 'GB' },
      ],
      supportedTerritories: ['GB'],
      requestedCapabilities: ['catalog', 'stock', 'price'],
      commercialApproval: false,
      hostedActivation: 'off',
    })).toEqual([]);
  });

  it('rejects malformed identity, duplicate operational declarations and attempted activation', () => {
    const errors = validateDirectSupplierOnboardingManifest({
      onboardingVersion: 1,
      supplierKey: 'INVALID KEY',
      legalName: '',
      registrationCountry: 'United Kingdom',
      feedTransport: 'csv',
      warehouseDeclarations: [
        { externalWarehouseRef: 'wh-1', country: 'GB' },
        { externalWarehouseRef: 'wh-1', country: 'United Kingdom' },
      ],
      supportedTerritories: ['GB', 'gb'],
      requestedCapabilities: ['catalog', 'catalog'],
      commercialApproval: true as false,
      hostedActivation: 'on' as 'off',
    });

    expect(errors).toContain('supplierKey must be a stable lowercase identifier');
    expect(errors).toContain('legalName is required');
    expect(errors).toContain('registrationCountry must be a 2-letter country code');
    expect(errors).toContain('commercialApproval must remain false in onboarding manifests');
    expect(errors).toContain('hostedActivation must remain off in onboarding manifests');
    expect(errors).toContain('warehouseDeclarations[1].externalWarehouseRef must be unique');
    expect(errors).toContain('supportedTerritories must be unique');
    expect(errors).toContain('requestedCapabilities must be unique');
  });
});

describe('Direct Supplier webhook envelope validation', () => {
  it('accepts the canonical PII-free webhook envelope shape', () => {
    expect(validateDirectSupplierWebhookEnvelope(JSON.parse(BODY))).toEqual([]);
  });

  it('rejects unknown events and malformed payload metadata', () => {
    const errors = validateDirectSupplierWebhookEnvelope({
      contractVersion: 1,
      eventId: 'x',
      eventType: 'customer.pii.exported',
      supplierKey: 'INVALID KEY',
      occurredAt: 'not-a-date',
      payload: [],
    });
    expect(errors).toEqual([
      'eventId is invalid',
      'eventType is unsupported',
      'supplierKey is invalid',
      'occurredAt must be an ISO-compatible timestamp',
      'payload must be an object',
    ]);
  });
});

describe('Direct Supplier webhook signature verification', () => {
  it('verifies the exact raw body with a versioned HMAC-SHA256 signature', () => {
    const signature = computeDirectSupplierWebhookSignature(SECRET, TIMESTAMP, BODY);
    expect(verifyDirectSupplierWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature,
      rawBody: BODY,
      now: NOW,
    })).toEqual({ ok: true, timestampSeconds: Number(TIMESTAMP) });
  });

  it('rejects body tampering even when JSON remains syntactically valid', () => {
    const signature = computeDirectSupplierWebhookSignature(SECRET, TIMESTAMP, BODY);
    const tamperedBody = BODY.replace('"stockQuantity":12', '"stockQuantity":1200');
    expect(verifyDirectSupplierWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature,
      rawBody: tamperedBody,
      now: NOW,
    })).toEqual({ ok: false, reason: 'INVALID_SIGNATURE' });
  });

  it('rejects stale timestamps and weak/missing secrets', () => {
    const signature = computeDirectSupplierWebhookSignature(SECRET, TIMESTAMP, BODY);
    expect(verifyDirectSupplierWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature,
      rawBody: BODY,
      now: new Date(NOW.getTime() + 301_000),
    })).toEqual({ ok: false, reason: 'STALE_TIMESTAMP' });

    expect(verifyDirectSupplierWebhookSignature({
      secret: 'too-short',
      timestamp: TIMESTAMP,
      signature,
      rawBody: BODY,
      now: NOW,
    })).toEqual({ ok: false, reason: 'MISSING_SECRET' });
  });

  it('rejects malformed timestamps and signatures', () => {
    expect(verifyDirectSupplierWebhookSignature({
      secret: SECRET,
      timestamp: 'yesterday',
      signature: 'v1=not-hex',
      rawBody: BODY,
      now: NOW,
    })).toEqual({ ok: false, reason: 'INVALID_TIMESTAMP' });

    expect(verifyDirectSupplierWebhookSignature({
      secret: SECRET,
      timestamp: TIMESTAMP,
      signature: 'v1=not-hex',
      rawBody: BODY,
      now: NOW,
    })).toEqual({ ok: false, reason: 'INVALID_SIGNATURE' });
  });
});

describe('Direct Supplier replay claim boundary', () => {
  it('requires an atomic durable replay-store claim before side effects', async () => {
    const claimed = new Set<string>();
    const expiries = new Map<string, Date>();
    const replayStore: DirectSupplierReplayStore = {
      async claim(eventId, expiresAt) {
        if (claimed.has(eventId)) return false;
        claimed.add(eventId);
        expiries.set(eventId, expiresAt);
        return true;
      },
    };

    const first = await claimDirectSupplierWebhookEvent({
      eventId: 'evt_supplier_0001',
      timestampSeconds: Number(TIMESTAMP),
      replayStore,
    });
    const second = await claimDirectSupplierWebhookEvent({
      eventId: 'evt_supplier_0001',
      timestampSeconds: Number(TIMESTAMP),
      replayStore,
    });

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, reason: 'REPLAYED_EVENT' });
    expect(expiries.get('evt_supplier_0001')?.toISOString()).toBe('2026-08-31T18:40:00.000Z');
  });

  it('rejects malformed event ids before touching the replay store', async () => {
    let calls = 0;
    const replayStore: DirectSupplierReplayStore = {
      async claim() {
        calls += 1;
        return true;
      },
    };

    expect(await claimDirectSupplierWebhookEvent({
      eventId: '../bad',
      timestampSeconds: Number(TIMESTAMP),
      replayStore,
    })).toEqual({ ok: false, reason: 'INVALID_EVENT_ID' });
    expect(calls).toBe(0);
  });
});

describe('Direct Supplier activation guard', () => {
  it('keeps Direct Supplier hosted-off with zero verified/runtime capabilities', () => {
    const definition = getSupplierProviderDefinition('direct_supplier');
    expect(definition.hostedActivation).toBe('off');
    expect(definition.verifiedCapabilities).toEqual([]);

    const adapter = createSupplierProviderAdapter('direct_supplier');
    expect(adapter.capabilities).toEqual([]);
  });
});
