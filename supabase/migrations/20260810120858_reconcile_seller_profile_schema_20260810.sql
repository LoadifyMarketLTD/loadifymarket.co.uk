ALTER TABLE public.seller_profiles
  ADD COLUMN IF NOT EXISTS "isVatRegistered"
    BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.seller_profiles."isVatRegistered" IS
  'Seller self-declares VAT registration. When true, vatNumber is required for profile completion.';

CREATE POLICY "seller_profiles_update" ON public.seller_profiles FOR UPDATE
  USING (auth.uid() = "userId" OR public.is_admin());
CREATE POLICY "seller_profiles_insert" ON public.seller_profiles FOR INSERT
  WITH CHECK (auth.uid() = "userId" OR public.is_admin());
CREATE POLICY "seller_profiles_delete" ON public.seller_profiles FOR DELETE
  USING (public.is_admin());;
