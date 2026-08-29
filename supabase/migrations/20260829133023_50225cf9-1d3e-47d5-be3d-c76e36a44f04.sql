REVOKE ALL ON FUNCTION public.user_in_organization(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_profile_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_in_organization(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_profile_id(uuid) TO authenticated, service_role;