export interface AutonomousKillSwitchState {
  version: number;
  global: boolean;
  providers: string[];
  capabilities: string[];
}

export type AutonomousKillSwitchReason =
  | 'RECORD_KILL_SWITCH'
  | 'GLOBAL_KILL_SWITCH'
  | 'PROVIDER_KILL_SWITCH'
  | 'CAPABILITY_KILL_SWITCH';

export interface AutonomousKillSwitchDecision {
  active: boolean;
  reasons: AutonomousKillSwitchReason[];
}

function normalize(value: string, field: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

export function capabilityKillSwitchKey(provider: string, capability: string): string {
  return `${normalize(provider, 'provider')}:${normalize(capability, 'capability')}`;
}

/**
 * Resolves the complete kill-switch hierarchy without performing any mutation.
 * A record-local switch, global switch, provider switch or exact capability
 * switch independently blocks autonomous execution.
 */
export function resolveAutonomousKillSwitch(input: {
  provider: string;
  capability: string;
  recordKillSwitchActive?: boolean;
  state?: AutonomousKillSwitchState;
}): AutonomousKillSwitchDecision {
  const provider = normalize(input.provider, 'provider');
  const capability = normalize(input.capability, 'capability');
  const state = input.state ?? {
    version: 1,
    global: false,
    providers: [],
    capabilities: [],
  };

  if (!Number.isSafeInteger(state.version) || state.version <= 0) {
    throw new Error('kill-switch version must be a positive integer');
  }

  const providers = new Set(state.providers.map(value => normalize(value, 'kill-switch provider')));
  const capabilities = new Set(state.capabilities.map((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalized.includes(':')) {
      throw new Error('kill-switch capability must use provider:capability');
    }
    return normalized;
  }));

  const reasons: AutonomousKillSwitchReason[] = [];
  if (input.recordKillSwitchActive) reasons.push('RECORD_KILL_SWITCH');
  if (state.global) reasons.push('GLOBAL_KILL_SWITCH');
  if (providers.has(provider)) reasons.push('PROVIDER_KILL_SWITCH');
  if (capabilities.has(`${provider}:${capability}`)) reasons.push('CAPABILITY_KILL_SWITCH');

  return {
    active: reasons.length > 0,
    reasons,
  };
}
