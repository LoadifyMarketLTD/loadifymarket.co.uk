import {
  canDiscloseCustomerPii,
  canPerformExternalMutation,
  type AutonomyLevel,
  type ProviderCapabilityRecord,
} from './autonomousOperationsFoundation';
import {
  resolveAutonomousKillSwitch,
  type AutonomousKillSwitchReason,
  type AutonomousKillSwitchState,
} from './autonomousKillSwitch';

export type ProviderCapabilityAvailability = 'available' | 'manual_only' | 'unavailable';

export type ProviderCapabilityResolutionReason =
  | 'CAPABILITY_AVAILABLE'
  | 'CAPABILITY_NOT_REGISTERED'
  | 'CAPABILITY_UNVERIFIED'
  | 'CAPABILITY_KILL_SWITCHED';

export interface ProviderCapabilityResolution {
  found: boolean;
  provider: string;
  capability: string;
  availability: ProviderCapabilityAvailability;
  reason: ProviderCapabilityResolutionReason;
  record: ProviderCapabilityRecord | null;
  effectiveAutonomyLevel: AutonomyLevel;
  readAllowed: boolean;
  externalMutationAllowed: boolean;
  piiDisclosureAllowed: boolean;
  killSwitchReasons: AutonomousKillSwitchReason[];
}

export interface ProviderCapabilityRegistry {
  readonly size: number;
  get(provider: string, capability: string): ProviderCapabilityRecord | null;
  resolve(input: {
    provider: string;
    capability: string;
    killSwitchState?: AutonomousKillSwitchState;
    now?: Date;
  }): ProviderCapabilityResolution;
  list(): ProviderCapabilityRecord[];
}

function normalized(value: string, field: string): string {
  const output = value.trim().toLowerCase();
  if (!output) throw new Error(`${field} is required`);
  return output;
}

function registryKey(provider: string, capability: string): string {
  return `${normalized(provider, 'provider')}:${normalized(capability, 'capability')}`;
}

function validateRecord(record: ProviderCapabilityRecord): ProviderCapabilityRecord {
  const provider = normalized(record.provider, 'provider');
  const capability = normalized(record.capability, 'capability');

  if (record.verified && record.verificationStatus === 'unverified') {
    throw new Error(`verified capability ${provider}:${capability} cannot have unverified status`);
  }
  if (!record.verified && (record.writeAllowed || record.piiAllowed)) {
    throw new Error(`unverified capability ${provider}:${capability} cannot grant write or PII access`);
  }
  if (record.piiAllowed && !record.writeAllowed) {
    throw new Error(`PII capability ${provider}:${capability} requires write permission`);
  }
  if (record.autonomyLevel === 'auto_external' && !record.writeAllowed) {
    throw new Error(`auto_external capability ${provider}:${capability} requires write permission`);
  }

  return Object.freeze({
    ...record,
    provider,
    capability,
  });
}

/**
 * Creates the single provider-capability truth used by the autonomy layer.
 * Missing capabilities resolve to UNAVAILABLE; callers may not infer support
 * from provider names, adapters, documentation snippets or previous behaviour.
 */
export function createProviderCapabilityRegistry(
  records: ProviderCapabilityRecord[],
): ProviderCapabilityRegistry {
  const index = new Map<string, ProviderCapabilityRecord>();

  for (const source of records) {
    const record = validateRecord(source);
    const key = registryKey(record.provider, record.capability);
    if (index.has(key)) throw new Error(`duplicate provider capability: ${key}`);
    index.set(key, record);
  }

  return Object.freeze({
    size: index.size,

    get(provider: string, capability: string): ProviderCapabilityRecord | null {
      return index.get(registryKey(provider, capability)) ?? null;
    },

    resolve(input): ProviderCapabilityResolution {
      const provider = normalized(input.provider, 'provider');
      const capability = normalized(input.capability, 'capability');
      const record = index.get(`${provider}:${capability}`) ?? null;

      if (!record) {
        return {
          found: false,
          provider,
          capability,
          availability: 'unavailable',
          reason: 'CAPABILITY_NOT_REGISTERED',
          record: null,
          effectiveAutonomyLevel: 'disabled',
          readAllowed: false,
          externalMutationAllowed: false,
          piiDisclosureAllowed: false,
          killSwitchReasons: [],
        };
      }

      const killSwitch = resolveAutonomousKillSwitch({
        provider,
        capability,
        recordKillSwitchActive: record.killSwitchActive,
        state: input.killSwitchState,
      });

      if (killSwitch.active) {
        return {
          found: true,
          provider,
          capability,
          availability: 'manual_only',
          reason: 'CAPABILITY_KILL_SWITCHED',
          record,
          effectiveAutonomyLevel: 'human_approval',
          readAllowed: record.readAllowed,
          externalMutationAllowed: false,
          piiDisclosureAllowed: false,
          killSwitchReasons: killSwitch.reasons,
        };
      }

      if (!record.verified) {
        return {
          found: true,
          provider,
          capability,
          availability: 'unavailable',
          reason: 'CAPABILITY_UNVERIFIED',
          record,
          effectiveAutonomyLevel: 'disabled',
          readAllowed: false,
          externalMutationAllowed: false,
          piiDisclosureAllowed: false,
          killSwitchReasons: [],
        };
      }

      const now = input.now ?? new Date();
      return {
        found: true,
        provider,
        capability,
        availability: 'available',
        reason: 'CAPABILITY_AVAILABLE',
        record,
        effectiveAutonomyLevel: record.autonomyLevel,
        readAllowed: record.readAllowed,
        externalMutationAllowed: canPerformExternalMutation(record, now),
        piiDisclosureAllowed: canDiscloseCustomerPii(record, now),
        killSwitchReasons: [],
      };
    },

    list(): ProviderCapabilityRecord[] {
      return [...index.values()].map(record => ({ ...record }));
    },
  });
}
