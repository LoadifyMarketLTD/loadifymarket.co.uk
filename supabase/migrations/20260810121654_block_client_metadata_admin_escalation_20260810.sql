CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, "isEmailVerified")
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN (NEW.raw_app_meta_data->>'role') IN ('admin', 'seller', 'buyer')
        THEN (NEW.raw_app_meta_data->>'role')
      WHEN (NEW.raw_user_meta_data->>'role') IN ('seller', 'buyer')
        THEN (NEW.raw_user_meta_data->>'role')
      ELSE 'buyer'
    END,
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user: non-fatal error for auth user % (email: %): %',
    NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;;
