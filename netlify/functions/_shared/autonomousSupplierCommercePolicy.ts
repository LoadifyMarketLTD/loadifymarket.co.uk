export const AUTONOMOUS_SUPPLIER_COMMERCE_POLICY_VERSION = 1 as const;

export type AutonomousSupplierCommerceMode = 'disabled' | 'observe' | 'read_only';

export interface AutonomousSupplierCommercePolicy {
  policyVersion: typeof AUTONOMOUS_SUPPLIER_COMMERCE_POLICY_VERSION;
  mode: AutonomousSupplierCommerceMode;
  enabled: boolean;
  providerReadsAllowed: boolean;
  observationWritesAllowed: boolean;
  proactiveCustomerNotificationsAllowed: boolean;
  carrierCaseCreationAllowed: boolean;
  returnLabelRequestsAllowed: boolean;
  supplierOrderSubmissionAllowed: false;
  customerPiiDisclosureAllowed: false;
  marketplacePublicationAllowed: false;
  capabilityPromotionAllowed: false;
  paymentMutationAllowed: false;
  automaticRefundExecutionAllowed: false;
}

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function parseMode(value: string | undefined): AutonomousSupplierCommerceMode {
  const mode = value?.trim().toLowerCase();
  if (mode === 'observe' || mode === 'read_only') return mode;
  return 'disabled';
}

/**
 * Runtime kill-switch for the autonomous commerce workstream.
 *
 * The default state is deliberately inert. Even when the engine is enabled,
 * commercial writes, Orders/PII, marketplace publication and payment/refund
 * execution remain impossible through this policy surface.
 */
export function resolveAutonomousSupplierCommercePolicy(
  env: Record<string, string | undefined> = process.env,
): AutonomousSupplierCommercePolicy {
  const requestedMode = parseMode(env.AUTONOMOUS_SUPPLIER_COMMERCE_MODE);
  const engineEnabled = enabled(env.AUTONOMOUS_SUPPLIER_COMMERCE_ENABLED);
  const mode: AutonomousSupplierCommerceMode = engineEnabled ? requestedMode : 'disabled';
  const active = mode !== 'disabled';

  return {
    policyVersion: AUTONOMOUS_SUPPLIER_COMMERCE_POLICY_VERSION,
    mode,
    enabled: active,
    providerReadsAllowed: active && mode === 'read_only' && enabled(env.AUTONOMOUS_SUPPLIER_PROVIDER_READS_ENABLED),
    observationWritesAllowed: active && enabled(env.AUTONOMOUS_SUPPLIER_OBSERVATION_WRITES_ENABLED),
    proactiveCustomerNotificationsAllowed: active && enabled(env.AUTONOMOUS_CUSTOMER_NOTIFICATIONS_ENABLED),
    carrierCaseCreationAllowed: active && enabled(env.AUTONOMOUS_CARRIER_CASES_ENABLED),
    returnLabelRequestsAllowed: active && enabled(env.AUTONOMOUS_RETURN_LABEL_REQUESTS_ENABLED),
    supplierOrderSubmissionAllowed: false,
    customerPiiDisclosureAllowed: false,
    marketplacePublicationAllowed: false,
    capabilityPromotionAllowed: false,
    paymentMutationAllowed: false,
    automaticRefundExecutionAllowed: false,
  };
}
