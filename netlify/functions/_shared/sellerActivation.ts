/**
 * Shared seller auto-activation helper.
 *
 * A seller's account becomes ACTIVE only when ALL of the following are true:
 *   1. Their live public.users row has role = 'seller' and isActive = true
 *   2. Profile is complete for the seller's legal/profile type:
 *      - individual: phone + address postcode (personal identity lives on public.users)
 *      - sole trader/company/legacy: business/store name + phone + postcode
 *      - company: companyRegistrationNumber is additionally required
 *      - VAT number is required only when VAT registration is declared
 *   3. Stripe Connect account exists (stripeAccountId present)
 *   4. Stripe account is fully ready: stripeConnectStatus = 'active'
 *      (which maps to charges_enabled=true AND payouts_enabled=true)
 *   5. sellerStatus is NOT 'suspended' (admin suspension is sticky)
 *   6. If requiresAdminApproval = true, isApproved must also be true
 *
 * Stripe is used as a technical readiness signal only.
 * It is NOT used for identity verification or as a compliance claim.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SellerProfileSnapshot {
  userId: string;
  sellerStatus: string;
  activatedAt?: string | null;
  storeName?: string | null;
  businessName?: string | null;
  contactPhone?: string | null;
  businessAddress?: { postcode?: string } | null;
  stripeAccountId?: string | null;
  stripeConnectStatus?: string | null;
  /** Captured at registration: 'individual' | 'sole_trader' | 'company' */
  sellerType?: string | null;
  /** Required for company sellers to satisfy Phase B compliance checks. */
  companyRegistrationNumber?: string | null;
  /** Always optional for non-VAT-registered sellers; required when isVatRegistered=true. */
  vatNumber?: string | null;
  /** When true, the seller has declared VAT registration and vatNumber becomes required. */
  isVatRegistered?: boolean | null;
  /** When true, admin must approve before the seller can become active. */
  requiresAdminApproval?: boolean | null;
  /** Set to true by admin approve operation. */
  isApproved?: boolean | null;
}

/**
 * Returns true when the minimum required profile fields are present for the
 * selected seller profile type.
 *
 * Individual sellers use public.users for their personal identity, so a fake
 * business/store name must never be required to satisfy profile readiness.
 * They still require a contact phone and an address postcode.
 *
 * Sole traders and companies retain the existing business/trading identity
 * requirement. Company sellers additionally require company registration data.
 * VAT remains conditional on an explicit VAT-registration declaration.
 *
 * Existing sellers whose sellerType is NULL preserve the legacy business-name
 * requirement so this change does not silently broaden historical readiness.
 */
export function isProfileComplete(
  profile: Pick<
    SellerProfileSnapshot,
    | 'storeName'
    | 'businessName'
    | 'contactPhone'
    | 'businessAddress'
    | 'companyRegistrationNumber'
    | 'vatNumber'
    | 'isVatRegistered'
  >,
  sellerType?: string | null,
): boolean {
  // `storeName` can legitimately be persisted as an empty string while a
  // business/trading name is populated. Nullish coalescing would treat that
  // empty storeName as authoritative and incorrectly hide the valid fallback.
  const storeName = (profile.storeName ?? '').trim();
  const businessName = (profile.businessName ?? '').trim();
  const name = storeName || businessName;
  const phone = (profile.contactPhone ?? '').trim();
  const postcode = (
    (profile.businessAddress as { postcode?: string } | null)?.postcode ?? ''
  ).trim();

  const contactAndAddressComplete = phone.length > 0 && postcode.length > 0;
  if (!contactAndAddressComplete) return false;

  if (sellerType !== 'individual' && name.length === 0) return false;

  if (sellerType === 'company') {
    const companyReg = (profile.companyRegistrationNumber ?? '').trim();
    if (companyReg.length === 0) return false;
  }

  // VAT number is required whenever the seller explicitly declares VAT
  // registration, regardless of whether the seller is an individual, trader,
  // or company. This preserves the existing fail-closed tax declaration rule.
  if (profile.isVatRegistered) {
    const vat = (profile.vatNumber ?? '').trim();
    if (vat.length === 0) return false;
  }

  return true;
}

/**
 * Derives the canonical seller status from the current state.
 * 'suspended' is sticky — only admin can lift it.
 * 'active' is also sticky — once a seller is live, a transient Stripe
 * restriction (e.g. a routine account.updated event) must not demote them.
 * Only admin suspension can downgrade an active seller.
 *
 * When requiresAdminApproval is true and isApproved is false, the status
 * is capped at 'submitted' even when Stripe is fully active. This enables
 * the optional admin-approval gate for company sellers.
 */
export function deriveSellerStatus(
  currentStatus: string,
  profileComplete: boolean,
  stripeActive: boolean,
  requiresAdminApproval?: boolean | null,
  isApproved?: boolean | null,
): 'draft' | 'submitted' | 'active' | 'suspended' {
  if (currentStatus === 'suspended') return 'suspended';
  if (currentStatus === 'active') return 'active';
  if (profileComplete && stripeActive) {
    // If admin approval is required but not yet granted, cap at 'submitted'.
    if (requiresAdminApproval && !isApproved) return 'submitted';
    return 'active';
  }
  if (profileComplete) return 'submitted';
  return 'draft';
}

export interface ActivationResult {
  sellerStatus: 'draft' | 'submitted' | 'active' | 'suspended';
  profileComplete: boolean;
  /** true if the seller has a stripeAccountId (connected, not necessarily fully active) */
  stripeConnected: boolean;
  stripeActive: boolean;
  /** true if sellerStatus was updated in this call */
  changed: boolean;
  /**
   * true if this call is the FIRST time this seller reached 'active' status
   * (activatedAt was null before this update). Use this — not just `changed` —
   * to gate admin notification emails, preventing duplicate sends when both the
   * Stripe webhook and a connect-status poll fire around the same time.
   */
  firstActivation: boolean;
}

/**
 * Checks all activation conditions for a seller and updates
 * seller_profiles.sellerStatus if the derived status differs from the stored one.
 *
 * Safe to call multiple times — only writes to the DB when the status changes.
 * Returns null if the seller profile cannot be found.
 *
 * public.users is the account-authorization source of truth. An absent,
 * non-seller, inactive, or unreadable live account fails closed and can never be
 * auto-promoted by a Stripe webhook or background/server-side activation path.
 *
 * @param liveStripeConnectStatus - When provided, this live value is used instead
 *   of the DB-stored stripeConnectStatus. Pass this from connect-status.ts so the
 *   activation decision always reflects the freshly-fetched Stripe state, even if
 *   the preceding DB write hasn't been committed yet or failed silently.
 */
export async function tryAutoActivateSeller(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  sellerId: string,
  liveStripeConnectStatus?: string,
): Promise<ActivationResult | null> {
  const { data: profile, error } = await supabase
    .from('seller_profiles')
    .select(
      'userId, sellerStatus, activatedAt, storeName, businessName, contactPhone, businessAddress, stripeAccountId, stripeConnectStatus, sellerType, companyRegistrationNumber, vatNumber, isVatRegistered, requiresAdminApproval, isApproved',
    )
    .eq('userId', sellerId)
    .single<SellerProfileSnapshot>();

  if (error || !profile) {
    console.warn(
      'tryAutoActivateSeller: profile not found for',
      sellerId,
      error?.message,
    );
    return null;
  }

  const profileComplete = isProfileComplete(profile, profile.sellerType);
  const effectiveStripeConnectStatus = liveStripeConnectStatus ?? profile.stripeConnectStatus;
  const stripeActive = effectiveStripeConnectStatus === 'active';

  const { data: account, error: accountError } = await supabase
    .from('users')
    .select('role, isActive')
    .eq('id', sellerId)
    .maybeSingle<{ role: string | null; isActive: boolean | null }>();

  if (accountError || !account || account.role !== 'seller' || account.isActive !== true) {
    if (accountError) {
      console.warn('tryAutoActivateSeller: live account lookup failed for', sellerId, accountError.message);
    }
    return {
      sellerStatus: 'suspended',
      profileComplete,
      stripeConnected: !!profile.stripeAccountId,
      stripeActive,
      changed: false,
      firstActivation: false,
    };
  }

  const newStatus = deriveSellerStatus(
    profile.sellerStatus,
    profileComplete,
    stripeActive,
    profile.requiresAdminApproval,
    profile.isApproved,
  );

  const changed = newStatus !== profile.sellerStatus;
  // firstActivation: true only if this call transitions the seller to 'active'
  // for the very first time (activatedAt was null before this update).
  // This prevents duplicate admin emails when both the Stripe webhook and a
  // connect-status poll fire simultaneously — only the first writer wins.
  const firstActivation =
    changed && newStatus === 'active' && !profile.activatedAt;

  if (changed) {
    const { error: updateError } = await supabase
      .from('seller_profiles')
      .update({ sellerStatus: newStatus })
      .eq('userId', sellerId);

    if (updateError) {
      console.error(
        'tryAutoActivateSeller: failed to update sellerStatus for',
        sellerId,
        updateError.message,
      );
      return null;
    }

    console.log(
      `tryAutoActivateSeller: ${sellerId} ${profile.sellerStatus} → ${newStatus}`,
    );
  }

  return { sellerStatus: newStatus, profileComplete, stripeConnected: !!profile.stripeAccountId, stripeActive, changed, firstActivation };
}
