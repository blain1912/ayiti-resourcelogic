CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    CASE
      WHEN NEW.raw_user_meta_data->>'organization_id' IS NOT NULL
        AND NEW.raw_user_meta_data->>'organization_id' <> ''
      THEN 'pending'
      ELSE 'approved'
    END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), public.profiles.full_name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    organization_id = COALESCE(public.profiles.organization_id, EXCLUDED.organization_id),
    updated_at = now();

  RETURN NEW;
END;
$$;

INSERT INTO public.profiles (
  user_id,
  full_name,
  email,
  organization_id,
  approval_status,
  profile_completed
)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  u.email,
  CASE
    WHEN u.raw_user_meta_data->>'organization_id' IS NOT NULL
      AND u.raw_user_meta_data->>'organization_id' <> ''
    THEN (u.raw_user_meta_data->>'organization_id')::uuid
    ELSE NULL
  END,
  CASE
    WHEN u.raw_user_meta_data->>'organization_id' IS NOT NULL
      AND u.raw_user_meta_data->>'organization_id' <> ''
    THEN 'approved'
    ELSE 'approved'
  END,
  false
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM public.profiles p
  WHERE p.user_id = u.id
);