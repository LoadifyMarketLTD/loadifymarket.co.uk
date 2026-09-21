import type { SupabaseClient } from '@supabase/supabase-js';
import { DIRECT_SUPPLIER_ONBOARDING_VERSION, type DirectSupplierOnboardingManifestV1 } from './directSupplierOnboarding';
import type {
  DirectSupplierFeedTransport,
  DirectSupplierSourceFormat,
} from './directSupplierContract';
import {
  normalizeDirectSupplierSource,
} from './directSupplierTransportNormalizer';
import {
  prepareDirectSupplierFeedForStaging,
} from './directSupplierFeedAdmission';
import {
  computeDirectSupplierStagingBatchDigest,
} from './directSupplierPersistence';
import {
  resolveSupplierAcquisitionConfig,
  type SupplierAcquisitionConfig,
} from './supplierAcquisitionConfig';
import {
  acquireSupplierPayload,
  type SupplierAcquisitionFetchResult,
} from './supplierRemoteAcquisition';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

type Trigger = 'manual' | 'scheduled';

interface AcquisitionContext {
  eligible: boolean;
  reason: string;
  supplierId?: string;
  supplierKey?: string;
  legalName?: string;
  registrationCountry?: string;
  warehouseRefs?: unknown[];
  supportedTerritories?: unknown[];
  requestedCapabilities?: unknown[];
  transport?: DirectSupplierFeedTransport;
  sourceFormat?: DirectSupplierSourceFormat;
  configRef?: string;
  blockers?: unknown[];
  interfaceVersion?: number;
}

interface RunStart {
  runId: string;
}

export type SupplierAcquisitionRuntimeResult =
  | {
      ok: true;
      runId: string;
      supplierKey: string;
      batchId: string;
      duplicate: boolean;
      acceptedCount: number;
      quarantinedCount: number;
      payloadBytes: number;
      normalizedRecords: number;
      commercialActivationPerformed: false;
      capabilityPromotionPerformed: false;
      marketplaceListingPerformed: false;
    }
  | {
      ok: false;
      code: string;
      error: string;
      runId?: string;
      blockers?: string[];
      commercialActivationPerformed: false;
      capabilityPromotionPerformed: false;
      marketplaceListingPerformed: false;
    };

function failure(code: string, error: string, runId?: string, blockers?: string[]): SupplierAcquisitionRuntimeResult {
  return {
    ok: false,
    code,
    error,
    runId,
    blockers,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean)
    : [];
}

function parseContext(value: unknown): AcquisitionContext | null {
  if (!isRecord(value) || value.interfaceVersion !== 1 || typeof value.eligible !== 'boolean' || typeof value.reason !== 'string') {
    return null;
  }
  return value as unknown as AcquisitionContext;
}

function parseRunStart(value: unknown): RunStart | null {
  if (!isRecord(value) || value.ok !== true || value.interfaceVersion !== 1 || typeof value.runId !== 'string') return null;
  return { runId: value.runId };
}

function parsePersistence(value: unknown): {
  batchId: string;
  duplicate: boolean;
  acceptedCount: number;
  quarantinedCount: number;
} | null {
  if (
    !isRecord(value)
    || value.interfaceVersion !== 1
    || typeof value.batchId !== 'string'
    || typeof value.duplicate !== 'boolean'
    || typeof value.acceptedCount !== 'number'
    || typeof value.quarantinedCount !== 'number'
    || value.commercialActivationPerformed !== false
    || value.capabilityPromotionPerformed !== false
    || value.marketplaceListingPerformed !== false
  ) {
    return null;
  }
  return {
    batchId: value.batchId,
    duplicate: value.duplicate,
    acceptedCount: value.acceptedCount,
    quarantinedCount: value.quarantinedCount,
  };
}

function warehouseRefs(value: unknown): DirectSupplierOnboardingManifestV1['warehouseDeclarations'] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const externalWarehouseRef = typeof item.externalWarehouseRef === 'string' ? item.externalWarehouseRef.trim() : '';
    const country = typeof item.country === 'string' ? item.country.trim().toUpperCase() : '';
    return externalWarehouseRef && /^[A-Z]{2}$/.test(country)
      ? [{ externalWarehouseRef, country }]
      : [];
  });
}

function createManifest(context: AcquisitionContext): DirectSupplierOnboardingManifestV1 | null {
  if (
    !context.supplierKey
    || !context.legalName
    || !context.registrationCountry
    || !context.transport
    || !context.sourceFormat
  ) {
    return null;
  }
  const warehouses = warehouseRefs(context.warehouseRefs);
  const territories = strings(context.supportedTerritories).map(item => item.toUpperCase());
  const capabilities = strings(context.requestedCapabilities);
  if (warehouses.length === 0 || territories.length === 0 || capabilities.length === 0) return null;

  return {
    onboardingVersion: DIRECT_SUPPLIER_ONBOARDING_VERSION,
    supplierKey: context.supplierKey,
    legalName: context.legalName,
    registrationCountry: context.registrationCountry.toUpperCase(),
    feedTransport: context.transport,
    sourceFormat: context.sourceFormat,
    warehouseDeclarations: warehouses,
    supportedTerritories: territories,
    requestedCapabilities: capabilities,
    commercialApproval: false,
    hostedActivation: 'off',
  };
}

async function finishRun(
  client: RpcClient,
  runId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await client.rpc('server_supplier_acquisition_run_v1', {
      p_action: 'finish',
      p_payload: { runId, ...payload },
    });
  } catch {
    // Audit completion is best-effort after the primary operation has already failed.
  }
}

function configMatchesContext(config: SupplierAcquisitionConfig, context: AcquisitionContext): boolean {
  return (
    config.supplierKey === context.supplierKey
    && config.transport === context.transport
    && config.sourceFormat === context.sourceFormat
  );
}

export async function runSupplierAcquisition(input: {
  supabase: RpcClient;
  supplierKey: string;
  trigger: Trigger;
  actorId?: string;
  now?: Date;
  acquire?: (config: SupplierAcquisitionConfig, now?: Date) => Promise<SupplierAcquisitionFetchResult>;
}): Promise<SupplierAcquisitionRuntimeResult> {
  const supplierKey = input.supplierKey.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(supplierKey)) {
    return failure('SUPPLIER_KEY_INVALID', 'Supplier key is invalid');
  }

  const { data: contextData, error: contextError } = await input.supabase.rpc(
    'server_supplier_acquisition_context_v1',
    {
      p_supplier_key: supplierKey,
      p_trigger: input.trigger,
    },
  );
  if (contextError) return failure('ACQUISITION_CONTEXT_FAILED', 'Supplier acquisition context could not be evaluated');

  const context = parseContext(contextData);
  if (!context) return failure('ACQUISITION_CONTEXT_INVALID', 'Supplier acquisition context returned an invalid result');
  if (!context.eligible) {
    return failure(
      'ACQUISITION_BLOCKED',
      'Supplier acquisition is blocked by governance',
      undefined,
      strings(context.blockers),
    );
  }
  if (!context.supplierId || !context.configRef || !context.transport || !context.sourceFormat) {
    return failure('ACQUISITION_CONTEXT_INCOMPLETE', 'Supplier acquisition context is incomplete');
  }

  const manifest = createManifest(context);
  if (!manifest) return failure('ACQUISITION_MANIFEST_INVALID', 'Supplier acquisition manifest could not be reconstructed');

  const configResult = resolveSupplierAcquisitionConfig(context.configRef);
  if (!configResult.ok) return failure(configResult.code, configResult.error);
  if (!configMatchesContext(configResult.config, context)) {
    return failure('CONFIG_BINDING_MISMATCH', 'Server acquisition config does not match supplier profile');
  }

  const { data: runStartData, error: runStartError } = await input.supabase.rpc(
    'server_supplier_acquisition_run_v1',
    {
      p_action: 'start',
      p_payload: {
        supplierId: context.supplierId,
        actorId: input.actorId ?? null,
        trigger: input.trigger,
        transport: context.transport,
        sourceFormat: context.sourceFormat,
        configRef: context.configRef,
      },
    },
  );
  if (runStartError) return failure('RUN_AUDIT_START_FAILED', 'Supplier acquisition audit could not be started');
  const started = parseRunStart(runStartData);
  if (!started) return failure('RUN_AUDIT_START_INVALID', 'Supplier acquisition audit returned an invalid start result');

  const now = input.now ?? new Date();
  const acquire = input.acquire ?? acquireSupplierPayload;
  const acquired = await acquire(configResult.config, now);
  if (!acquired.ok) {
    await finishRun(input.supabase, started.runId, {
      status: 'failed',
      errorCode: acquired.code,
      errorSummary: acquired.error,
    });
    return failure(acquired.code, acquired.error, started.runId);
  }

  const normalized = normalizeDirectSupplierSource({
    supplierKey,
    generatedAt: acquired.payload.generatedAt,
    transport: context.transport,
    sourceFormat: context.sourceFormat,
    rawPayload: acquired.payload.rawPayload,
    fieldMap: configResult.config.fieldMap,
    amountUnit: configResult.config.amountUnit,
    minorUnitDigits: configResult.config.minorUnitDigits,
    xmlRecordElement: configResult.config.xmlRecordElement,
  });
  if (!normalized.ok) {
    const error = normalized.errors.slice(0, 10).join('; ');
    await finishRun(input.supabase, started.runId, {
      status: 'failed',
      payloadBytes: acquired.payload.payloadBytes,
      sourceDigest: acquired.payload.sourceDigest,
      remoteEtag: acquired.payload.remoteEtag,
      remoteLastModified: acquired.payload.remoteLastModified,
      errorCode: 'NORMALIZATION_REJECTED',
      errorSummary: error,
    });
    return failure('NORMALIZATION_REJECTED', error, started.runId);
  }

  const admission = prepareDirectSupplierFeedForStaging({
    manifest,
    batch: normalized.batch,
  });
  if (!admission.ok) {
    const error = admission.batchErrors.slice(0, 10).join('; ');
    await finishRun(input.supabase, started.runId, {
      status: 'blocked',
      payloadBytes: acquired.payload.payloadBytes,
      normalizedRecords: normalized.recordCount,
      sourceDigest: acquired.payload.sourceDigest,
      remoteEtag: acquired.payload.remoteEtag,
      remoteLastModified: acquired.payload.remoteLastModified,
      errorCode: 'FEED_ADMISSION_REJECTED',
      errorSummary: error,
    });
    return failure('FEED_ADMISSION_REJECTED', error, started.runId);
  }

  const batchDigest = computeDirectSupplierStagingBatchDigest({
    batch: normalized.batch,
    accepted: admission.accepted,
    quarantined: admission.quarantined,
  });
  const { data: persistData, error: persistError } = await input.supabase.rpc(
    'server_persist_direct_supplier_feed_v1',
    {
      p_supplier_key: supplierKey,
      p_source_generated_at: normalized.batch.generatedAt,
      p_source_transport: normalized.batch.transport,
      p_source_batch_digest: batchDigest,
      p_candidates: admission.accepted,
      p_quarantined: admission.quarantined,
    },
  );
  if (persistError) {
    await finishRun(input.supabase, started.runId, {
      status: 'failed',
      payloadBytes: acquired.payload.payloadBytes,
      normalizedRecords: normalized.recordCount,
      acceptedRecords: admission.accepted.length,
      quarantinedRecords: admission.quarantined.length,
      sourceDigest: acquired.payload.sourceDigest,
      remoteEtag: acquired.payload.remoteEtag,
      remoteLastModified: acquired.payload.remoteLastModified,
      errorCode: 'STAGING_PERSIST_FAILED',
      errorSummary: 'Supplier durable staging failed',
    });
    return failure('STAGING_PERSIST_FAILED', 'Supplier durable staging failed', started.runId);
  }

  const persisted = parsePersistence(persistData);
  if (!persisted) {
    await finishRun(input.supabase, started.runId, {
      status: 'failed',
      errorCode: 'STAGING_PERSIST_INVALID',
      errorSummary: 'Supplier durable staging returned an invalid result',
    });
    return failure('STAGING_PERSIST_INVALID', 'Supplier durable staging returned an invalid result', started.runId);
  }

  await finishRun(input.supabase, started.runId, {
    status: 'succeeded',
    payloadBytes: acquired.payload.payloadBytes,
    normalizedRecords: normalized.recordCount,
    acceptedRecords: admission.accepted.length,
    quarantinedRecords: admission.quarantined.length,
    sourceDigest: acquired.payload.sourceDigest,
    remoteEtag: acquired.payload.remoteEtag,
    remoteLastModified: acquired.payload.remoteLastModified,
  });

  return {
    ok: true,
    runId: started.runId,
    supplierKey,
    batchId: persisted.batchId,
    duplicate: persisted.duplicate,
    acceptedCount: persisted.acceptedCount,
    quarantinedCount: persisted.quarantinedCount,
    payloadBytes: acquired.payload.payloadBytes,
    normalizedRecords: normalized.recordCount,
    commercialActivationPerformed: false,
    capabilityPromotionPerformed: false,
    marketplaceListingPerformed: false,
  };
}
