CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    organization_id,
    approval_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    CASE
      WHEN NEW.raw_user_meta_data->>'organization_id' IS NOT NULL
        AND NEW.raw_user_meta_data->>'organization_id' <> ''
      THEN (NEW.raw_user_meta_data->>'organization_id')::uuid
      ELSE NULL
    END,
    'approved'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
    approval_status = CASE
      WHEN public.profiles.approval_status = 'pending' THEN 'approved'
      ELSE public.profiles.approval_status
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET approval_status = 'approved',
    updated_at = now()
WHERE approval_status = 'pending';

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;