import { createClient } from '@supabase/supabase-js';
import type { Handler } from '@netlify/functions';
import { authenticateActiveAccount } from './_shared/activeAccountAuth';
import { jsonResponse, optionsResponse } from './_shared/http';
import { resolveSupplierAcquisitionConfig } from './_shared/supplierAcquisitionConfig';
import { deriveSupplierHealthFromControlCentre } from './_shared/supplierHealthSnapshot';

const METHODS = 'POST, OPTIONS';

interface Body {
  supplierKey?: string;
  territory?: string;
}

type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;

const text = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const bool = (value: unknown): boolean => value === true;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return optionsResponse(METHODS);
  if (event.httpMethod !== 'POST') return jsonResponse(405, { error: 'Method not allowed' }, METHODS);

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse(500, { error: 'Server configuration error' }, METHODS);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const auth = await authenticateActiveAccount(event, admin, ['admin']);
  if (!auth.ok) return jsonResponse(auth.status, { error: 'Unauthorized' }, METHODS);

  let body: Body;
  try { body = JSON.parse(event.body || '{}') as Body; }
  catch { return jsonResponse(400, { error: 'Invalid JSON body' }, METHODS); }

  const supplierKey = text(body.supplierKey).toLowerCase();
  const territory = text(body.territory || 'GB').toUpperCase();
  if (!supplierKey) return jsonResponse(400, { error: 'supplierKey is required' }, METHODS);
  if (!/^[A-Z]{2}$/.test(territory)) return jsonResponse(400, { error: 'territory must be a two-letter country code' }, METHODS);

  const { data: onboardingData, error: onboardingError } = await admin.rpc(
    'server_supplier_onboarding_readiness_v1',
    { p_actor_id: auth.actor.id, p_supplier_key: supplierKey, p_territory: territory },
  );
  if (onboardingError) {
    console.error('admin-first-supplier-launch-gate: onboarding readiness failed', onboardingError.message);
    return jsonResponse(500, { error: 'Unable to evaluate supplier onboarding readiness' }, METHODS);
  }

  const onboarding = record(onboardingData) ?? {};
  const supplierId = text(onboarding.supplierId);
  const onboardingEligible = bool(onboarding.eligible);
  const feedTransport = text(onboarding.feedTransport);

  const { data: acquisitionData, error: acquisitionError } = await admin.rpc(
    'server_supplier_acquisition_context_v1',
    { p_supplier_key: supplierKey, p_trigger: 'manual' },
  );
  if (acquisitionError) {
    console.error('admin-first-supplier-launch-gate: acquisition context failed', acquisitionError.message);
    return jsonResponse(500, { error: 'Unable to evaluate supplier acquisition readiness' }, METHODS);
  }

  const acquisition = record(acquisitionData) ?? {};
  const manualCatalogue = feedTransport === 'manual_catalog';
  let configPreflight: JsonRecord = {
    required: !manualCatalogue,
    ready: manualCatalogue,
    reason: manualCatalogue ? 'manual_catalog_route' : 'not_evaluated',
    secretMaterialReturned: false,
    externalAccessPerformed: false,
  };

  if (!manualCatalogue) {
    const configRef = text(acquisition.configRef);
    const transport = text(acquisition.transport);
    const sourceFormat = text(acquisition.sourceFormat);
    const resolved = configRef ? resolveSupplierAcquisitionConfig(configRef) : null;

    if (!resolved) {
      configPreflight = {
        required: true,
        ready: false,
        reason: 'config_reference_missing',
        secretMaterialReturned: false,
        externalAccessPerformed: false,
      };
    } else if (!resolved.ok) {
      configPreflight = {
        required: true,
        ready: false,
        reason: resolved.code,
        secretMaterialReturned: false,
        externalAccessPerformed: false,
      };
    } else {
      const bound = (
        resolved.config.supplierKey === supplierKey
        && resolved.config.transport === transport
        && resolved.config.sourceFormat === sourceFormat
      );
      configPreflight = {
        required: true,
        ready: bound,
        reason: bound ? 'config_bound' : 'config_binding_mismatch',
        binding: {
          supplierKeyMatches: resolved.config.supplierKey === supplierKey,
          transportMatches: resolved.config.transport === transport,
          sourceFormatMatches: resolved.config.sourceFormat === sourceFormat,
        },
        secretMaterialReturned: false,
        externalAccessPerformed: false,
      };
    }
  }

  let health: JsonRecord | null = null;
  if (supplierId) {
    const { data: controlCentreData, error: controlCentreError } = await admin.rpc(
      'server_admin_supplier_control_centre_v1',
      { p_actor_id: auth.actor.id, p_supplier_id: supplierId, p_provider_ref: null },
    );
    if (!controlCentreError) {
      try {
        health = deriveSupplierHealthFromControlCentre({
          result: controlCentreData,
          providerRef: null,
        }) as unknown as JsonRecord | null;
      } catch (caught) {
        console.error(
          'admin-first-supplier-launch-gate: health derivation failed',
          caught instanceof Error ? caught.message : 'unknown error',
        );
      }
    }
  }

  const { data: pilotData, error: pilotError } = await admin.rpc(
    'server_admin_supplier_pilot_status_v1',
    { p_actor_id: auth.actor.id, p_pilot_id: null },
  );
  if (pilotError) {
    console.error('admin-first-supplier-launch-gate: pilot status failed', pilotError.message);
    return jsonResponse(500, { error: 'Unable to evaluate controlled pilot status' }, METHODS);
  }

  const pilot = record(pilotData) ?? {};
  const pilotExists = bool(pilot.exists);
  const pilotSupplierId = text(pilot.supplierId);
  const pilotMatchesSupplier = Boolean(supplierId) && pilotExists && pilotSupplierId === supplierId;
  const pilotReadiness = record(pilot.readiness) ?? {};
  const pilotAcceptance = record(pilot.acceptance) ?? {};
  const activationReady = pilotMatchesSupplier && bool(pilotReadiness.ready);
  const acceptancePassed = pilotMatchesSupplier && bool(pilotAcceptance.passed);

  const phase7Blockers = unique([
    ...stringArray(onboarding.blockers),
    ...stringArray(acquisition.blockers),
    ...(bool(configPreflight.ready) ? [] : [text(configPreflight.reason) || 'acquisition_config_not_ready']),
  ]);

  const phase7Passed = onboardingEligible
    && (manualCatalogue || bool(acquisition.eligible))
    && bool(configPreflight.ready);

  const phase8Blockers = unique([
    ...(!pilotExists ? ['controlled_pilot_missing'] : []),
    ...(pilotExists && !pilotMatchesSupplier ? ['latest_pilot_supplier_mismatch'] : []),
    ...(pilotMatchesSupplier && !activationReady ? ['pilot_activation_readiness_not_passed'] : []),
    ...(pilotMatchesSupplier && !acceptancePassed ? ['pilot_acceptance_not_passed'] : []),
  ]);

  return jsonResponse(200, {
    ok: true,
    supplierKey,
    supplierId: supplierId || null,
    territory,
    overallStatus: acceptancePassed ? 'PASS' : 'HOLD',
    phase7: {
      name: 'First real supplier readiness',
      passed: phase7Passed,
      onboardingEligible,
      acquisitionEligible: manualCatalogue ? null : bool(acquisition.eligible),
      manualCatalogueRoute: manualCatalogue,
      configPreflight,
      blockers: phase7Blockers,
    },
    phase8: {
      name: 'Controlled pilot acceptance',
      passed: acceptancePassed,
      pilotExists,
      pilotId: pilotExists ? text(pilot.pilotId) || null : null,
      pilotMatchesSupplier,
      activationReady,
      acceptancePassed,
      globalSupplierCommerceEnabled: bool(pilot.globalSupplierCommerceEnabled),
      pilotControlEnabled: bool(pilot.pilotControlEnabled),
      blockers: phase8Blockers,
    },
    onboarding: {
      lifecycleStatus: onboarding.lifecycleStatus ?? null,
      onboardingStatus: onboarding.onboardingStatus ?? null,
      feedTransport: onboarding.feedTransport ?? null,
      missingQualificationEvidence: onboarding.missingQualificationEvidence ?? [],
      missingCapabilityEvidence: onboarding.missingCapabilityEvidence ?? [],
      activeSlaVersion: onboarding.activeSlaVersion ?? null,
      complianceVersion: onboarding.complianceVersion ?? null,
      activeCatalogAdapterCount: onboarding.activeCatalogAdapterCount ?? 0,
    },
    acquisition: {
      reason: acquisition.reason ?? null,
      mode: acquisition.acquisitionMode ?? null,
      transport: acquisition.transport ?? null,
      sourceFormat: acquisition.sourceFormat ?? null,
    },
    health,
    evidencePolicy: {
      authenticSupplierEvidenceRequired: true,
      syntheticEvidenceAccepted: false,
      simulatorPassIsPilotPass: false,
      commercialActivationPerformed: false,
      marketplaceListingPerformed: false,
      externalMutationPerformed: false,
    },
  }, METHODS);
};
