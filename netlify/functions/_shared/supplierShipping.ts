import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  SupplierAdapterContext,
  SupplierAdapterErrorClass,
  SupplierAdapterV1,
  SupplierShippingQuote,
} from './supplierAdapter';
import { adapterSupports } from './supplierAdapter';

export const SUPPLIER_SHIPPING_INTERFACE_VERSION = 1 as const;

interface PreparedShippingRequest {
  eligible: true;
  reason: string;
  requestId: string;
  publicProductId: string;
  canonicalProductId: string;
  supplierOfferId: string;
  pricingSnapshotId: string;
  supplierKey: string;
  providerKey: string;
  adapterVersion: string;
  externalOfferRef: string;
  quantity: number;
  destinationCountry: string;
  idempotencyKey: string;
  correlationId: string;
  state: string;
  interfaceVersion: 1;
}

export interface SupplierShippingRuntimeResult {
  ok: boolean;
  requestId?: string;
  quotes?: SupplierShippingQuote[];
  reason?: string;
  errorClass?: SupplierAdapterErrorClass | 'ADAPTER_IDENTITY_MISMATCH';
}

function isPrepared(value: unknown): value is PreparedShippingRequest {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.eligible === true
    && typeof row.requestId === 'string'
    && typeof row.publicProductId === 'string'
    && typeof row.canonicalProductId === 'string'
    && typeof row.supplierOfferId === 'string'
    && typeof row.pricingSnapshotId === 'string'
    && typeof row.supplierKey === 'string'
    && typeof row.providerKey === 'string'
    && typeof row.adapterVersion === 'string'
    && typeof row.externalOfferRef === 'string'
    && typeof row.quantity === 'number'
    && typeof row.destinationCountry === 'string'
    && typeof row.idempotencyKey === 'string'
    && typeof row.correlationId === 'string'
    && row.interfaceVersion === SUPPLIER_SHIPPING_INTERFACE_VERSION;
}

function toPersistableQuotes(quotes: SupplierShippingQuote[]): Array<Record<string, unknown>> {
  return quotes.map((quote) => ({
    serviceRef: quote.serviceRef,
    amountMinor: quote.amountMinor,
    currency: quote.currency,
    estimatedDispatchAt: quote.estimatedDispatchAt ?? null,
    estimatedDeliveryFrom: quote.estimatedDeliveryFrom ?? null,
    estimatedDeliveryTo: quote.estimatedDeliveryTo ?? null,
  }));
}

async function recordResult(
  client: SupabaseClient,
  requestId: string,
  resultClass: string,
  quotes: SupplierShippingQuote[] | null,
  errorClass?: string,
  errorMessage?: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('server_record_supplier_shipping_quote_result_v1', {
    p_request_id: requestId,
    p_result_class: resultClass,
    p_quotes: quotes ? toPersistableQuotes(quotes) : [],
    p_error_class: errorClass ?? null,
    p_error_message: errorMessage ?? null,
  });
  return !error && !!data && typeof data === 'object' && (data as { ok?: unknown }).ok === true;
}

/**
 * Executes exactly one provider-neutral shipping quote attempt against the adapter
 * version selected by the database. Unsupported/mismatched adapters fail closed.
 */
export async function quoteSupplierShipping(
  client: SupabaseClient,
  adapter: SupplierAdapterV1,
  input: {
    publicProductId: string;
    quantity: number;
    destinationCountry: string;
    idempotencyKey: string;
    correlationId: string;
  },
): Promise<SupplierShippingRuntimeResult> {
  const { data: rawPrepared, error: prepareError } = await client.rpc('server_prepare_supplier_shipping_quote_v1', {
    p_public_product_id: input.publicProductId,
    p_quantity: input.quantity,
    p_destination_country: input.destinationCountry,
    p_idempotency_key: input.idempotencyKey,
    p_correlation_id: input.correlationId,
  });
  if (prepareError || !isPrepared(rawPrepared)) {
    const reason = rawPrepared && typeof rawPrepared === 'object' && typeof (rawPrepared as { reason?: unknown }).reason === 'string'
      ? String((rawPrepared as { reason: string }).reason)
      : 'supplier_shipping_not_ready';
    return { ok: false, reason };
  }
  const prepared = rawPrepared;

  if (
    adapter.interfaceVersion !== SUPPLIER_SHIPPING_INTERFACE_VERSION
    || adapter.providerKey !== prepared.providerKey
    || adapter.adapterVersion !== prepared.adapterVersion
    || !adapterSupports(adapter, 'shipping')
    || !adapter.quoteShipping
  ) {
    await recordResult(
      client,
      prepared.requestId,
      'CAPABILITY_UNAVAILABLE',
      null,
      'CAPABILITY_UNAVAILABLE',
      'adapter identity/capability mismatch',
    );
    return {
      ok: false,
      requestId: prepared.requestId,
      reason: 'supplier_shipping_adapter_mismatch',
      errorClass: 'ADAPTER_IDENTITY_MISMATCH',
    };
  }

  const context: SupplierAdapterContext = {
    correlationId: prepared.correlationId,
    idempotencyKey: prepared.idempotencyKey,
    supplierKey: prepared.supplierKey,
    territory: prepared.destinationCountry,
  };

  try {
    const result = await adapter.quoteShipping(context, {
      externalOfferRef: prepared.externalOfferRef,
      quantity: prepared.quantity,
      destinationCountry: prepared.destinationCountry,
    });
    if (!result.ok) {
      await recordResult(
        client,
        prepared.requestId,
        result.errorClass,
        null,
        result.errorClass,
        result.message,
      );
      return {
        ok: false,
        requestId: prepared.requestId,
        reason: 'supplier_shipping_provider_failure',
        errorClass: result.errorClass,
      };
    }

    if (!Array.isArray(result.data) || result.data.length === 0) {
      await recordResult(
        client,
        prepared.requestId,
        'MALFORMED_RESPONSE',
        null,
        'MALFORMED_RESPONSE',
        'provider returned no shipping services',
      );
      return {
        ok: false,
        requestId: prepared.requestId,
        reason: 'supplier_shipping_provider_returned_no_quotes',
        errorClass: 'MALFORMED_RESPONSE',
      };
    }

    const persisted = await recordResult(client, prepared.requestId, 'SUCCESS', result.data);
    if (!persisted) {
      return { ok: false, requestId: prepared.requestId, reason: 'supplier_shipping_quote_persistence_failed' };
    }
    return { ok: true, requestId: prepared.requestId, quotes: result.data };
  } catch (error) {
    await recordResult(
      client,
      prepared.requestId,
      'UNKNOWN_OUTCOME',
      null,
      'UNKNOWN_OUTCOME',
      error instanceof Error ? error.message : 'shipping provider call threw',
    );
    return {
      ok: false,
      requestId: prepared.requestId,
      reason: 'supplier_shipping_unknown_outcome',
      errorClass: 'UNKNOWN_OUTCOME',
    };
  }
}

export async function selectSupplierShippingQuote(
  client: SupabaseClient,
  input: {
    requestId: string;
    serviceRef: string;
    decisionKey: string;
    evidence: Record<string, unknown>;
  },
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('server_select_supplier_shipping_quote_v1', {
    p_request_id: input.requestId,
    p_service_ref: input.serviceRef,
    p_decision_key: input.decisionKey,
    p_evidence: input.evidence,
  });
  if (error || !data || typeof data !== 'object' || (data as { ok?: unknown }).ok !== true) return null;
  return data as Record<string, unknown>;
}
