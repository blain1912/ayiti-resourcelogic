-- Update the handle_new_user function to support organization assignment during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    CASE 
      WHEN new.raw_user_meta_data->>'organization_id' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'organization_id')::uuid
      ELSE NULL
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'organization_id' IS NOT NULL 
      THEN 'pending'
      ELSE 'approved'
    END
  );
  RETURN new;
END;
$$;