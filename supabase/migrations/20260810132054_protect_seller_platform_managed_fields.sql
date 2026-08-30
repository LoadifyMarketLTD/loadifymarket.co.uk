CREATE OR REPLACE FUNCTION private.protect_seller_platform_managed_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF auth.role() = 'authenticated' AND NOT public.is_admin() THEN
    IF TG_OP = 'INSERT' THEN
      NEW."verificationStatus" := 'pending';
      NEW."verifiedAt" := NULL;
      NEW."suspensionReason" := NULL;
      NEW."stripeAccountId" := NULL;
      NEW."payoutDetails" := NULL;
      NEW."isApproved" := false;
      NEW.commission := 7.00;
      NEW."listingLimit" := 5;
      NEW.rating := 0.00;
      NEW."totalSales" := 0;
      NEW."salesCount" := 0;
      NEW."disputeRate" := 0.0000;
      NEW."deliverySuccessRate" := 1.0000;
      NEW."responseTimeHours" := 0.00;
      NEW."onTimeShipmentRate" := 100.00;
      NEW."marketplaceRole" := NULL;
      NEW."paymentBehaviour" := NULL;
      NEW."isVerified" := false;
      NEW."stripeConnectStatus" := NULL;
      NEW."sellerStatus" := 'pending';
      NEW."activatedAt" := NULL;
      NEW."stripeConnectAccountId" := NULL;
      NEW."stripeChargesEnabled" := false;
      NEW."stripePayoutsEnabled" := false;
      NEW."stripeDetailsSubmitted" := false;
      NEW."hasServiceCapability" := false;
      NEW."requiresAdminApproval" := false;
    ELSE
      NEW."verificationStatus" := OLD."verificationStatus";
      NEW."verifiedAt" := OLD."verifiedAt";
      NEW."suspensionReason" := OLD."suspensionReason";
      NEW."stripeAccountId" := OLD."stripeAccountId";
      NEW."payoutDetails" := OLD."payoutDetails";
      NEW."isApproved" := OLD."isApproved";
      NEW.commission := OLD.commission;
      NEW."listingLimit" := OLD."listingLimit";
      NEW.rating := OLD.rating;
      NEW."totalSales" := OLD."totalSales";
      NEW."salesCount" := OLD."salesCount";
      NEW."disputeRate" := OLD."disputeRate";
      NEW."deliverySuccessRate" := OLD."deliverySuccessRate";
      NEW."responseTimeHours" := OLD."responseTimeHours";
      NEW."onTimeShipmentRate" := OLD."onTimeShipmentRate";
      NEW."marketplaceRole" := OLD."marketplaceRole";
      NEW."paymentBehaviour" := OLD."paymentBehaviour";
      NEW."isVerified" := OLD."isVerified";
      NEW."stripeConnectStatus" := OLD."stripeConnectStatus";
      NEW."sellerStatus" := OLD."sellerStatus";
      NEW."activatedAt" := OLD."activatedAt";
      NEW."stripeConnectAccountId" := OLD."stripeConnectAccountId";
      NEW."stripeChargesEnabled" := OLD."stripeChargesEnabled";
      NEW."stripePayoutsEnabled" := OLD."stripePayoutsEnabled";
      NEW."stripeDetailsSubmitted" := OLD."stripeDetailsSubmitted";
      NEW."hasServiceCapability" := OLD."hasServiceCapability";
      NEW."requiresAdminApproval" := OLD."requiresAdminApproval";
      NEW."sellerType" := OLD."sellerType";
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_seller_platform_managed_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_seller_platform_managed_fields ON public.seller_profiles;
CREATE TRIGGER trg_protect_seller_platform_managed_fields
BEFORE INSERT OR UPDATE ON public.seller_profiles
FOR EACH ROW EXECUTE FUNCTION private.protect_seller_platform_managed_fields();;
