import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  evaluateDirectSupplierTransportConfiguration,
  normalizeDirectSupplierSource,
} from '../_shared/directSupplierTransportNormalizer';

describe('Direct Supplier native transport normalization', () => {
  it('normalizes quoted CSV into the canonical batch with field mapping and major-unit price conversion', () => {
    const result = normalizeDirectSupplierSource({
      supplierKey: 'uk-maker-001',
      generatedAt: '2026-09-21T12:00:00.000Z',
      transport: 'csv',
      sourceFormat: 'csv',
      amountUnit: 'major',
      minorUnitDigits: 2,
      fieldMap: {
        externalProductRef: 'product_id',
        externalVariantRef: 'variant_id',
        title: 'name',
        currency: 'currency',
        amount: 'price',
        warehouseCountry: 'country',
        stockQuantity: 'stock',
        imageUrls: 'images',
      },
      rawPayload: [
        'product_id,variant_id,name,currency,price,country,stock,images',
        'P-1,V-1,"Widget, large",GBP,12.99,GB,7,"https://a.example/1.jpg|https://a.example/2.jpg"',
      ].join('\n'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batch).toMatchObject({
      supplierKey: 'uk-maker-001',
      transport: 'csv',
      sourceFormat: 'csv',
      variants: [{
        externalProductRef: 'P-1',
        externalVariantRef: 'V-1',
        title: 'Widget, large',
        currency: 'GBP',
        amountMinor: 1299,
        warehouseCountry: 'GB',
        stockQuantity: 7,
        imageUrls: ['https://a.example/1.jpg','https://a.example/2.jpg'],
      }],
    });
    expect(result.externalAccessPerformed).toBe(false);
    expect(result.persistencePerformed).toBe(false);
  });

  it('normalizes flat XML but rejects DTD/entity declarations before parsing', () => {
    const valid = normalizeDirectSupplierSource({
      supplierKey: 'uk-maker-001',
      generatedAt: '2026-09-21T12:00:00.000Z',
      transport: 'xml',
      sourceFormat: 'xml',
      fieldMap: {
        externalProductRef: 'product',
        externalVariantRef: 'variant',
        title: 'title',
        currency: 'currency',
        amount: 'amountMinor',
        warehouseCountry: 'warehouseCountry',
      },
      xmlRecordElement: 'item',
      rawPayload: '<catalog><item><product>P-1</product><variant>V-1</variant><title>Widget</title><currency>GBP</currency><amountMinor>990</amountMinor><warehouseCountry>GB</warehouseCountry></item></catalog>',
    });
    expect(valid.ok).toBe(true);

    const blocked = normalizeDirectSupplierSource({
      supplierKey: 'uk-maker-001',
      generatedAt: '2026-09-21T12:00:00.000Z',
      transport: 'xml',
      sourceFormat: 'xml',
      rawPayload: '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><catalog><product></product></catalog>',
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.errors).toContain('XML DTD/entity declarations are not allowed');
  });

  it('supports JSON path mapping without making external requests', () => {
    const result = normalizeDirectSupplierSource({
      supplierKey: 'uk-maker-001',
      generatedAt: '2026-09-21T12:00:00.000Z',
      transport: 'feed_url',
      sourceFormat: 'json',
      amountUnit: 'major',
      fieldMap: {
        externalProductRef: 'identity.product',
        externalVariantRef: 'identity.variant',
        title: 'content.title',
        currency: 'pricing.currency',
        amount: 'pricing.amount',
        warehouseCountry: 'fulfilment.country',
      },
      rawPayload: JSON.stringify({
        items: [{
          identity: { product: 'P-1', variant: 'V-1' },
          content: { title: 'Mapped product' },
          pricing: { currency: 'GBP', amount: '4.50' },
          fulfilment: { country: 'GB' },
        }],
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.batch.variants[0].amountMinor).toBe(450);
    expect(result.externalAccessPerformed).toBe(false);
  });

  it('requires source format and server config refs for remote acquisition transports', () => {
    expect(evaluateDirectSupplierTransportConfiguration({
      transport: 'sftp',
    })).toEqual(expect.objectContaining({
      valid: false,
      blockers: expect.arrayContaining(['source_format_required','server_config_reference_required']),
      externalAcquisitionEnabled: false,
    }));

    expect(evaluateDirectSupplierTransportConfiguration({
      transport: 'feed_url',
      sourceFormat: 'xml',
      configRef: 'supplier-config/acme-feed-v1',
    })).toEqual({
      valid: true,
      blockers: [],
      normalizationSupported: true,
      externalAcquisitionEnabled: false,
    });
  });

  it('keeps the admin preview authenticated and preview-only', () => {
    const endpoint = readFileSync(resolve(process.cwd(), 'netlify/functions/admin-direct-supplier-normalize-preview.ts'), 'utf8');
    expect(endpoint).toContain("authenticateActiveAccount(event, admin, ['admin'])");
    expect(endpoint).toContain('Secrets and provider credentials are not accepted');
    expect(endpoint).toContain('externalAccessPerformed: false');
    expect(endpoint).toContain('persistencePerformed: false');
    expect(endpoint).not.toContain('fetch(');
  });
});
